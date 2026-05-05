// ─────────────────────────────────────────────
// transform-coalesce — TransformObjectCommand 연속 합치기
// ─────────────────────────────────────────────

/**
 * TransformObjectCommand.coalesceWith 의 구현 세부사항.
 *
 * History 는 push 시 직전 명령과 coalesceWith 를 시도한다.
 * TransformObjectCommand 는 coalesceWith 를 자체 구현하므로,
 * 이 파일은 coalesce 판단 로직의 재사용 유틸을 제공한다.
 */

/**
 * 두 Command 가 같은 이름과 같은 objectId 를 가지는지 확인.
 */
export function isSameTransform(nameA: string, idA: string, nameB: string, idB: string): boolean {
  return nameA === nameB && idA === idB
}

/**
 * 두 타임스탬프가 windowMs 이내인지 확인.
 */
export function withinCoalesceWindow(tsA: number, tsB: number, windowMs: number): boolean {
  return Math.abs(tsB - tsA) <= windowMs
}
