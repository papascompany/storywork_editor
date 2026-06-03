/**
 * /notices/[id] — 공지사항 상세
 *
 * RSC — 게시 중인 공지만 조회. 미게시 or 미존재 → 404.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import * as React from 'react'

import { Footer } from '@/components/marketing/Footer'
import { Header } from '@/components/marketing/Header'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const notice = await prisma.notice.findFirst({
    where: { id, publishedAt: { lte: new Date(), not: null } },
    select: { title: true },
  })
  if (!notice) return { title: '공지사항을 찾을 수 없습니다' }
  return { title: notice.title }
}

function formatDate(date: Date) {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function NoticeDetailPage({ params }: Props) {
  const { id } = await params
  const now = new Date()

  const notice = await prisma.notice.findFirst({
    where: { id, publishedAt: { lte: now, not: null } },
    include: { author: { select: { name: true, email: true } } },
  })

  if (!notice) notFound()

  return (
    <div style={{ backgroundColor: 'var(--mkt-canvas)', minHeight: '100dvh' }}>
      <Header />

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '64px 24px 80px' }}>
        {/* 이전 목록 */}
        <Link
          href="/notices"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '13px',
            color: 'var(--mkt-ink)',
            opacity: 0.55,
            textDecoration: 'none',
            marginBottom: '40px',
          }}
        >
          ← 공지사항 목록
        </Link>

        {/* 핀 배지 */}
        {notice.isPinned && (
          <div style={{ marginBottom: '12px' }}>
            <span
              style={{
                fontFamily: 'var(--mkt-font-mono)',
                fontSize: '10px',
                fontWeight: 600,
                backgroundColor: 'var(--mkt-ink)',
                color: 'var(--mkt-canvas)',
                padding: '2px 8px',
                borderRadius: '4px',
                letterSpacing: '0.3px',
              }}
            >
              공지
            </span>
          </div>
        )}

        {/* 제목 */}
        <h1
          style={{
            fontFamily: 'var(--mkt-font-display)',
            fontSize: 'clamp(22px, 4vw, 32px)',
            fontWeight: 600,
            color: 'var(--mkt-ink)',
            lineHeight: 1.35,
            marginBottom: '16px',
          }}
        >
          {notice.title}
        </h1>

        {/* 메타 */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '40px',
            paddingBottom: '24px',
            borderBottom: '1px solid var(--mkt-hairline)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--mkt-font-mono)',
              fontSize: '12px',
              color: 'var(--mkt-ink)',
              opacity: 0.45,
            }}
          >
            {notice.publishedAt ? formatDate(notice.publishedAt) : ''}
          </span>
          <span
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '12px',
              color: 'var(--mkt-ink)',
              opacity: 0.45,
            }}
          >
            {notice.author.name ?? notice.author.email}
          </span>
        </div>

        {/* 본문 */}
        <div
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '16px',
            lineHeight: 1.8,
            color: 'var(--mkt-ink)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {notice.body}
        </div>
      </main>

      <Footer />
    </div>
  )
}
