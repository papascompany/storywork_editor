/**
 * (dashboard)/page.tsx — 대시보드 홈
 *
 * 100p Admin 레퍼런스 정확 모방:
 *   - 좌측 nike-heading-xl + 타임스탬프 / 우상단 pill 버튼 2개 (secondary + primary)
 *   - 파스텔 카드 4개 grid (pink/cream/mint/lilac) + nike-card-number (40px)
 *   - 섹션 헤더 + "전체 보기 →" sale red 링크
 *   - 빈 상태: 옅은 회색 박스 + 중앙 텍스트
 */
import Link from 'next/link'

import { requireRole } from '../../src/lib/auth'
import { prisma } from '../../src/lib/prisma'

// ─── 날짜 포매터 ─────────────────────────────────────────────────────────────

function formatKoreanDate(d: Date): string {
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const month = pad2(d.getMonth() + 1)
  const day = pad2(d.getDate())
  const hour = d.getHours()
  const ampm = hour < 12 ? 'AM' : 'PM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  const min = pad2(d.getMinutes())
  return `오늘 ${month}. ${day}. ${ampm} ${h12}:${min} 기준`
}

// ─── 페이지 ──────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  await requireRole()

  const now = new Date()

  // 통계 병렬 조회
  const [resourceCount, formatCount, templateCount, templateSetCount] = await Promise.all([
    prisma.resource.count({ where: { status: 'published' } }),
    prisma.format.count(),
    prisma.template.count(),
    prisma.templateSet.count(),
  ])

  // 오늘 등록 리소스
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayResourceCount = await prisma.resource.count({
    where: { createdAt: { gte: todayStart }, status: 'published' },
  })

  return (
    <div className="p-6 lg:p-10" style={{ maxWidth: '1280px' }}>
      {/* ─── 페이지 헤더 (100p Admin 패턴) ─── */}
      <header className="flex items-end justify-between gap-4 mb-10 flex-wrap">
        <div>
          <h1 className="nike-heading-xl">대시보드</h1>
          <p className="nike-caption-md mt-1" style={{ color: 'var(--nike-mute)' }}>
            {formatKoreanDate(now)}
          </p>
        </div>
        {/* 우상단 pill 버튼 2개 */}
        <div className="flex gap-2 flex-shrink-0">
          <Link href="/resources/review" className="nike-btn-secondary">
            검수 큐
          </Link>
          <Link href="/resources/upload" className="nike-btn-primary">
            리소스 업로드
          </Link>
        </div>
      </header>

      {/* ─── 파스텔 통계 카드 4개 (100p Admin 패턴) ─── */}
      <section
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
        aria-label="주요 지표"
      >
        {/* 카드 1 — pink */}
        <article className="nike-card-pastel pink">
          <span className="nike-caption-sm" style={{ color: 'var(--nike-ink)', opacity: 0.6 }}>
            오늘 등록 리소스
          </span>
          <span className="nike-card-number">{todayResourceCount.toLocaleString()}</span>
          <span className="nike-caption-sm">published 기준</span>
        </article>

        {/* 카드 2 — cream */}
        <article className="nike-card-pastel cream">
          <span className="nike-caption-sm" style={{ color: 'var(--nike-ink)', opacity: 0.6 }}>
            전체 리소스
          </span>
          <span className="nike-card-number">{resourceCount.toLocaleString()}</span>
          <span className="nike-caption-sm">게시됨 기준</span>
        </article>

        {/* 카드 3 — mint */}
        <article className="nike-card-pastel mint">
          <span className="nike-caption-sm" style={{ color: 'var(--nike-ink)', opacity: 0.6 }}>
            템플릿
          </span>
          <span className="nike-card-number">{templateCount.toLocaleString()}</span>
          <span className="nike-caption-sm">전체 등록</span>
        </article>

        {/* 카드 4 — lilac */}
        <article className="nike-card-pastel lilac">
          <span className="nike-caption-sm" style={{ color: 'var(--nike-ink)', opacity: 0.6 }}>
            판형
          </span>
          <span className="nike-card-number">{formatCount.toLocaleString()}</span>
          <span className="nike-caption-sm">등록됨 / 세트 {templateSetCount}</span>
        </article>
      </section>

      {/* ─── 리소스 섹션 ─── */}
      <section className="mb-10">
        {/* 섹션 헤더 + "전체 보기 →" sale red 링크 (100p Admin 패턴) */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="nike-heading-md">리소스 관리</h2>
          <Link
            href="/resources"
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--nike-sale)',
              textDecoration: 'none',
            }}
          >
            전체 보기 →
          </Link>
        </div>
        {/* 빈 상태 박스 (100p Admin — 옅은 회색 + 중앙 텍스트) */}
        <div
          style={{
            backgroundColor: 'var(--nike-canvas)',
            border: '1px solid var(--nike-hairline-soft)',
            borderRadius: '12px',
            padding: '40px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          <QuickLinkCard
            href="/resources"
            label="리소스 목록"
            sub="포즈·배경·소품 관리"
            accent="lilac"
          />
          <QuickLinkCard
            href="/resources/upload"
            label="일괄 업로드"
            sub="PNG ZIP 업로드"
            accent="cream"
          />
          <QuickLinkCard
            href="/resources/review"
            label="검수 큐"
            sub="draft → published"
            accent="mint"
          />
          <QuickLinkCard href="/formats" label="판형 관리" sub="인쇄 규격 등록" accent="pink" />
          <QuickLinkCard href="/templates" label="템플릿" sub="레이아웃 등록" accent="lilac" />
          <QuickLinkCard
            href="/template-sets"
            label="템플릿 세트"
            sub="세트 묶음 관리"
            accent="cream"
          />
        </div>
      </section>

      {/* ─── 감사 로그 섹션 ─── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="nike-heading-md">최근 활동</h2>
          <Link
            href="/audit"
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--nike-sale)',
              textDecoration: 'none',
            }}
          >
            전체 보기 →
          </Link>
        </div>
        {/* 빈 상태 */}
        <div
          style={{
            backgroundColor: 'var(--nike-canvas)',
            border: '1px solid var(--nike-hairline-soft)',
            borderRadius: '12px',
            padding: '48px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '14px',
              color: 'var(--nike-stone)',
              textAlign: 'center',
            }}
          >
            최근 변경 사항이 여기 표시됩니다
          </p>
        </div>
      </section>
    </div>
  )
}

// ─── 빠른 링크 카드 ───────────────────────────────────────────────────────────

function QuickLinkCard({
  href,
  label,
  sub,
  accent,
}: {
  href: string
  label: string
  sub: string
  accent: 'pink' | 'cream' | 'mint' | 'lilac'
}) {
  const accentBg: Record<string, string> = {
    pink: 'var(--nike-card-pink)',
    cream: 'var(--nike-card-cream)',
    mint: 'var(--nike-card-mint)',
    lilac: 'var(--nike-card-lilac)',
  }
  return (
    <Link
      href={href}
      prefetch={true}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '16px',
        borderRadius: '12px',
        backgroundColor: accentBg[accent],
        textDecoration: 'none',
        transition: 'opacity 100ms',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--nike-font-display)',
          fontSize: '15px',
          fontWeight: 500,
          color: 'var(--nike-ink)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--nike-font-text)',
          fontSize: '12px',
          color: 'var(--nike-mute)',
        }}
      >
        {sub}
      </span>
    </Link>
  )
}
