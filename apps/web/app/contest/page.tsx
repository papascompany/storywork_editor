/**
 * /contest — 공모전 시즌 목록
 *
 * 현재 진행 중 / 예정 / 종료 섹션으로 구분.
 * RSC.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import * as React from 'react'

import { Footer } from '@/components/marketing/Footer'
import { Header } from '@/components/marketing/Header'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '공모전',
  description: '스토리워크 공모전 시즌. 나만의 스토리보드를 출품하고 크리에이터를 꿈꾸세요.',
}

function formatDateRange(opensAt: Date, closesAt: Date) {
  const fmt = (d: Date) =>
    d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
  return `${fmt(opensAt)} ~ ${fmt(closesAt)}`
}

type SeasonStatus = 'ongoing' | 'upcoming' | 'ended'

function getStatus(now: Date, opensAt: Date, closesAt: Date): SeasonStatus {
  if (now < opensAt) return 'upcoming'
  if (now >= opensAt && now <= closesAt) return 'ongoing'
  return 'ended'
}

const STATUS_BADGE: Record<SeasonStatus, { label: string; bg: string; color: string }> = {
  ongoing: { label: '진행 중', bg: '#e8fff2', color: '#1a7a3b' },
  upcoming: { label: '예정', bg: '#fff8e8', color: '#a06000' },
  ended: { label: '종료', bg: '#f5f5f5', color: '#888' },
}

export default async function ContestPage() {
  const now = new Date()

  const seasons = await prisma.contestSeason.findMany({
    orderBy: { opensAt: 'desc' },
    include: {
      _count: { select: { entries: true } },
    },
  })

  const ongoing = seasons.filter((s) => getStatus(now, s.opensAt, s.closesAt) === 'ongoing')
  const upcoming = seasons.filter((s) => getStatus(now, s.opensAt, s.closesAt) === 'upcoming')
  const ended = seasons.filter((s) => getStatus(now, s.opensAt, s.closesAt) === 'ended')

  function SeasonCard({ season, status }: { season: (typeof seasons)[0]; status: SeasonStatus }) {
    const badge = STATUS_BADGE[status]
    return (
      <Link href={`/contest/${season.id}`} style={{ textDecoration: 'none' }}>
        <div
          style={{
            border: '1px solid var(--mkt-hairline)',
            borderRadius: '12px',
            padding: '24px',
            backgroundColor: 'var(--mkt-canvas)',
            transition: 'box-shadow 120ms ease',
          }}
          className="contest-card"
        >
          {/* 배지 */}
          <span
            style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: badge.bg,
              color: badge.color,
              padding: '3px 8px',
              borderRadius: '4px',
              marginBottom: '12px',
              fontFamily: 'var(--mkt-font-sans)',
            }}
          >
            {badge.label}
          </span>

          {/* 시즌명 */}
          <h2
            style={{
              fontFamily: 'var(--mkt-font-display)',
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--mkt-ink)',
              marginBottom: '8px',
              lineHeight: 1.3,
            }}
          >
            {season.name}
          </h2>

          {/* 기간 */}
          <p
            style={{
              fontFamily: 'var(--mkt-font-mono)',
              fontSize: '12px',
              color: 'var(--mkt-ink)',
              opacity: 0.5,
              marginBottom: '16px',
            }}
          >
            {formatDateRange(season.opensAt, season.closesAt)}
          </p>

          {/* 출품작 수 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '13px',
                color: 'var(--mkt-ink)',
                opacity: 0.6,
              }}
            >
              출품작 {season._count.entries.toLocaleString('ko-KR')}개
            </span>
            {status === 'ongoing' && (
              <span
                style={{
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '13px',
                  color: '#1a7a3b',
                  fontWeight: 500,
                }}
              >
                · 지금 출품 가능
              </span>
            )}
          </div>
        </div>
      </Link>
    )
  }

  const hasSeasons = seasons.length > 0

  return (
    <div style={{ backgroundColor: 'var(--mkt-canvas)', minHeight: '100dvh' }}>
      <Header />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '64px 24px 80px' }}>
        <h1
          style={{
            fontFamily: 'var(--mkt-font-display)',
            fontSize: 'var(--mkt-display-lg-size)',
            fontWeight: 'var(--mkt-display-lg-weight)',
            color: 'var(--mkt-ink)',
            marginBottom: '8px',
          }}
        >
          공모전
        </h1>
        <p
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '15px',
            color: 'var(--mkt-ink)',
            opacity: 0.55,
            marginBottom: '56px',
          }}
        >
          나만의 스토리보드를 출품하고 크리에이터를 꿈꾸세요.
        </p>

        {!hasSeasons && (
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
            현재 예정된 공모전이 없습니다.
          </div>
        )}

        {/* 진행 중 */}
        {ongoing.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <h2
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1a7a3b',
                marginBottom: '16px',
                letterSpacing: '0.5px',
              }}
            >
              진행 중
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {ongoing.map((s) => (
                <SeasonCard key={s.id} season={s} status="ongoing" />
              ))}
            </div>
          </section>
        )}

        {/* 예정 */}
        {upcoming.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <h2
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#a06000',
                marginBottom: '16px',
                letterSpacing: '0.5px',
              }}
            >
              예정
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {upcoming.map((s) => (
                <SeasonCard key={s.id} season={s} status="upcoming" />
              ))}
            </div>
          </section>
        )}

        {/* 종료 */}
        {ended.length > 0 && (
          <section>
            <h2
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--mkt-ink)',
                opacity: 0.4,
                marginBottom: '16px',
                letterSpacing: '0.5px',
              }}
            >
              종료된 공모전
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
                opacity: 0.65,
              }}
            >
              {ended.map((s) => (
                <SeasonCard key={s.id} season={s} status="ended" />
              ))}
            </div>
          </section>
        )}
      </main>

      <style>{`
        .contest-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }
      `}</style>

      <Footer />
    </div>
  )
}
