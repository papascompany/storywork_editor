// ─────────────────────────────────────────────
// reorder — z-order 알고리즘
// ─────────────────────────────────────────────

import type { LayerNode } from '../types.js'

/**
 * 배열에서 id 를 찾아 toIndex 위치로 이동.
 * 반환값: 변경된 새 배열 (원본 불변)
 */
export function moveInArray<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return arr
  const next = [...arr]
  const [item] = next.splice(fromIndex, 1)
  if (item === undefined) return arr
  next.splice(toIndex, 0, item)
  return next
}

/**
 * 부모의 childrenIds 또는 rootOrder 에서 id 를 toIndex 로 이동
 * sibling 배열을 직접 수정 (immutable 버전이 필요하면 moveInArray 사용)
 */
export function reorderInSiblings(id: string, toIndex: number, siblings: string[]): string[] {
  const fromIndex = siblings.indexOf(id)
  if (fromIndex === -1) return siblings
  const clampedIndex = Math.max(0, Math.min(toIndex, siblings.length - 1))
  return moveInArray(siblings, fromIndex, clampedIndex)
}

/**
 * 형제 배열에서 한 칸 앞으로(상위 z-order, 배열 인덱스 증가)
 */
export function bringForwardInSiblings(id: string, siblings: string[]): string[] {
  const idx = siblings.indexOf(id)
  if (idx === -1 || idx >= siblings.length - 1) return siblings
  return moveInArray(siblings, idx, idx + 1)
}

/**
 * 형제 배열에서 한 칸 뒤로(하위 z-order, 배열 인덱스 감소)
 */
export function sendBackwardInSiblings(id: string, siblings: string[]): string[] {
  const idx = siblings.indexOf(id)
  if (idx <= 0) return siblings
  return moveInArray(siblings, idx, idx - 1)
}

/**
 * 형제 배열에서 맨 앞으로(최상위 z-order)
 */
export function bringToFrontInSiblings(id: string, siblings: string[]): string[] {
  const idx = siblings.indexOf(id)
  if (idx === -1 || idx === siblings.length - 1) return siblings
  return moveInArray(siblings, idx, siblings.length - 1)
}

/**
 * 형제 배열에서 맨 뒤로(최하위 z-order)
 */
export function sendToBackInSiblings(id: string, siblings: string[]): string[] {
  const idx = siblings.indexOf(id)
  if (idx <= 0) return siblings
  return moveInArray(siblings, idx, 0)
}

/**
 * LayerNode 의 부모 찾기 (parentId 또는 rootOrder 판별)
 */
export function getSiblingOrder(
  node: LayerNode,
  rootOrder: string[],
  nodeMap: ReadonlyMap<string, LayerNode>,
): string[] {
  if (node.parentId === null) {
    return rootOrder
  }
  const parent = nodeMap.get(node.parentId)
  if (!parent) return rootOrder
  return parent.childrenIds
}
