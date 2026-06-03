/**
 * GET /api/projects/[id]/alternatives
 *
 * M4-05 — 프로젝트의 SceneDoc.meta 에서 RecommendResult (alternatives 포함) 를 반환.
 *
 * 설계 선택 (옵션 C + 서버 캐시 보조):
 *   - full-pipeline 이 SceneDoc.meta 에 저장한 기본 정보를 반환.
 *   - 클라이언트가 fabricJson layer.data.meta.alternatives 를 메모리에 캐시하므로
 *     이 API 는 "재진입 시 복원" 용도로 사용.
 *   - M4-04 영역 (full-pipeline route) 을 건드리지 않음.
 *
 * 인증:
 *   - Supabase 세션 확인 → 미인증 401
 *   - 소유권 확인 → 불일치 403
 *
 * 응답:
 *   {
 *     projectId: string,
 *     sceneDocMeta: Record<string, unknown> | null,
 *     message: string
 *   }
 */

/* eslint-disable import/order */
import { NextResponse } from 'next/server'
import { createWebServerClient } from '@/lib/supabase/server'
import { getPrismaClient } from '../../../_lib/prisma'
/* eslint-enable import/order */

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

async function findUserByEmail(email: string) {
  const prisma = getPrismaClient()
  return prisma.user.findUnique({ where: { email } })
}

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

  // 2. Prisma 사용자 조회
  const dbUser = await findUserByEmail(authUser.email)
  if (!dbUser) {
    return jsonError('사용자 정보를 찾을 수 없습니다.', 404)
  }

  const prisma = getPrismaClient()

  try {
    // 3. 프로젝트 소유권 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true },
    })

    if (!project) {
      return jsonError('프로젝트를 찾을 수 없습니다.', 404)
    }

    if (project.ownerId !== dbUser.id) {
      return jsonError('이 프로젝트에 접근할 권한이 없습니다.', 403)
    }

    // 4. SceneDoc.meta 조회 (alternatives 포함)
    const sceneDoc = await prisma.sceneDoc.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, meta: true },
    })

    return NextResponse.json({
      projectId,
      sceneDocMeta: sceneDoc?.meta ?? null,
      message: sceneDoc
        ? 'SceneDoc meta 조회 성공'
        : 'SceneDoc 없음 — alternatives 는 fabricJson layer.data.meta 에서 로드됩니다',
    })
  } catch (err) {
    console.error('[api/projects/[id]/alternatives] DB 오류:', err)
    return jsonError('alternatives 조회 중 오류가 발생했습니다.', 500)
  }
}
