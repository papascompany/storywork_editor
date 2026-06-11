import * as React from 'react'

/**
 * FeatureCard — 마케팅 기능 카드
 *
 * template-card 스타일: surface-soft 배경, rounded-md, padding-lg
 * 아이콘 + 타이틀 + 본문 구조
 */

interface FeatureCardProps {
  icon?: React.ReactNode
  title: string
  body: string
  className?: string
}

export function FeatureCard({ icon, title, body, className = '' }: FeatureCardProps) {
  return (
    <div
      className={`mkt-sticker-sm ${className}`.trim()}
      style={{
        backgroundColor: 'var(--mkt-canvas)',
        borderRadius: '12px',
        padding: 'var(--mkt-space-lg)',
      }}
    >
      {icon && (
        <div
          style={{
            marginBottom: 'var(--mkt-space-sm)',
            color: 'var(--mkt-ink)',
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '24px',
          fontWeight: '700',
          lineHeight: '1.45',
          color: 'var(--mkt-ink)',
          marginBottom: 'var(--mkt-space-xs)',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: 'var(--mkt-body-sm-size)',
          fontWeight: 'var(--mkt-body-sm-weight)',
          lineHeight: 'var(--mkt-body-sm-lh)',
          color: 'var(--mkt-ink)',
        }}
      >
        {body}
      </p>
    </div>
  )
}
