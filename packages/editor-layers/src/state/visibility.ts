// ─────────────────────────────────────────────
// visibility — 숨김 상태 전파 로직
// ─────────────────────────────────────────────

import { getDescendants } from '../tree/traverse.js'
import type { LayerNode } from '../types.js'

/**
 * 노드와 선택적으로 자손 노드들의 hidden 상태를 변경.
 *
 * @param id 대상 노드 id
 * @param hidden 새 hidden 상태
 * @param recursive true 이면 자손까지 동일하게 변경
 * @param nodeMap 현재 전체 노드 맵 (읽기 전용)
 * @returns 변경된 노드들의 id → 새 hidden 값 맵
 */
export function computeVisibilityChanges(
  id: string,
  hidden: boolean,
  recursive: boolean,
  nodeMap: ReadonlyMap<string, LayerNode>,
): Map<string, boolean> {
  const changes = new Map<string, boolean>()
  changes.set(id, hidden)

  if (recursive) {
    const descendants = getDescendants(id, nodeMap)
    for (const desc of descendants) {
      changes.set(desc.id, hidden)
    }
  }

  return changes
}

/**
 * 특정 노드의 effective visibility 계산.
 * 자신이 hidden 이거나 조상 중 하나라도 hidden 이면 true (실제로 안 보임).
 */
export function getEffectiveHidden(id: string, nodeMap: ReadonlyMap<string, LayerNode>): boolean {
  let current = nodeMap.get(id)
  while (current !== undefined) {
    if (current.hidden) return true
    if (current.parentId === null) break
    current = nodeMap.get(current.parentId)
  }
  return false
}
