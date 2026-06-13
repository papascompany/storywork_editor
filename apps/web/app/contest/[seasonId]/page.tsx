/**
 * /contest/[seasonId] — 공모전 시즌 상세
 *
 * - rules 표시 (plain text → pre-wrap)
 * - 출품작 갤러리 grid
 * - 출품 버튼 (로그인 필요 → /login, 시즌 종료 시 비활성)
 */
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import * as React from 'react'

import { Footer } from '@/components/marketing/Footer'
import { Header } from '@/components/marketing/Header'
import { ShareBar } from '@/components/showcase/ShareBar'
import { publicDisplayName } from '@/lib/display-name'
import { prisma } from '@/lib/prisma'
import { createWebServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ seasonId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { seasonId } = await params
  const season = await prisma.contestSeason.findUnique({
    where: { id: seasonId },
    select: { name: true },
  })
  if (!season) return { title: '공모전을 찾을 수 없습니다' }
  const title = season.name
  const description = `스토리워크 공모전 — ${title}. 나만의 스토리보드를 출품해보세요.`
  const ogImage = '/api/og/default'
  return {
    title,
    description,
    alternates: { canonical: `/contest/${seasonId}` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `/contest/${seasonId}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

function formatDate(d: Date) {
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default async function ContestSeasonPage({ params }: Props) {
  const { seasonId } = await params
  const now = new Date()

  const [season, entries] = await Promise.all([
    prisma.contestSeason.findUnique({
      where: { id: seasonId },
      include: { _count: { select: { entries: true } } },
    }),
    prisma.showcase.findMany({
      where: { contestId: seasonId, mode: 'contest', hidden: false },
      orderBy: { likes: 'desc' },
      take: 24,
      include: {
        owner: { select: { name: true, email: true } },
        project: { select: { title: true, pages: { take: 1, select: { thumbnail: true } } } },
      },
    }),
  ])

  if (!season) notFound()

  // 로그인 여부 확인
  let isLoggedIn = false
  try {
    const supabase = await createWebServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    isLoggedIn = !!user
  } catch {
    // 비로그인
  }

  // frozen(자동 동결) 은 시간 경과와 동일하게 마감으로 취급 (BOARD-05)
  const isOngoing = !season.frozen && now >= season.opensAt && now <= season.closesAt
  const isEnded = season.frozen || now > season.closesAt

  return (
    <div style={{ backgroundColor: 'var(--mkt-canvas)', minHeight: '100dvh' }}>
      <Header />

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '64px 24px 80px' }}>
        {/* 뒤로 */}
        <Link
          href="/contest"
          style={{
            fontSize: '13px',
            color: 'var(--mkt-ink)',
            opacity: 0.5,
            textDecoration: 'none',
            display: 'block',
            marginBottom: '32px',
          }}
        >
          ← 공모전 목록
        </Link>

        {/* 헤더 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '24px',
            flexWrap: 'wrap',
            marginBottom: '40px',
          }}
        >
          <div>
            {/* 상태 배지 */}
            <span
              style={{
                display: 'inline-block',
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '4px',
                marginBottom: '12px',
                fontFamily: 'var(--mkt-font-sans)',
                backgroundColor: isOngoing ? '#e8fff2' : isEnded ? '#f5f5f5' : '#fff8e8',
                color: isOngoing ? '#1a7a3b' : isEnded ? '#888' : '#a06000',
              }}
            >
              {isOngoing ? '진행 중' : isEnded ? '종료' : '예정'}
            </span>

            <h1
              style={{
                fontFamily: 'var(--mkt-font-display)',
                fontSize: 'clamp(24px, 4vw, 36px)',
                fontWeight: 600,
                color: 'var(--mkt-ink)',
                marginBottom: '12px',
                lineHeight: 1.25,
              }}
            >
              {season.name}
            </h1>

            <p
              style={{
                fontFamily: 'var(--mkt-font-mono)',
                fontSize: '13px',
                color: 'var(--mkt-ink)',
                opacity: 0.5,
              }}
            >
              {formatDate(season.opensAt)} ~ {formatDate(season.closesAt)}
              {season.resultsAt && ` | 결과 발표: ${formatDate(season.resultsAt)}`}
            </p>
          </div>

          {/* 출품 버튼 */}
          {!isEnded &&
            (isLoggedIn ? (
              <Link
                href={`/mypage?tab=projects&contestId=${season.id}`}
                style={{
                  flexShrink: 0,
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--mkt-canvas)',
                  backgroundColor: isOngoing ? 'var(--mkt-ink)' : '#ccc',
                  textDecoration: 'none',
                  padding: '12px 28px',
                  borderRadius: '8px',
                  pointerEvents: isOngoing ? 'auto' : 'none',
                }}
                aria-disabled={!isOngoing}
              >
                {isOngoing ? '출품하기' : '아직 시작 전'}
              </Link>
            ) : (
              <Link
                href={`/login?next=/contest/${season.id}`}
                style={{
                  flexShrink: 0,
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--mkt-ink)',
                  backgroundColor: 'transparent',
                  textDecoration: 'none',
                  padding: '11px 27px',
                  border: '1px solid var(--mkt-hairline)',
                  borderRadius: '8px',
                }}
              >
                로그인 후 출품
              </Link>
            ))}
        </div>

        {/* 통계 바 */}
        <div
          style={{
            display: 'flex',
            gap: '32px',
            padding: '20px 0',
            borderTop: '1px solid var(--mkt-hairline)',
            borderBottom: '1px solid var(--mkt-hairline)',
            marginBottom: '40px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--mkt-font-display)',
                fontSize: '24px',
                fontWeight: 600,
                color: 'var(--mkt-ink)',
              }}
            >
              {season._count.entries.toLocaleString('ko-KR')}
            </div>
            <div
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '12px',
                color: 'var(--mkt-ink)',
                opacity: 0.5,
              }}
            >
              총 출품작
            </div>
          </div>

          {/* 공유 — 우측 정렬 */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <ShareBar
              title={`${season.name} — 스토리워크 공모전`}
              text="스토리워크 공모전에 참여해보세요!"
              subjectLabel="공모전"
            />
          </div>
        </div>

        {/* 공모전 규정 */}
        <section style={{ marginBottom: '56px' }}>
          <h2
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--mkt-ink)',
              marginBottom: '16px',
              letterSpacing: '0.3px',
            }}
          >
            공모전 규정
          </h2>
          <div
            style={{
              backgroundColor: 'var(--mkt-surface-soft)',
              borderRadius: '8px',
              padding: '24px',
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '14px',
              lineHeight: 1.8,
              color: 'var(--mkt-ink)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {season.rules}
          </div>
        </section>

        {/* 출품작 갤러리 */}
        <section>
          <h2
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--mkt-ink)',
              marginBottom: '20px',
              letterSpacing: '0.3px',
            }}
          >
            출품작 {entries.length > 0 ? `(${entries.length}개)` : ''}
          </h2>

          {entries.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 0',
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '15px',
                color: 'var(--mkt-ink)',
                opacity: 0.35,
              }}
            >
              아직 출품작이 없습니다.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '16px',
              }}
            >
              {entries.map((entry) => {
                const thumb = entry.project.pages[0]?.thumbnail
                const ownerName = publicDisplayName(entry.owner.name, entry.owner.email)
                return (
                  <Link
                    key={entry.id}
                    href={`/showcase/${entry.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div
                      style={{
                        border: '1px solid var(--mkt-hairline)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: 'var(--mkt-surface-soft)',
                        transition: 'box-shadow 120ms ease',
                      }}
                      className="entry-card"
                    >
                      {/* 썸네일 */}
                      <div
                        style={{
                          aspectRatio: '3/4',
                          position: 'relative',
                          backgroundColor: 'var(--mkt-surface-soft)',
                        }}
                      >
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt={entry.project.title}
                            fill
                            sizes="200px"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontFamily: 'var(--mkt-font-mono)',
                              fontSize: '11px',
                              color: 'var(--mkt-ink)',
                              opacity: 0.3,
                            }}
                            aria-hidden="true"
                          >
                            썸네일 없음
                          </div>
                        )}
                      </div>

                      {/* 메타 */}
                      <div style={{ padding: '10px 12px' }}>
                        <p
                          style={{
                            fontFamily: 'var(--mkt-font-sans)',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: 'var(--mkt-ink)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginBottom: '4px',
                          }}
                        >
                          {entry.project.title}
                        </p>
                        <p
                          style={{
                            fontFamily: 'var(--mkt-font-sans)',
                            fontSize: '11px',
                            color: 'var(--mkt-ink)',
                            opacity: 0.5,
                          }}
                        >
                          {ownerName}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <style>{`
        .entry-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
      `}</style>

      <Footer />
    </div>
  )
}
