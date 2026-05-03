/**
 * StoryWork 브레이크포인트 토큰
 *
 * Mobile-first 전략: 기본값은 모바일, sm/md/lg/xl/2xl 로 확장
 */

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

export type BreakpointKey = keyof typeof breakpoints
export type Breakpoints = typeof breakpoints
