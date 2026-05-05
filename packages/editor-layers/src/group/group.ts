// ─────────────────────────────────────────────
// group — 다중 객체 → group node
// ─────────────────────────────────────────────

import type { LayerNode } from '../types.js'

export type GroupResult = {
  /** 새로 생성된 group 노드 */
  groupNode: LayerNode
  /**
   * 그룹화된 자식 노드들 (parentId 가 groupNode.id 로 업데이트됨)
   * 호출자가 nodeMap 에 반영해야 한다.
   */
  updatedChildren: LayerNode[]
  /**
   * rootOrder 또는 부모 childrenIds 에서 ids 를 group id 로 교체하는
   * 최소 인덱스(삽입 위치). -1 이면 끝에 붙인다.
   */
  insertIndex: number
}

/**
 * 여러 레이어를 하나의 group 으로 묶는 계산.
 * 실제 상태 변경은 호출자(LayerTree)가 수행한다.
 *
 * 규칙:
 * - 모든 ids 는 동일 부모(또는 동일 루트) 소속이어야 한다.
 * - 그룹 노드는 가장 낮은 z-order 위치(siblings 에서 최소 인덱스)에 삽입된다.
 * - 그룹 자체는 locked=false, hidden=false 로 시작한다.
 *
 * @param ids 그룹화할 노드 id 목록
 * @param groupId 새 group 노드 id (외부에서 생성된 nanoid)
 * @param siblings 현재 형제 배열 (rootOrder 또는 부모 childrenIds)
 * @param nodeMap 현재 전체 노드 맵
 * @param name 선택적 그룹 이름
 */
export function computeGroupOperation(
  ids: string[],
  groupId: string,
  siblings: readonly string[],
  nodeMap: ReadonlyMap<string, LayerNode>,
  name?: string,
): GroupResult {
  if (ids.length < 2) {
    throw new Error('[editor-layers] group: 최소 2개 이상의 노드가 필요합니다.')
  }

  // 최소 인덱스(z-order 에서 가장 낮은 위치) 찾기
  let minIndex = Infinity
  for (const id of ids) {
    const idx = siblings.indexOf(id)
    if (idx !== -1 && idx < minIndex) {
      minIndex = idx
    }
  }
  if (!isFinite(minIndex)) {
    minIndex = siblings.length
  }

  const groupNode: LayerNode = {
    id: groupId,
    kind: 'group',
    parentId: nodeMap.get(ids[0] ?? '')?.parentId ?? null,
    childrenIds: [...ids],
    locked: false,
    hidden: false,
    name,
  }

  const updatedChildren: LayerNode[] = ids.map((id) => {
    const node = nodeMap.get(id)
    if (!node) {
      throw new Error(`[editor-layers] group: 노드 '${id}' 를 찾을 수 없습니다.`)
    }
    return { ...node, parentId: groupId }
  })

  return { groupNode, updatedChildren, insertIndex: minIndex }
}
