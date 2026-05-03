/**
 * StoryWork 모션 토큰
 *
 * prefers-reduced-motion 가드는 globals.css 에서 전역 적용됩니다.
 * 컴포넌트에서는 이 토큰을 CSS 변수로 사용하십시오: `var(--duration-fast)`
 */

export const duration = {
  instant: '0ms',
  fast: '100ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const

export const easing = {
  /** 기본 ease-in-out */
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** 빠른 시작, 느린 종료 (들어오는 요소) */
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  /** 느린 시작, 빠른 종료 (나가는 요소) */
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  /** 선형 (로딩 스피너 등) */
  linear: 'linear',
  /** 스프링감 (강조) */
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const

export const motion = {
  duration,
  easing,
} as const

export type Motion = typeof motion
