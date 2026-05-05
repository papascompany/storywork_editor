// ─────────────────────────────────────────────
// traverse — DFS/BFS, find, ancestors, descendants
// ─────────────────────────────────────────────

import type { LayerNode } from '../types.js'

/**
 * DFS 순회 (전위: 자신 → 자식)
 */
export function* dfs(id: string, nodeMap: ReadonlyMap<string, LayerNode>): Generator<LayerNode> {
  const node = nodeMap.get(id)
  if (!node) return
  yield node
  for (const childId of node.childrenIds) {
    yield* dfs(childId, nodeMap)
  }
}

/**
 * BFS 순회 (레벨 순서)
 */
export function* bfs(id: string, nodeMap: ReadonlyMap<string, LayerNode>): Generator<LayerNode> {
  const queue: string[] = [id]
  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) continue
    const node = nodeMap.get(current)
    if (!node) continue
    yield node
    queue.push(...node.childrenIds)
  }
}

/**
 * id 에서 root 까지 조상 목록 반환 (가까운 부모부터)
 */
export function getAncestors(id: string, nodeMap: ReadonlyMap<string, LayerNode>): LayerNode[] {
  const ancestors: LayerNode[] = []
  let current = nodeMap.get(id)
  while (current?.parentId != null) {
    const parent = nodeMap.get(current.parentId)
    if (!parent) break
    ancestors.push(parent)
    current = parent
  }
  return ancestors
}

/**
 * id 의 모든 자손 목록 반환 (DFS 순서, 자신 제외)
 */
export function getDescendants(id: string, nodeMap: ReadonlyMap<string, LayerNode>): LayerNode[] {
  const node = nodeMap.get(id)
  if (!node) return []
  const result: LayerNode[] = []
  for (const childId of node.childrenIds) {
    for (const desc of dfs(childId, nodeMap)) {
      result.push(desc)
    }
  }
  return result
}

/**
 * root 노드 목록 (parentId === null) 을 z-order 배열에서 순서대로 반환
 */
export function getRootNodes(
  rootOrder: readonly string[],
  nodeMap: ReadonlyMap<string, LayerNode>,
): LayerNode[] {
  return rootOrder.map((id) => nodeMap.get(id)).filter((n): n is LayerNode => n !== undefined)
}

/**
 * 특정 노드가 다른 노드의 자손인지 확인 (순환 참조 방지용)
 */
export function isDescendant(
  candidateId: string,
  ancestorId: string,
  nodeMap: ReadonlyMap<string, LayerNode>,
): boolean {
  let current = nodeMap.get(candidateId)
  while (current?.parentId != null) {
    if (current.parentId === ancestorId) return true
    current = nodeMap.get(current.parentId)
  }
  return false
}
