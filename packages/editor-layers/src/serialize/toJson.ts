// ─────────────────────────────────────────────
// toJson — LayerTree → LayerNodeJson[]
// ─────────────────────────────────────────────

import type { LayerNode, LayerNodeJson } from '../types.js'

/**
 * 단일 LayerNode → LayerNodeJson 변환 (재귀)
 */
function nodeToJson(id: string, nodeMap: ReadonlyMap<string, LayerNode>): LayerNodeJson | null {
  const node = nodeMap.get(id)
  if (!node) return null

  const json: LayerNodeJson = {
    v: 1,
    id: node.id,
    kind: node.kind,
  }

  if (node.locked) json.locked = true
  if (node.hidden) json.hidden = true
  if (node.name !== undefined) json.name = node.name

  if (node.childrenIds.length > 0) {
    const children: LayerNodeJson[] = []
    for (const childId of node.childrenIds) {
      const child = nodeToJson(childId, nodeMap)
      if (child) children.push(child)
    }
    if (children.length > 0) json.children = children
  }

  return json
}

/**
 * rootOrder 기준으로 전체 LayerNodeJson[] 생성
 */
export function serializeTree(
  rootOrder: readonly string[],
  nodeMap: ReadonlyMap<string, LayerNode>,
): LayerNodeJson[] {
  const result: LayerNodeJson[] = []
  for (const id of rootOrder) {
    const json = nodeToJson(id, nodeMap)
    if (json) result.push(json)
  }
  return result
}
