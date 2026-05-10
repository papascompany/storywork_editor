import * as React from 'react'

/**
 * ColorBlock — 마케팅 섹션 컬러블록 컨테이너
 *
 * DESIGN.md §color-block-section 에 따라:
 * - rounded-lg (24px) 모서리, 768px 이하에서 full-bleed
 * - padding: spacing.xxl (48px)
 * - 각 variant 는 지정된 배경색 사용
 *
 * navy variant 는 inverse (흰 텍스트) 자동 적용.
 */

type ColorBlockVariant = 'lime' | 'lilac' | 'cream' | 'pink' | 'mint' | 'coral' | 'navy'

interface ColorBlockProps {
  variant: ColorBlockVariant
  children: React.ReactNode
  className?: string
  id?: string
  as?: React.ElementType
}

const variantClass: Record<ColorBlockVariant, string> = {
  lime: 'mkt-block mkt-block-lime',
  lilac: 'mkt-block mkt-block-lilac',
  cream: 'mkt-block mkt-block-cream',
  pink: 'mkt-block mkt-block-pink',
  mint: 'mkt-block mkt-block-mint',
  coral: 'mkt-block mkt-block-coral',
  navy: 'mkt-block mkt-block-navy',
}

export function ColorBlock({
  variant,
  children,
  className = '',
  id,
  as: Tag = 'section',
}: ColorBlockProps) {
  return (
    <Tag id={id} className={`${variantClass[variant]} ${className}`.trim()}>
      {children}
    </Tag>
  )
}
