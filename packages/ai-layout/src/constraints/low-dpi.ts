/**
 * low-dpi.ts — lowDpi 슬롯 제약 (M2-07, ADR-0011a)
 *
 * 750×750 PNG 자산이 큰 슬롯(풀샷 등)에 배치되면 인쇄 흐림 발생.
 * → lowDpi 태그 자산은 페이지 한 변의 1/2 이하 슬롯에만 허용.
 *
 * effectiveDpi = (assetMinSide_px / slotMaxSide_mm) * 25.4
 *   < 200 → warning
 *   < 150 → error (fallback 필요)
 *
 * ADR-0011a 준수: 절대 우회 금지
 */

import type { LayoutFormat, LayoutSlot } from '../types.js'

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────

export const DPI_WARNING_THRESHOLD = 200
export const DPI_ERROR_THRESHOLD = 150

// ─────────────────────────────────────────────
// lowDpi 제약 검사 결과
// ─────────────────────────────────────────────

export type LowDpiCheckResult =
  | { ok: true; effectiveDpi: number }
  | {
      ok: false
      reason: 'size-violation' | 'dpi-error' | 'dpi-warning'
      effectiveDpi: number
      message: string
    }

// ─────────────────────────────────────────────
// 슬롯 최대 변 계산 (mm)
// ─────────────────────────────────────────────

/**
 * 슬롯 normalized 크기(0..1) × 판형 크기(mm) → 슬롯 최대 변(mm)
 */
export function slotMaxSideMm(slot: LayoutSlot, format: LayoutFormat): number {
  const slotWidthMm = slot.w * format.widthMm
  const slotHeightMm = slot.h * format.heightMm
  return Math.max(slotWidthMm, slotHeightMm)
}

/**
 * 페이지 최대 변(mm)
 */
export function pageMaxSideMm(format: LayoutFormat): number {
  return Math.max(format.widthMm, format.heightMm)
}

// ─────────────────────────────────────────────
// 핵심 제약 검사
// ─────────────────────────────────────────────

/**
 * lowDpi 자산 + 슬롯 조합이 ADR-0011a 를 만족하는지 검사.
 *
 * @param isLowDpi    자산이 lowDpi 태그를 가지는지
 * @param assetSize   자산 마스터 픽셀 크기 { w, h }. null 이면 가정 750×750
 * @param slot        배치 대상 슬롯
 * @param format      판형 (mm 단위)
 * @returns           LowDpiCheckResult
 */
export function checkLowDpiConstraint(
  isLowDpi: boolean,
  assetSize: { w: number; h: number } | null,
  slot: LayoutSlot,
  format: LayoutFormat,
): LowDpiCheckResult {
  const actualSize = assetSize ?? { w: 750, h: 750 }
  const assetMinSide = Math.min(actualSize.w, actualSize.h)
  const slotMaxMm = slotMaxSideMm(slot, format)
  const pageHalfMm = pageMaxSideMm(format) / 2

  // effectiveDpi: 슬롯 최대 변(mm) 기준 인쇄 DPI
  const effectiveDpi = slotMaxMm > 0 ? (assetMinSide / slotMaxMm) * 25.4 : 0

  if (!isLowDpi) {
    // lowDpi 태그 없으면 크기 위반 체크 건너뜀 (경고 없이 OK)
    return { ok: true, effectiveDpi }
  }

  // ADR-0011a 핵심 규칙: slotMaxSide > pageMaxSide / 2 → 위반
  if (slotMaxMm > pageHalfMm) {
    return {
      ok: false,
      reason: 'size-violation',
      effectiveDpi,
      message: `lowDpi 자산은 페이지 1/2(${pageHalfMm.toFixed(1)}mm) 이하 슬롯에만 배치 가능. 슬롯 크기: ${slotMaxMm.toFixed(1)}mm`,
    }
  }

  // effectiveDpi 체크
  if (effectiveDpi < DPI_ERROR_THRESHOLD) {
    return {
      ok: false,
      reason: 'dpi-error',
      effectiveDpi,
      message: `effectiveDpi=${effectiveDpi.toFixed(1)} < ${DPI_ERROR_THRESHOLD} (오류 임계치). fallback 자산 필요.`,
    }
  }

  if (effectiveDpi < DPI_WARNING_THRESHOLD) {
    return {
      ok: false,
      reason: 'dpi-warning',
      effectiveDpi,
      message: `effectiveDpi=${effectiveDpi.toFixed(1)} < ${DPI_WARNING_THRESHOLD} (경고 임계치).`,
    }
  }

  return { ok: true, effectiveDpi }
}

// ─────────────────────────────────────────────
// 경고 메시지 생성 헬퍼
// ─────────────────────────────────────────────

export function formatLowDpiWarning(
  resourceId: string,
  slotId: string,
  result: LowDpiCheckResult,
): string {
  if (result.ok) return ''
  return `[lowDpi] resource=${resourceId} slot=${slotId}: ${result.message}`
}
