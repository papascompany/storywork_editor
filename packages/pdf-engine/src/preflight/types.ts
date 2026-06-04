/**
 * packages/pdf-engine/src/preflight/types.ts
 *
 * Preflight 검증 결과 타입 정의
 *
 * PreflightViolation : 개별 위반 항목 (페이지/레이어 좌표 포함)
 * PreflightReport    : 프로필별 전체 결과 (ok = errors === 0)
 */

// ─── 위반 항목 ────────────────────────────────────────────────────────────────

export type PreflightSeverity = 'error' | 'warning' | 'info'

export interface PreflightViolation {
  /** 어떤 룰이 위반됐는지 식별자 (e.g. 'bleed-check', 'dpi-check') */
  rule: string
  severity: PreflightSeverity
  /** 0-based 페이지 인덱스 (전체 단위 위반이면 undefined) */
  pageIndex?: number
  /** fabric 레이어 ID (레이어 단위 위반이면 해당 id) */
  layerId?: string
  /** 사람이 읽을 수 있는 위반 메시지 */
  message: string
  /** 해결 제안 (사용자에게 노출) */
  suggestion?: string
}

// ─── 리포트 ──────────────────────────────────────────────────────────────────

export interface PreflightReport {
  /** 검증한 프로필 ID */
  profileId: string
  /** 프로필 표시 이름 */
  profileName: string
  /** errors.length === 0 이면 true */
  ok: boolean
  errors: PreflightViolation[]
  warnings: PreflightViolation[]
  infos: PreflightViolation[]
  metadata: {
    totalPages: number
    /** ISO 8601 */
    checkedAt: string
  }
}
