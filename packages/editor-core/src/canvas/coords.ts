/**
 * mm ↔ px 좌표 변환 어댑터
 *
 * 계약:
 * - 모든 외부 입출력 좌표는 판형 단위(mm 판형=밀리미터, px 판형=픽셀)
 * - 내부 fabric 캔버스는 px (= 값 * dpi / 25.4)
 * - 이 모듈은 변환만 담당. 상태 없음
 *
 * ## px(웹툰) 판형 (MODE-04 / ADR-0017)
 * 웹툰 판형은 좌표가 이미 픽셀이므로 변환이 **1:1** 이어야 한다. 이를 위해 변환 함수를
 * 새로 만들지 않고 **좌표용 dpi 를 25.4 로 치환**한다 — `mm * 25.4 / 25.4 = mm`.
 * 덕분에 `mmToPx/pxToMm` 시그니처와 60여 개 호출처(패널·인스펙터·템플릿 스냅 등)가
 * 그대로 유지된다. 판형에서 좌표용 dpi 를 얻는 단일 진입점이 `coordDpi()` 다.
 */

const MM_PER_INCH = 25.4

/** `coordDpi` 가 참조하는 판형 최소 형태 — editor-core Format 과 구조적 호환 */
export type CoordFormatLike = { unit?: 'mm' | 'px'; dpi: number }

/**
 * 좌표 변환에 쓸 dpi.
 *
 * px(웹툰) 판형은 `MM_PER_INCH` 를 돌려줘 mm↔px 변환을 항등으로 만든다.
 * **판형의 `dpi` 필드를 좌표 변환에 직접 쓰지 말고 항상 이 함수를 거칠 것** —
 * 직접 쓰면 웹툰 690px 판형이 690mm(=1954px @72dpi) 로 해석돼 캔버스가 터진다.
 */
export function coordDpi(format: CoordFormatLike): number {
  return format.unit === 'px' ? MM_PER_INCH : format.dpi
}

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
 * 판형 기준 캔버스 px 크기 계산.
 * `dpi` 는 **좌표용 dpi**(`coordDpi()` 결과)를 넘겨야 한다 — px 판형이면 1:1 이 된다.
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

/**
 * 브라우저 canvas 엘리먼트 한 변의 실효 상한(px).
 *
 * iOS/Safari 가 가장 낮아 실측 16384px 이며, 초과하면 예외 없이 **빈 캔버스**가 된다.
 * 백스토어는 CSS 크기 × devicePixelRatio 이므로 dpr=2 에서는 CSS 8192px 이 이미 한계다.
 * 웹툰 스트립(세그먼트 1280px)을 한 캔버스에 이으면 7세그먼트에서 도달한다 —
 * 그래서 스트립은 세그먼트별 캔버스로 쌓고(MODE-04b), 여기서는 최후 방어선만 둔다.
 */
export const MAX_CANVAS_SIDE_PX = 16384

/**
 * 캔버스 px 크기를 브라우저 상한 안으로 눌러 담는다.
 * 비율은 유지하고, 눌린 경우에만 `clamped: true` — 호출자가 경고를 남길 수 있다.
 *
 * @param dpr 백스토어 배율(devicePixelRatio). 상한은 **백스토어 기준**이라 CSS 크기 한계는 상한/dpr.
 */
export function clampCanvasPx(
  width: number,
  height: number,
  dpr = 1,
): { width: number; height: number; clamped: boolean } {
  const limit = MAX_CANVAS_SIDE_PX / Math.max(1, dpr)
  const longest = Math.max(width, height)
  if (longest <= limit) return { width, height, clamped: false }
  const scale = limit / longest
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
    clamped: true,
  }
}

/** 판형 하나로 캔버스 px 크기를 구한다 (단위계 자동 처리 — MODE-04 권장 진입점) */
export function formatPxSize(format: CoordFormatLike & { widthMm: number; heightMm: number }): {
  width: number
  height: number
} {
  return formatToPxSize(format.widthMm, format.heightMm, coordDpi(format))
}
