/**
 * PageJsonV1 스키마 버전 마커 및 마이그레이션 훅.
 * 실제 마이그레이터는 packages/shared-schema/src/editor/migrations/ 에 위치.
 * 이 파일은 편집기 코어가 스키마 버전을 확인하는 진입점만 제공한다.
 */

export const CURRENT_SCHEMA_VERSION = 1 as const

/**
 * 알 수 없는 raw JSON 에서 스키마 버전을 추출한다.
 * 버전이 없거나 숫자가 아니면 0 반환.
 */
export function detectSchemaVersion(raw: unknown): number {
  if (raw && typeof raw === 'object' && 'v' in (raw as object)) {
    const v = (raw as Record<string, unknown>)['v']
    if (typeof v === 'number') return v
  }
  return 0
}
