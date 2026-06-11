'use client'

import * as React from 'react'

/**
 * ScrollReveal — 스크롤 진입 시 fade+slide-up 리빌 래퍼
 *
 * globals.css 의 .mkt-reveal / .is-visible 페어와 동작.
 * - IntersectionObserver 1회 트리거 (재진입 시 재생 안 함 — 산만함 방지)
 * - delay(ms) 로 형제 간 스태거
 * - prefers-reduced-motion / JS 미지원은 CSS 측 가드가 처리 (항상 노출)
 *
 * RSC 마케팅 페이지에서 <ScrollReveal>섹션</ScrollReveal> 로 감싸 사용한다.
 */

interface ScrollRevealProps {
  children: React.ReactNode
  /** 형제 간 스태거 지연 (ms) */
  delay?: number
  className?: string
  /** 래퍼 요소 타입 (기본 div) */
  as?: 'div' | 'section' | 'li' | 'span'
}

export function ScrollReveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}: ScrollRevealProps) {
  const ref = React.useRef<HTMLElement | null>(null)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            io.disconnect()
            break
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref as React.RefObject<never>}
      className={`mkt-reveal ${visible ? 'is-visible' : ''} ${className}`.trim()}
      style={delay ? ({ '--mkt-reveal-delay': `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  )
}
