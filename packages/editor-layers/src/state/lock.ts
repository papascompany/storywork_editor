// ─────────────────────────────────────────────
// lock — 잠금 상태 전파 로직
// ─────────────────────────────────────────────

import { getDescendants } from '../tree/traverse.js'
import type { LayerNode } from '../types.js'

/**
 * 노드와 선택적으로 자손 노드들의 locked 상태를 변경.
 * 조상의 lock 상태는 건드리지 않는다.
 *
 * @param id 대상 노드 id
 * @param locked 새 lock 상태
 * @param recursive true 이면 자손까지 동일하게 변경
 * @param nodeMap 현재 전체 노드 맵 (읽기 전용)
 * @returns 변경된 노드들의 id → 새 locked 값 맵
 */
export function computeLockChanges(
  id: string,
  locked: boolean,
  recursive: boolean,
  nodeMap: ReadonlyMap<string, LayerNode>,
): Map<string, boolean> {
  const changes = new Map<string, boolean>()
  changes.set(id, locked)

  if (recursive) {
    const descendants = getDescendants(id, nodeMap)
    for (const desc of descendants) {
      changes.set(desc.id, locked)
    }
  }

  return changes
}

/**
 * 특정 노드의 effective lock 계산.
 * 자신이 lock 이거나 조상 중 하나라도 lock 이면 true.
 *
 * UI 에서 그레이아웃 처리에 사용한다.
 */
export function getEffectiveLock(id: string, nodeMap: ReadonlyMap<string, LayerNode>): boolean {
  let current = nodeMap.get(id)
  while (current !== undefined) {
    if (current.locked) return true
    if (current.parentId === null) break
    current = nodeMap.get(current.parentId)
  }
  return false
}
