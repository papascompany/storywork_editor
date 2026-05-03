/**
 * StoryWork 그림자 토큰
 */

export const shadow = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.18)',
} as const

/** 포커스 링 — 접근성 필수 */
export const focusRing = {
  /** 기본 포커스 링 (브랜드 색) */
  default: '0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-brand-500)',
  /** 에러 상태 포커스 링 */
  error: '0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-error-500)',
  /** 오프셋 없는 단일 링 */
  solid: '0 0 0 2px var(--color-brand-500)',
} as const

export const shadows = {
  shadow,
  focusRing,
} as const

export type Shadows = typeof shadows
