/**
 * POST /api/contest/[seasonId]/submit — 공모전 출품 (BOARD-05)
 *
 * 로그인 사용자가 본인 프로젝트를 해당 공모전 시즌에 출품한다.
 * Showcase(mode='contest', contestId=seasonId) 를 생성한다.
 *
 * 검증:
 *  - 401 미인증
 *  - 404 시즌/프로젝트 없음
 *  - 403 시즌 동결(frozen)·마감(closesAt 경과)·시작 전(opensAt 이전)·타인 프로젝트
 *  - 400 빈 프로젝트(페이지 0) / 잘못된 본문
 *  - 409 동일 프로젝트 중복 출품 (앱 레벨 + DB unique P2002 백스톱)
 *  - 201 { showcaseId }
 *
 * 시간 게이트(opensAt/closesAt)는 이 엔드포인트가 권위를 가진다.
 * frozen 은 cron(/api/cron/freeze-seasons)이 세팅하는 영속 스냅샷으로 추가 방어선.
 */
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { createWebServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/users'

interface RouteContext {
  params: Promise<{ seasonId: string }>
}

export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
  const { seasonId } = await params

  // ── 인증 ───────────────────────────────────────────────────────────────────
  const supabase = await createWebServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const dbUser = await getCurrentUser({ id: authUser.id, email: authUser.email })
  if (!dbUser) {
    return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 401 })
  }

  // ── 본문 파싱 ──────────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }
  const projectId =
    body &&
    typeof body === 'object' &&
    typeof (body as { projectId?: unknown }).projectId === 'string'
      ? (body as { projectId: string }).projectId
      : null
  if (!projectId) {
    return NextResponse.json({ error: '출품할 작품을 선택해주세요.' }, { status: 400 })
  }

  // ── 시즌 검증 ──────────────────────────────────────────────────────────────
  const season = await prisma.contestSeason.findUnique({
    where: { id: seasonId },
    select: { id: true, name: true, opensAt: true, closesAt: true, frozen: true },
  })
  if (!season) {
    return NextResponse.json({ error: '공모전 시즌을 찾을 수 없습니다.' }, { status: 404 })
  }

  const now = new Date()
  if (now < season.opensAt) {
    return NextResponse.json({ error: '아직 출품 기간이 시작되지 않았습니다.' }, { status: 403 })
  }
  if (season.frozen || now > season.closesAt) {
    return NextResponse.json({ error: '출품이 마감된 공모전입니다.' }, { status: 403 })
  }

  // ── 프로젝트 검증 (소유권 + 출품 가능 여부) ──────────────────────────────────
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, status: true, _count: { select: { pages: true } } },
  })
  if (!project) {
    return NextResponse.json({ error: '작품을 찾을 수 없습니다.' }, { status: 404 })
  }
  if (project.ownerId !== dbUser.id) {
    return NextResponse.json({ error: '본인의 작품만 출품할 수 있습니다.' }, { status: 403 })
  }
  if (project._count.pages === 0) {
    return NextResponse.json({ error: '페이지가 없는 작품은 출품할 수 없습니다.' }, { status: 400 })
  }
  // 보관(archived)된 작품은 사용자가 숨김/정리 의도로 둔 것이므로 출품(=공개) 차단
  if (project.status === 'archived') {
    return NextResponse.json(
      { error: '보관된 작품은 출품할 수 없습니다. 보관을 해제한 뒤 다시 시도해주세요.' },
      { status: 403 },
    )
  }

  // ── 중복 출품 방지 (앱 레벨 선검사 → 친절한 409) ────────────────────────────
  const existing = await prisma.showcase.findFirst({
    where: { projectId, contestId: seasonId },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json(
      { error: '이미 이 공모전에 출품한 작품입니다.', showcaseId: existing.id },
      { status: 409 },
    )
  }

  // ── 출품 생성 ──────────────────────────────────────────────────────────────
  try {
    const showcase = await prisma.showcase.create({
      data: {
        projectId,
        ownerId: dbUser.id,
        mode: 'contest',
        contestId: seasonId,
      },
      select: { id: true },
    })

    return NextResponse.json({ showcaseId: showcase.id, seasonId }, { status: 201 })
  } catch (err) {
    // DB unique([projectId, contestId]) 위반 — 동시 요청 race 백스톱
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: '이미 이 공모전에 출품한 작품입니다.' }, { status: 409 })
    }
    console.error('[api/contest/submit] create failed:', err)
    return NextResponse.json({ error: '출품 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
