import Link from 'next/link'
import * as React from 'react'

/**
 * PillButton — 마케팅 전용 pill 형태 CTA 버튼
 *
 * variant:
 *   primary   — 검정 배경 흰 텍스트 (--mkt-btn-primary)
 *   secondary — 흰 배경 검정 텍스트 (--mkt-btn-secondary)
 *   inverse   — 투명 + 흰색 테두리 (네이비 섹션용)
 *
 * href 가 있으면 <a>, 없으면 <button>
 * WCAG 최소 44px 터치 타겟 보장
 */

type Variant = 'primary' | 'secondary' | 'inverse'

interface PillButtonProps {
  variant?: Variant
  href?: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
  external?: boolean
  'aria-label'?: string
}

const variantClass: Record<Variant, string> = {
  primary: 'mkt-btn-primary',
  secondary: 'mkt-btn-secondary',
  inverse: 'mkt-btn-secondary mkt-btn-secondary-inverse',
}

export function PillButton({
  variant = 'primary',
  href,
  children,
  className = '',
  onClick,
  external = false,
  'aria-label': ariaLabel,
}: PillButtonProps) {
  const cls = `${variantClass[variant]} ${className}`.trim()

  if (href) {
    if (external) {
      return (
        <a
          href={href}
          className={cls}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={ariaLabel}
        >
          {children}
        </a>
      )
    }
    return (
      <Link href={href} className={cls} aria-label={ariaLabel}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" className={cls} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  )
}
