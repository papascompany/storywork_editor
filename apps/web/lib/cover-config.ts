/**
 * apps/web/lib/cover-config.ts
 *
 * 표지(Cover) 설정 해석 규칙 — FOLLOWUP-COVER-02 (COVER-ADMIN-01 의 편집기 소비).
 *
 * 해석 규칙 (admin 명세와 1:1):
 *   effectiveEnabled  = set.coverEnabled  ?? format.coverEnabled
 *   effectiveWidthMm  = set.coverWidthMm  ?? format.coverWidthMm  ?? format.widthMm
 *   effectiveHeightMm = set.coverHeightMm ?? format.coverHeightMm ?? format.heightMm
 *
 * - TemplateSet 오버라이드는 null = "Format 기본값 상속" (tri-state).
 * - 순수 함수 — server/client 양쪽 사용 가능.
 */

// ─── 타입 ─────────────────────────────────────────────────────────────────────

/** Format(판형)의 표지 관련 필드 (admin COVER-ADMIN-01 스키마) */
export interface CoverFormatSource {
  widthMm: number
  heightMm: number
  coverEnabled?: boolean | null
  coverWidthMm?: number | null
  coverHeightMm?: number | null
}

/** TemplateSet 오버라이드 (null = 상속) */
export interface CoverSetOverride {
  coverEnabled?: boolean | null
  coverWidthMm?: number | null
  coverHeightMm?: number | null
}

/** 해석 결과 — 표지 사용 시 실제 표지 치수 */
export interface CoverConfig {
  widthMm: number
  heightMm: number
}

// ─── resolveCoverConfig ───────────────────────────────────────────────────────

/**
 * Format 기본값 + TemplateSet 오버라이드를 해석해 유효 표지 설정을 반환한다.
 *
 * @returns 표지 사용 시 { widthMm, heightMm }, 미사용 시 null
 */
export function resolveCoverConfig(
  format: CoverFormatSource,
  setOverride?: CoverSetOverride | null,
): CoverConfig | null {
  const enabled = setOverride?.coverEnabled ?? format.coverEnabled ?? false
  if (!enabled) return null

  return {
    widthMm: setOverride?.coverWidthMm ?? format.coverWidthMm ?? format.widthMm,
    heightMm: setOverride?.coverHeightMm ?? format.coverHeightMm ?? format.heightMm,
  }
}

// ─── effectivePageFormat ──────────────────────────────────────────────────────

/**
 * 페이지 index 의 유효 판형 치수를 반환한다.
 * 표지 컨벤션: project.cover 가 설정된 프로젝트에서 index 0 = 표지 페이지.
 *
 * 치수 외 필드(dpi/bleed/safe)는 본문 판형 값을 그대로 따른다.
 */
export function effectivePageFormat<T extends { widthMm: number; heightMm: number }>(
  format: T,
  cover: CoverConfig | null | undefined,
  pageIndex: number,
): T {
  if (cover && pageIndex === 0) {
    return { ...format, widthMm: cover.widthMm, heightMm: cover.heightMm }
  }
  return format
}
