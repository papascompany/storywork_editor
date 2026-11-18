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
  // preload 끔 — preload 된 웹폰트는 Chrome 이 잠시 렌더를 막아 FCP 를 늦춘다(admin PERF-ADMIN-04 와 동일 원인).
  // 실측(로컬 cold): 랜딩 FCP p75 400→284ms · /login 252→148ms (브로드밴드). CSS 에서 바로 발견되므로
  // 폰트 적용 시점은 거의 같다. web 은 편집기에 사용자가 임의 한글을 입력하므로 서브셋은 하지 않는다.
  preload: false,
  fallback: [
    'Pretendard',
    'Noto Sans KR',
    '-apple-system',
    'BlinkMacSystemFont',
    'system-ui',
    'sans-serif',
  ],
})
