/**
 * z-index 계층 토큰
 *
 * 모든 z-index 는 이 테이블에서 가져옵니다.
 * CSS 변수로도 주입됩니다 (globals.css의 --z-* 변수).
 */
export const zIndex = {
  base: 0,
  canvas: 1,
  floatingControl: 10, // 캔버스 객체 위 floating 핸들
  panel: 20, // 좌/우 사이드 패널
  dropdown: 30, // 드롭다운 / 컨텍스트 메뉴
  modal: 40, // 다이얼로그 / 모달
  toast: 50, // 토스트 알림
  bottomSheet: 60, // 모바일 BottomSheet (모달보다 위)
  loadingOverlay: 70, // 로딩 오버레이
  cmdPalette: 80, // 커맨드 팔레트
  tooltip: 90, // 툴팁 (최상단)
} as const

export type ZIndexKey = keyof typeof zIndex
export type ZIndex = typeof zIndex
