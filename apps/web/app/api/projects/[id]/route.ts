/**
 * GET /api/projects/[id] — 작품 단건 조회 (편집기 재진입용, 로그인 필수)
 *
 * 인증:
 *   - Supabase 세션 확인 → 미인증 401
 *   - 소유권 확인 → 불일치 403
 *
 * 응답:
 *   { project: { id, title, formatId, status }, pages: Page[] }
 */

/* eslint-disable import/order */
import { NextResponse } from 'next/server'
import { createWebServerClient } from '@/lib/supabase/server'
import { getPrismaClient } from '../../_lib/prisma'
/* eslint-enable import/order */

// ─── 에러 응답 헬퍼 ───────────────────────────────────────────────────────────

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

// ─── 사용자 조회 헬퍼 (이메일 기준) ──────────────────────────────────────────

async function findUserByEmail(email: string) {
  const prisma = getPrismaClient()
  return prisma.user.findUnique({ where: { email } })
}

// ─── GET /api/projects/[id] ───────────────────────────────────────────────────

export async function GET(
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

  // 2. Prisma 사용자 조회 (이메일 기준)
  const dbUser = await findUserByEmail(authUser.email)
  if (!dbUser) {
    return jsonError('사용자 정보를 찾을 수 없습니다.', 404)
  }

  const prisma = getPrismaClient()

  try {
    // 3. 프로젝트 조회
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        pages: {
          orderBy: { index: 'asc' },
          select: {
            id: true,
            index: true,
            fabricJson: true,
            thumbnail: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    if (!project) {
      return jsonError('프로젝트를 찾을 수 없습니다.', 404)
    }

    // 4. 소유권 확인
    if (project.ownerId !== dbUser.id) {
      return jsonError('이 프로젝트에 접근할 권한이 없습니다.', 403)
    }

    return NextResponse.json({
      project: {
        id: project.id,
        title: project.title,
        formatId: project.formatId,
        status: project.status,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
      pages: project.pages.map((p) => ({
        id: p.id,
        index: p.index,
        fabricJson: p.fabricJson,
        thumbnail: p.thumbnail ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    })
  } catch (err) {
    console.error('[api/projects/[id]] DB 오류:', err)
    return jsonError('프로젝트 조회 중 오류가 발생했습니다.', 500)
  }
}
