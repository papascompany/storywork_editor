/**
 * 그림자 5단계 엘리베이션 토큰 (Material 3 / Canva 풍)
 *
 * 용도:
 *   e0 — 없음 (캔버스 배경)
 *   e1 — 미세 (카드, 인풋)
 *   e2 — 패널 (사이드 패널, 도구모음)
 *   e3 — 드롭다운 / 팝오버
 *   e4 — 모달 / 시트
 *   e5 — 풀스크린 오버레이
 */
export const elevation = {
  e0: 'none',
  e1: '0 1px 2px rgba(0,0,0,0.05)',
  e2: '0 2px 8px rgba(0,0,0,0.08)',
  e3: '0 4px 16px rgba(0,0,0,0.12)',
  e4: '0 8px 32px rgba(0,0,0,0.16)',
  e5: '0 16px 48px rgba(0,0,0,0.20)',
} as const

export type Elevation = typeof elevation
