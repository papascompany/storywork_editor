// ─────────────────────────────────────────────
// fromJson — LayerNodeJson[] → LayerTree 내부 상태
// ─────────────────────────────────────────────

import type { LayerNode, LayerNodeJson } from '../types.js'

export type DeserializedTree = {
  nodeMap: Map<string, LayerNode>
  rootOrder: string[]
}

/**
 * LayerNodeJson[] 를 flat nodeMap + rootOrder 로 변환 (재귀)
 */
function parseNode(
  json: LayerNodeJson,
  parentId: string | null,
  nodeMap: Map<string, LayerNode>,
): void {
  const childrenIds = (json.children ?? []).map((c) => c.id)

  const node: LayerNode = {
    id: json.id,
    kind: json.kind,
    parentId,
    childrenIds,
    locked: json.locked ?? false,
    hidden: json.hidden ?? false,
    name: json.name,
  }

  nodeMap.set(json.id, node)

  // 재귀적으로 자식 처리
  for (const child of json.children ?? []) {
    parseNode(child, json.id, nodeMap)
  }
}

/**
 * LayerNodeJson[] 를 파싱하여 내부 상태로 변환
 */
export function deserializeTree(nodes: LayerNodeJson[]): DeserializedTree {
  const nodeMap = new Map<string, LayerNode>()
  const rootOrder: string[] = []

  for (const json of nodes) {
    rootOrder.push(json.id)
    parseNode(json, null, nodeMap)
  }

  return { nodeMap, rootOrder }
}
