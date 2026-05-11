// ─────────────────────────────────────────────
// fonts.ts — Pretendard Variable 폰트 정의
//
// next/font/local 을 사용해 셀프 호스팅.
// woff2 파일: public/fonts/PretendardVariable.woff2
// ─────────────────────────────────────────────

import localFont from 'next/font/local'

/**
 * Pretendard Variable — 한/영 균형 가변 폰트.
 * weight 축: 100~900
 * CSS 변수: --font-pretendard
 */
export const pretendard = localFont({
  src: [
    {
      path: '../public/fonts/PretendardVariable.woff2',
      // 가변 폰트이므로 weight 범위 지정
      weight: '100 900',
      style: 'normal',
    },
  ],
  variable: '--font-pretendard',
  display: 'swap',
  preload: true,
  fallback: [
    'Pretendard',
    'Noto Sans KR',
    '-apple-system',
    'BlinkMacSystemFont',
    'system-ui',
    'sans-serif',
  ],
})
