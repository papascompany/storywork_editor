import * as React from 'react'

import { PillButton } from './PillButton'

/**
 * Hero — 마케팅 히어로 섹션 (재사용 가능)
 *
 * white canvas, display-xl headline + subhead + CTA pair
 * 우측에 선택적 illustration slot
 */

interface HeroCTA {
  label: string
  href: string
  variant?: 'primary' | 'secondary'
}

interface HeroProps {
  eyebrow?: string
  headline: React.ReactNode
  subhead?: string
  ctas?: HeroCTA[]
  illustration?: React.ReactNode
  className?: string
}

export function Hero({
  eyebrow,
  headline,
  subhead,
  ctas = [],
  illustration,
  className = '',
}: HeroProps) {
  return (
    <section
      className={className}
      style={{
        backgroundColor: 'var(--mkt-canvas)',
        padding: 'var(--mkt-space-section) var(--mkt-space-xl)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--mkt-max-width)',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: illustration ? '1fr 1fr' : '1fr',
          gap: 'var(--mkt-space-xxl)',
          alignItems: 'center',
        }}
        className={illustration ? 'hero-grid' : ''}
      >
        {/* 텍스트 컬럼 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-xl)' }}>
          {eyebrow && (
            <span className="mkt-eyebrow" style={{ color: 'var(--mkt-ink)', opacity: 0.55 }}>
              {eyebrow}
            </span>
          )}

          <h1 className="mkt-display-xl" style={{ color: 'var(--mkt-ink)' }}>
            {headline}
          </h1>

          {subhead && (
            <p
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: 'var(--mkt-body-lg-size)',
                fontWeight: 'var(--mkt-body-lg-weight)',
                lineHeight: 'var(--mkt-body-lg-lh)',
                letterSpacing: 'var(--mkt-body-lg-ls)',
                color: 'var(--mkt-ink)',
                opacity: 0.7,
                maxWidth: '540px',
              }}
            >
              {subhead}
            </p>
          )}

          {ctas.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--mkt-space-sm)' }}>
              {ctas.map((cta) => (
                <PillButton key={cta.label} href={cta.href} variant={cta.variant ?? 'primary'}>
                  {cta.label}
                </PillButton>
              ))}
            </div>
          )}
        </div>

        {/* 일러스트 컬럼 (있을 때만) */}
        {illustration && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-hidden="true"
          >
            {illustration}
          </div>
        )}
      </div>

      {/* 모바일: 2열 → 1열 */}
      <style>{`
        @media (max-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}
