/**
 * StoryWork 타이포그래피 토큰
 *
 * Pretendard 는 M8 에서 webfont 로 추가 예정.
 * 현재는 시스템 폰트 fallback 체인만 정의합니다.
 */

export const fontFamily = {
  /** 본문/UI — Pretendard fallback 체인 */
  sans: [
    'Pretendard',
    'Apple SD Gothic Neo',
    '-apple-system',
    'BlinkMacSystemFont',
    'system-ui',
    'Segoe UI',
    'Roboto',
    'sans-serif',
  ].join(', '),
  /** 코드/모노스페이스 */
  mono: [
    'ui-monospace',
    'SFMono-Regular',
    'Menlo',
    'Monaco',
    'Consolas',
    'Liberation Mono',
    'Courier New',
    'monospace',
  ].join(', '),
} as const

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const

/** 4px base 로 맞춘 타입 스케일 */
export const fontSize = {
  '2xs': ['0.625rem', { lineHeight: '1rem' }], // 10px / 16px
  xs: ['0.75rem', { lineHeight: '1.125rem' }], // 12px / 18px
  sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14px / 20px
  base: ['1rem', { lineHeight: '1.5rem' }], // 16px / 24px
  lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18px / 28px
  xl: ['1.25rem', { lineHeight: '1.875rem' }], // 20px / 30px
  '2xl': ['1.5rem', { lineHeight: '2rem' }], // 24px / 32px
  '3xl': ['1.875rem', { lineHeight: '2.375rem' }], // 30px / 38px
  '4xl': ['2.25rem', { lineHeight: '2.75rem' }], // 36px / 44px
  '5xl': ['3rem', { lineHeight: '3.75rem' }], // 48px / 60px
} as const

export const lineHeight = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
} as const

export const letterSpacing = {
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
} as const

export const typography = {
  fontFamily,
  fontWeight,
  fontSize,
  lineHeight,
  letterSpacing,
} as const

export type Typography = typeof typography
