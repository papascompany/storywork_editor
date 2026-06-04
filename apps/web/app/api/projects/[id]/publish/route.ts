/**
 * POST /api/projects/[id]/publish
 *
 * 동기 PDF 빌드 + Supabase Storage 업로드 + PublishJob 생성
 *
 * M6-01: 동기 처리 (16p ≤ 6초).
 * M6-02: Inngest 비동기 잡 연동 예정 (별도 PR).
 *
 * 인증:
 *   - Supabase 세션 확인 → 미인증 401
 *   - 소유권 확인 → 불일치 403
 *
 * 처리 흐름:
 *   1. 인증 + 소유권 확인
 *   2. Project + Format + Pages 로드
 *   3. buildPdf() 호출
 *   4. Supabase Storage 업로드 (pdfs/{ownerId}/{projectId}-{ts}.pdf)
 *   5. PublishJob 생성 (status: 'succeeded')
 *   6. 응답: { jobId, pdfUrl, byteSize, warnings, pageCount }
 *
 * 오류:
 *   - 400: 파라미터 누락
 *   - 401: 미인증
 *   - 403: 소유권 불일치
 *   - 404: 프로젝트/포맷 없음
 *   - 500: 빌드/업로드 오류
 */

/* eslint-disable import/order */
import { NextResponse } from 'next/server'
import { buildPdf } from '@storywork/pdf-engine'
import type { PdfBuildInput, PageInput } from '@storywork/pdf-engine'
import { createWebServerClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase-admin'
import { getPrismaClient } from '../../../_lib/prisma'
/* eslint-enable import/order */

// ─── 에러 응답 헬퍼 ───────────────────────────────────────────────────────────

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

// ─── 사용자 조회 헬퍼 ────────────────────────────────────────────────────────

async function findUserByEmail(email: string) {
  const prisma = getPrismaClient()
  return prisma.user.findUnique({ where: { email } })
}

// ─── POST /api/projects/[id]/publish ─────────────────────────────────────────

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: projectId } = await params

  if (!projectId) {
    return jsonError('projectId 가 누락되었습니다.', 400)
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

  // 2. Prisma 사용자 조회
  const dbUser = await findUserByEmail(authUser.email)
  if (!dbUser) {
    return jsonError('사용자 정보를 찾을 수 없습니다.', 404)
  }

  const prisma = getPrismaClient()

  // 3. 프로젝트 + 포맷 + 페이지 로드
  let project: Awaited<ReturnType<typeof prisma.project.findUnique>>
  try {
    project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        format: true,
        pages: {
          orderBy: { index: 'asc' },
        },
      },
    })
  } catch (err) {
    console.error('[publish] DB 조회 오류:', err)
    return jsonError('프로젝트 조회 중 오류가 발생했습니다.', 500)
  }

  if (!project) {
    return jsonError('프로젝트를 찾을 수 없습니다.', 404)
  }

  // 4. 소유권 확인
  if (project.ownerId !== dbUser.id) {
    return jsonError('이 프로젝트에 접근할 권한이 없습니다.', 403)
  }

  // 5. buildPdf() 입력 구성
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

  // 6. PDF 빌드
  let buildResult: Awaited<ReturnType<typeof buildPdf>>
  try {
    buildResult = await buildPdf(buildInput)
  } catch (err) {
    console.error('[publish] PDF 빌드 오류:', err)
    return jsonError('PDF 빌드 중 오류가 발생했습니다.', 500)
  }

  // 7. Supabase Storage 업로드
  // 경로: pdfs/{ownerId}/{projectId}-{timestamp}.pdf (RLS scope: ownerId)
  const timestamp = Date.now()
  const storagePath = `pdfs/${dbUser.id}/${projectId}-${timestamp}.pdf`
  const adminClient = getAdminClient()

  const { error: uploadError } = await adminClient.storage
    .from('storywork')
    .upload(storagePath, buildResult.pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  let pdfUrl: string | null = null

  if (uploadError) {
    console.error('[publish] Storage 업로드 오류:', uploadError)
    // 업로드 실패해도 PublishJob 은 생성 (pdfUrl null)
    buildResult.warnings.push(`[publish] Storage 업로드 실패: ${uploadError.message}`)
  } else {
    const { data: urlData } = adminClient.storage.from('storywork').getPublicUrl(storagePath)
    pdfUrl = urlData.publicUrl
  }

  // 8. PublishJob 생성
  let jobId: string
  try {
    const job = await prisma.publishJob.create({
      data: {
        projectId,
        kind: 'pdf',
        status: pdfUrl ? 'succeeded' : 'failed',
        pdfUrl,
        spec: {
          formatId: project.formatId,
          pageCount: buildResult.pageCount,
          byteSize: buildResult.byteSize,
          seed: 0,
          producer: buildResult.metadata.producer,
          creationDate: buildResult.metadata.creationDate,
        },
        preflight: {
          warnings: buildResult.warnings,
        },
      },
    })
    jobId = job.id
  } catch (err) {
    console.error('[publish] PublishJob 생성 오류:', err)
    return jsonError('PublishJob 생성 중 오류가 발생했습니다.', 500)
  }

  return NextResponse.json({
    jobId,
    pdfUrl,
    byteSize: buildResult.byteSize,
    pageCount: buildResult.pageCount,
    warnings: buildResult.warnings,
  })
}
