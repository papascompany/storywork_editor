// ─────────────────────────────────────────────
// ungroup — group → 평탄화 + 위치 보존
// ─────────────────────────────────────────────

import type { LayerNode } from '../types.js'

export type UngroupResult = {
  /** 평탄화될 자식 노드들 (parentId 가 group 의 parentId 로 업데이트됨) */
  restoredChildren: LayerNode[]
  /** 형제 배열에서 group id 가 있던 인덱스 (자식들을 여기에 삽입) */
  insertIndex: number
}

/**
 * group 노드를 평탄화하는 계산.
 * 실제 상태 변경은 호출자(LayerTree)가 수행한다.
 *
 * 규칙:
 * - 자식들은 그룹이 있던 위치에 순서대로 삽입된다.
 * - 자식들의 parentId 는 group 의 parentId 를 상속한다.
 * - group 이 비어 있으면 그냥 제거한다.
 *
 * @param groupId 언그룹 대상 id
 * @param siblings 현재 형제 배열
 * @param nodeMap 현재 전체 노드 맵
 */
export function computeUngroupOperation(
  groupId: string,
  siblings: readonly string[],
  nodeMap: ReadonlyMap<string, LayerNode>,
): UngroupResult {
  const group = nodeMap.get(groupId)
  if (!group) {
    throw new Error(`[editor-layers] ungroup: 그룹 '${groupId}' 를 찾을 수 없습니다.`)
  }
  if (group.kind !== 'group') {
    throw new Error(`[editor-layers] ungroup: '${groupId}' 는 group 노드가 아닙니다.`)
  }

  const insertIndex = siblings.indexOf(groupId)
  const newParentId = group.parentId

  const restoredChildren: LayerNode[] = group.childrenIds.map((childId) => {
    const child = nodeMap.get(childId)
    if (!child) {
      throw new Error(`[editor-layers] ungroup: 자식 노드 '${childId}' 를 찾을 수 없습니다.`)
    }
    return { ...child, parentId: newParentId }
  })

  return { restoredChildren, insertIndex }
}
