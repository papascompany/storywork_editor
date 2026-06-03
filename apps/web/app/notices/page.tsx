/**
 * /notices — 공지사항 목록
 *
 * 핀 고정 항목 상단, 나머지 최신순 20개씩 페이지네이션.
 * RSC — 데이터 서버에서 직접 조회.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import * as React from 'react'

import { Footer } from '@/components/marketing/Footer'
import { Header } from '@/components/marketing/Header'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: '공지사항',
  description: '스토리워크 서비스 공지사항 및 업데이트 안내',
}

const PAGE_SIZE = 20

function formatDate(date: Date) {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

interface NoticesPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function NoticesPage({ searchParams }: NoticesPageProps) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const skip = (page - 1) * PAGE_SIZE

  const now = new Date()

  const [pinnedNotices, totalCount, pagedNotices] = await Promise.all([
    // 핀 고정 항목 (게시 중인 것만)
    prisma.notice.findMany({
      where: { isPinned: true, publishedAt: { lte: now, not: null } },
      orderBy: { publishedAt: 'desc' },
      select: { id: true, title: true, publishedAt: true, isPinned: true },
    }),
    // 비핀 항목 총 개수
    prisma.notice.count({
      where: { isPinned: false, publishedAt: { lte: now, not: null } },
    }),
    // 비핀 항목 페이지
    prisma.notice.findMany({
      where: { isPinned: false, publishedAt: { lte: now, not: null } },
      orderBy: { publishedAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: { id: true, title: true, publishedAt: true, isPinned: true },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <div style={{ backgroundColor: 'var(--mkt-canvas)', minHeight: '100dvh' }}>
      <Header />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '64px 24px 80px' }}>
        <h1
          style={{
            fontFamily: 'var(--mkt-font-display)',
            fontSize: 'var(--mkt-display-lg-size)',
            fontWeight: 'var(--mkt-display-lg-weight)',
            color: 'var(--mkt-ink)',
            marginBottom: '8px',
          }}
        >
          공지사항
        </h1>
        <p
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '14px',
            color: 'var(--mkt-ink)',
            opacity: 0.55,
            marginBottom: '48px',
          }}
        >
          서비스 업데이트 및 주요 안내를 확인하세요.
        </p>

        {/* 공지 없음 */}
        {pinnedNotices.length === 0 && pagedNotices.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 0',
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '15px',
              color: 'var(--mkt-ink)',
              opacity: 0.4,
            }}
          >
            등록된 공지사항이 없습니다.
          </div>
        )}

        {/* 공지 목록 */}
        <div
          style={{
            border: '1px solid var(--mkt-hairline)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {/* 핀 고정 */}
          {pinnedNotices.map((notice) => (
            <Link
              key={notice.id}
              href={`/notices/${notice.id}`}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--mkt-hairline-soft)',
                  backgroundColor: 'var(--mkt-surface-soft)',
                  transition: 'background-color 120ms ease',
                }}
                className="notice-row-pinned"
              >
                <span
                  style={{
                    flexShrink: 0,
                    fontFamily: 'var(--mkt-font-mono)',
                    fontSize: '10px',
                    fontWeight: 600,
                    backgroundColor: 'var(--mkt-ink)',
                    color: 'var(--mkt-canvas)',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    letterSpacing: '0.3px',
                  }}
                >
                  공지
                </span>
                <span
                  style={{
                    flex: 1,
                    fontFamily: 'var(--mkt-font-sans)',
                    fontSize: '15px',
                    fontWeight: 500,
                    color: 'var(--mkt-ink)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {notice.title}
                </span>
                <span
                  style={{
                    flexShrink: 0,
                    fontFamily: 'var(--mkt-font-mono)',
                    fontSize: '12px',
                    color: 'var(--mkt-ink)',
                    opacity: 0.45,
                  }}
                >
                  {notice.publishedAt ? formatDate(notice.publishedAt) : ''}
                </span>
              </div>
            </Link>
          ))}

          {/* 일반 */}
          {pagedNotices.map((notice, idx) => (
            <Link
              key={notice.id}
              href={`/notices/${notice.id}`}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px 20px',
                  borderBottom:
                    idx < pagedNotices.length - 1 ? '1px solid var(--mkt-hairline-soft)' : 'none',
                  backgroundColor: 'var(--mkt-canvas)',
                  transition: 'background-color 120ms ease',
                }}
                className="notice-row"
              >
                <span
                  style={{
                    flex: 1,
                    fontFamily: 'var(--mkt-font-sans)',
                    fontSize: '15px',
                    fontWeight: 400,
                    color: 'var(--mkt-ink)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {notice.title}
                </span>
                <span
                  style={{
                    flexShrink: 0,
                    fontFamily: 'var(--mkt-font-mono)',
                    fontSize: '12px',
                    color: 'var(--mkt-ink)',
                    opacity: 0.45,
                  }}
                >
                  {notice.publishedAt ? formatDate(notice.publishedAt) : ''}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <nav
            aria-label="공지사항 페이지 탐색"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginTop: '32px',
            }}
          >
            {page > 1 && (
              <Link
                href={`/notices?page=${page - 1}`}
                style={{
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '14px',
                  color: 'var(--mkt-ink)',
                  textDecoration: 'none',
                  padding: '6px 14px',
                  border: '1px solid var(--mkt-hairline)',
                  borderRadius: '6px',
                }}
              >
                이전
              </Link>
            )}
            <span
              style={{
                fontFamily: 'var(--mkt-font-mono)',
                fontSize: '13px',
                color: 'var(--mkt-ink)',
                opacity: 0.55,
              }}
            >
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/notices?page=${page + 1}`}
                style={{
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '14px',
                  color: 'var(--mkt-ink)',
                  textDecoration: 'none',
                  padding: '6px 14px',
                  border: '1px solid var(--mkt-hairline)',
                  borderRadius: '6px',
                }}
              >
                다음
              </Link>
            )}
          </nav>
        )}
      </main>

      <style>{`
        .notice-row:hover { background-color: var(--mkt-surface-soft) !important; }
        .notice-row-pinned:hover { background-color: var(--mkt-hairline-soft) !important; }
      `}</style>

      <Footer />
    </div>
  )
}
