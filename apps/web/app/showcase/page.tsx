/**
 * /showcase — 전체 갤러리
 *
 * cursor-based 무한 스크롤 (클라이언트). 정렬: 최신/좋아요.
 * RSC 초기 20개 + 클라이언트 fetchMore.
 */
import type { Metadata } from 'next'
import * as React from 'react'

import { ShowcaseGallery } from './ShowcaseGallery'

import { Footer } from '@/components/marketing/Footer'
import { Header } from '@/components/marketing/Header'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '갤러리',
  description: '스토리워크 크리에이터들의 스토리보드 갤러리. 좋아하는 작품에 반응을 남겨보세요.',
}

export default async function ShowcasePage() {
  // 초기 20개 (최신순)
  const initial = await prisma.showcase.findMany({
    where: { hidden: false },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      owner: { select: { name: true, email: true } },
      project: {
        select: { title: true, pages: { take: 1, select: { thumbnail: true } } },
      },
      _count: { select: { reactions: true, comments: true } },
    },
  })

  const initialData = initial.map((s) => ({
    id: s.id,
    title: s.project.title,
    thumbnail: s.project.pages[0]?.thumbnail ?? null,
    ownerName: s.owner.name ?? s.owner.email,
    likes: s.likes,
    reactionCount: s._count.reactions,
    commentCount: s._count.comments,
    createdAt: s.createdAt.toISOString(),
    mode: s.mode,
    contestId: s.contestId,
  }))

  return (
    <div style={{ backgroundColor: 'var(--mkt-canvas)', minHeight: '100dvh' }}>
      <Header />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '64px 24px 80px' }}>
        <h1
          style={{
            fontFamily: 'var(--mkt-font-display)',
            fontSize: 'var(--mkt-display-lg-size)',
            fontWeight: 'var(--mkt-display-lg-weight)',
            color: 'var(--mkt-ink)',
            marginBottom: '8px',
          }}
        >
          갤러리
        </h1>
        <p
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '15px',
            color: 'var(--mkt-ink)',
            opacity: 0.55,
            marginBottom: '48px',
          }}
        >
          크리에이터들의 스토리보드를 감상하세요.
        </p>

        <ShowcaseGallery initialItems={initialData} />
      </main>

      <Footer />
    </div>
  )
}
