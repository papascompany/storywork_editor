'use client'

import * as React from 'react'

/**
 * MarqueeStrip — 마케팅 사이트 상단 검정 띠 (marquee-strip)
 *
 * DESIGN.md §marquee-strip:
 * - bg: inverse-canvas(#000)  text: inverse-ink(#fff)
 * - height: 36px
 * - 흘러가는 텍스트 애니메이션 (prefers-reduced-motion 존중)
 *
 * 'use client' 이유: CSS animation 은 SSR 에서도 동작하지만,
 * 중복 내용 두 벌을 JS 로 제어해야 완전한 무한 루프가 가능함.
 */

interface MarqueeStripProps {
  items: string[]
}

export function MarqueeStrip({ items }: MarqueeStripProps) {
  // 아이템을 여러 번 반복해 seamless 루프 구성
  const repeated = [...items, ...items, ...items, ...items]

  return (
    <div
      aria-hidden="true"
      style={{
        backgroundColor: 'var(--mkt-inverse-canvas)',
        color: 'var(--mkt-inverse-ink)',
        height: 'var(--mkt-marquee-height)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div className="mkt-marquee-track">
        {repeated.map((item, idx) => (
          <span
            key={idx}
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: 'var(--mkt-body-sm-size)',
              fontWeight: 'var(--mkt-body-sm-weight)',
              letterSpacing: 'var(--mkt-body-sm-ls)',
              paddingLeft: 'var(--mkt-space-xl)',
              whiteSpace: 'nowrap',
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
