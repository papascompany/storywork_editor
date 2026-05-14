/**
 * apps/web/app/mypage/page.tsx
 *
 * 마이페이지 — Server Component.
 * 1. Supabase auth 사용자 확인 (미들웨어 가드 백업)
 * 2. DB User upsert (getCurrentUser)
 * 3. 작품 목록 조회 (최신 수정 순)
 * 4. MyPageShell 에 데이터 전달
 *
 * URL query param ?tab=projects|profile|billing|my-data 는
 * MyPageShell(client) 에서 처리.
 */
import { redirect } from 'next/navigation'
import * as React from 'react'

import { MyPageShell } from '@/components/mypage/MyPageShell'
import { prisma } from '@/lib/prisma'
import { createWebServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/users'

export const dynamic = 'force-dynamic'

export default async function MyPage() {
  // ── 1. 인증 확인 ────────────────────────────────────────────────────────────
  const supabase = await createWebServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login?next=/mypage')
  }

  // ── 2. DB User upsert ────────────────────────────────────────────────────────
  // DB 연결 실패 시에도 기본 정보로 fallthrough (UX 우선)
  let dbUser = null
  try {
    dbUser = await getCurrentUser({
      id: authUser.id,
      email: authUser.email,
    })
  } catch {
    // DB 오류 시 auth 정보로만 렌더 (작품 목록은 빈 배열)
  }

  // ── 3. 작품 목록 조회 ────────────────────────────────────────────────────────
  // DB user 가 있을 때만 조회, 없으면 빈 배열
  let rawProjects: {
    id: string
    title: string
    status: string
    updatedAt: Date
    _count: { pages: number }
    pages: { thumbnail: string | null }[]
  }[] = []

  if (dbUser) {
    try {
      rawProjects = await prisma.project.findMany({
        where: { ownerId: dbUser.id },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          _count: { select: { pages: true } },
          // 첫 번째 페이지 썸네일만 가져옴
          pages: {
            take: 1,
            orderBy: { index: 'asc' },
            select: { thumbnail: true },
          },
        },
      })
    } catch {
      // DB 오류 시 빈 배열 유지
    }
  }

  // ProjectData 타입으로 변환
  const projects = rawProjects.map((p) => ({
    id: p.id,
    title: p.title,
    status: String(p.status),
    thumbnail: p.pages[0]?.thumbnail ?? null,
    updatedAt: p.updatedAt,
    pageCount: p._count.pages,
  }))

  // ── 4. Shell 렌더 ─────────────────────────────────────────────────────────────
  const userId = dbUser?.id ?? authUser.id
  const email = dbUser?.email ?? authUser.email ?? ''
  const name = dbUser?.name ?? null
  const createdAt = dbUser?.createdAt ?? new Date()

  return (
    <MyPageShell
      userId={userId}
      email={email}
      name={name}
      createdAt={createdAt}
      projects={projects}
    />
  )
}
