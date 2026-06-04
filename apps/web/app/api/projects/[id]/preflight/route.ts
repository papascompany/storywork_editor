/**
 * POST /api/projects/[id]/preflight
 *
 * 프로젝트의 인쇄 사양 프리플라이트 검증.
 * preflight() 로 3사 인쇄소 프로필 모두 또는 지정 프로필 검증.
 *
 * 요청 body (JSON, 선택):
 *   {
 *     profileId?: string     // 지정 시 해당 프로필만, 생략 시 3개 모두
 *     embedFonts?: boolean   // 기본 true
 *   }
 *
 * 응답 200:
 *   {
 *     reports: PreflightReport[]   // 프로필별 검증 결과
 *     summary: {
 *       totalErrors: number
 *       totalWarnings: number
 *       allPassed: boolean
 *     }
 *   }
 *
 * 인증: Supabase 세션 (로그인 필수)
 * 소유권: Project.ownerId === 현재 사용자
 *
 * 오류:
 *   400: projectId 누락
 *   401: 미인증
 *   403: 소유권 불일치
 *   404: 프로젝트 없음
 *   500: 검증 오류
 */

/* eslint-disable import/order */
import { NextResponse } from 'next/server'
import { preflight } from '@storywork/pdf-engine'
import type { PdfBuildInput, PageInput } from '@storywork/pdf-engine'
import { createWebServerClient } from '@/lib/supabase/server'
import { getPrismaClient } from '../../../_lib/prisma'
import { initDbProfileLoader } from '@/lib/preflight/db-loader'
/* eslint-enable import/order */

// DB 어댑터 초기화 (lazy, idempotent)
initDbProfileLoader()

// ─── 에러 응답 헬퍼 ───────────────────────────────────────────────────────────

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

// ─── POST /api/projects/[id]/preflight ───────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: projectId } = await params

  if (!projectId) {
    return jsonError('projectId 가 누락되었습니다.', 400)
  }

  // body 파싱 (선택)
  let profileId: string | undefined = undefined
  let embedFonts = true
  try {
    const contentType = req.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const body = (await req.json()) as { profileId?: string; embedFonts?: boolean }
      profileId = body.profileId
      if (typeof body.embedFonts === 'boolean') {
        embedFonts = body.embedFonts
      }
    }
  } catch {
    // body 파싱 실패 → 기본값
  }

  // 1. 인증 확인
  const supabase = await createWebServerClient()
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser?.email) {
    return jsonError('로그인이 필요합니다.', 401)
  }

  const prisma = getPrismaClient()

  // 2. Prisma 사용자 조회
  const dbUser = await prisma.user.findUnique({ where: { email: authUser.email } })
  if (!dbUser) {
    return jsonError('사용자 정보를 찾을 수 없습니다.', 404)
  }

  // 3. 프로젝트 + 포맷 + 페이지 로드
  let project: Awaited<ReturnType<typeof prisma.project.findUnique>>
  try {
    project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        format: true,
        pages: { orderBy: { index: 'asc' } },
      },
    })
  } catch (err) {
    console.error('[preflight] DB 조회 오류:', err)
    return jsonError('프로젝트 조회 중 오류가 발생했습니다.', 500)
  }

  if (!project) {
    return jsonError('프로젝트를 찾을 수 없습니다.', 404)
  }

  // 4. 소유권 확인
  if (project.ownerId !== dbUser.id) {
    return jsonError('이 프로젝트에 접근할 권한이 없습니다.', 403)
  }

  // 5. PdfBuildInput 구성
  const format = (project as unknown as { format: Record<string, unknown> }).format as {
    widthMm: number
    heightMm: number
    dpi: number
    bleedMm: number
    safeMm: number
  }

  const pages = (project as unknown as { pages: Array<Record<string, unknown>> }).pages

  const buildInput: PdfBuildInput = {
    formatId: project.formatId,
    format: {
      widthMm: format.widthMm,
      heightMm: format.heightMm,
      dpi: format.dpi,
      bleedMm: format.bleedMm,
      safeMm: format.safeMm,
    },
    title: project.title,
    author: dbUser.name ?? undefined,
    pages: pages.map(
      (p): PageInput => ({
        pageIndex: p['index'] as number,
        fabricJson: (p['fabricJson'] as object) ?? { v: 1, format: {}, layers: [] },
        thumbnail: (p['thumbnail'] as string | null) ?? undefined,
      }),
    ),
    seed: 0,
  }

  // 6. preflight 실행
  let reports: Awaited<ReturnType<typeof preflight>>
  try {
    reports = await preflight(buildInput, profileId, { embedFonts })
  } catch (err) {
    console.error('[preflight] 검증 오류:', err)
    return jsonError('프리플라이트 검증 중 오류가 발생했습니다.', 500)
  }

  // 7. 요약 정보 계산
  const totalErrors = reports.reduce((sum, r) => sum + r.errors.length, 0)
  const totalWarnings = reports.reduce((sum, r) => sum + r.warnings.length, 0)
  const allPassed = reports.every((r) => r.ok)

  return NextResponse.json({
    reports,
    summary: {
      totalErrors,
      totalWarnings,
      allPassed,
    },
  })
}
