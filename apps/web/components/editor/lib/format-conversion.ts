/**
 * format-conversion.ts — 판형 → px 변환 + fit-to-screen 줌 헬퍼
 *
 * Hard Contracts:
 * - 내부 좌표는 판형 단위 기준 정규화. 픽셀 변환은 이 모듈에서.
 * - dpi 를 외부에서 주입받아 변환 (300 dpi 하드코드 금지).
 *
 * ## px(웹툰) 판형 (MODE-04 / ADR-0017)
 * `unit='px'` 판형은 좌표가 이미 픽셀이라 변환이 1:1 이어야 한다.
 * editor-core `coordDpi()` 와 **같은 규칙**으로 좌표용 dpi 를 25.4 로 치환한다 —
 * 두 곳이 어긋나면 캔버스 크기와 객체 좌표가 따로 논다.
 */

const MM_PER_INCH = 25.4

/** 좌표 변환에 쓸 dpi — px 판형은 항등 변환(editor-core coordDpi 와 동일 규칙) */
export function coordDpiOf(format: { unit?: 'mm' | 'px'; dpi: number }): number {
  return format.unit === 'px' ? MM_PER_INCH : format.dpi
}

// ─── 타입 ──────────────────────────────────────────────────────────────────────

export interface CanvasSize {
  widthPx: number
  heightPx: number
  bleedPx: number
  safePx: number
  dpi: number
}

export interface FormatInput {
  /** 단위계 — 생략은 'mm'(하위호환) */
  unit?: 'mm' | 'px'
  widthMm: number
  heightMm: number
  dpi: number
  bleedMm: number
  safeMm: number
}

// ─── 변환 함수 ──────────────────────────────────────────────────────────────────

/**
 * mm 값을 px 로 변환 (dpi 기반, Math.round 적용).
 * fabric setDimensions 는 정수를 기대하므로 round 사용.
 */
export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm * dpi) / MM_PER_INCH)
}

/**
 * 판형 메타(mm+dpi) → 캔버스 픽셀 크기 계산.
 *
 * @example
 * // B5 단행본 130×200mm @300dpi
 * formatToPx({ widthMm:130, heightMm:200, dpi:300, bleedMm:3, safeMm:5 })
 * // → { widthPx:1535, heightPx:2362, bleedPx:35, safePx:59, dpi:300 }
 *
 * // 정사각 1:1 150×150mm @300dpi
 * formatToPx({ widthMm:150, heightMm:150, dpi:300, bleedMm:3, safeMm:5 })
 * // → { widthPx:1772, heightPx:1772, bleedPx:35, safePx:59, dpi:300 }
 */
export function formatToPx(format: FormatInput): CanvasSize {
  // px 판형이면 dpi 대신 25.4 — 값이 그대로 픽셀이 된다 (MODE-04)
  const dpi = coordDpiOf(format)
  return {
    widthPx: mmToPx(format.widthMm, dpi),
    heightPx: mmToPx(format.heightMm, dpi),
    bleedPx: mmToPx(format.bleedMm, dpi),
    safePx: mmToPx(format.safeMm, dpi),
    dpi,
  }
}

// ─── Fit-to-screen 줌 계산 ────────────────────────────────────────────────────

/**
 * 캔버스 컨테이너에 페이지가 꼭 맞는 줌 비율을 계산한다.
 *
 * 규칙:
 * - 양쪽 padding 을 제외한 실제 표시 영역 기준
 * - scaleX / scaleY 중 작은 쪽 선택 (전체 페이지가 보이도록)
 * - 100% (1.0) 초과 안 함 (확대 안 함)
 *
 * @param canvasSize  formatToPx() 결과
 * @param containerSize  실제 컨테이너 DOM 크기 (getBoundingClientRect 등)
 * @param padding  여백 px (기본 32)
 * @returns 0.0 ~ 1.0 사이의 줌 비율
 *
 * @example
 * computeFitZoom(
 *   { widthPx: 1772, heightPx: 1772, ... },
 *   { width: 800, height: 600 },
 *   32,
 * )
 * // → min((800-64)/1772, (600-64)/1772, 1) = min(0.416, 0.302, 1) = 0.302
 */
export function computeFitZoom(
  canvasSize: CanvasSize,
  containerSize: { width: number; height: number },
  padding = 32,
): number {
  const availW = containerSize.width - padding * 2
  const availH = containerSize.height - padding * 2
  const scaleX = availW / canvasSize.widthPx
  const scaleY = availH / canvasSize.heightPx
  // 1.0 초과 안 함 (축소만 허용)
  return Math.min(scaleX, scaleY, 1)
}
