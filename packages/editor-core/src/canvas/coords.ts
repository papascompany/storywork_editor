/**
 * mm ↔ px 좌표 변환 어댑터
 *
 * 계약:
 * - 모든 외부 입출력 좌표는 mm 단위
 * - 내부 fabric 캔버스는 px (= mm * dpi / 25.4)
 * - 이 모듈은 변환만 담당. 상태 없음
 */

const MM_PER_INCH = 25.4

/**
 * mm → px 변환
 * @param mm  밀리미터 값
 * @param dpi 해상도 (dots per inch)
 */
export function mmToPx(mm: number, dpi: number): number {
  return (mm * dpi) / MM_PER_INCH
}

/**
 * px → mm 변환
 * @param px  픽셀 값
 * @param dpi 해상도 (dots per inch)
 */
export function pxToMm(px: number, dpi: number): number {
  return (px * MM_PER_INCH) / dpi
}

/**
 * 판형(mm) 기준 캔버스 px 크기 계산
 */
export function formatToPxSize(
  widthMm: number,
  heightMm: number,
  dpi: number,
): { width: number; height: number } {
  return {
    width: Math.round(mmToPx(widthMm, dpi)),
    height: Math.round(mmToPx(heightMm, dpi)),
  }
}
