// ─────────────────────────────────────────────
// LayerTree — 레이어 트리 메인 클래스
// ─────────────────────────────────────────────

import type { StoryCanvas, Unsubscribe } from '@storywork/editor-core'
import mitt from 'mitt'
import { nanoid } from 'nanoid'

import { computeGroupOperation } from '../group/group.js'
import { computeUngroupOperation } from '../group/ungroup.js'
import { deserializeTree } from '../serialize/fromJson.js'
import { serializeTree } from '../serialize/toJson.js'
import { computeLockChanges, getEffectiveLock } from '../state/lock.js'
import { computeVisibilityChanges, getEffectiveHidden } from '../state/visibility.js'
import {
  applyHiddenToFabricObject,
  applyLockToFabricObject,
  syncZOrderToFabric,
} from '../sync/fabric-bridge.js'
import type {
  LayerEvent,
  LayerEventMap,
  LayerNode,
  LayerNodeJson,
  LayerUnsubscribe,
} from '../types.js'

import {
  bringForwardInSiblings,
  bringToFrontInSiblings,
  reorderInSiblings,
  sendBackwardInSiblings,
  sendToBackInSiblings,
} from './reorder.js'
import { getAncestors, getDescendants, getRootNodes } from './traverse.js'

export type LayerTreeOptions = {
  canvas: StoryCanvas
}

/**
 * LayerTree — fabric.js 레이어 트리 관리 클래스.
 *
 * 책임:
 * - 레이어 노드(LayerNode) 의 트리 구조 관리
 * - z-order 조작 (moveTo / bringForward / sendBackward 등)
 * - 그룹/언그룹 (group / ungroup)
 * - 잠금/숨김 전파 (setLock / setHidden, recursive 옵션)
 * - editor-core 의 이벤트를 구독해 자동 동기화
 * - fabric Canvas 의 z-order / visibility / lock 상태를 동기화
 *
 * 비책임: UI, 단축키, 영속화
 */
export class LayerTree {
  private readonly _canvas: StoryCanvas
  private readonly _nodeMap: Map<string, LayerNode> = new Map()
  /** root 레벨의 z-order 배열 (인덱스 0 = 최하위, 마지막 = 최상위) */
  private _rootOrder: string[] = []
  private readonly _emitter = mitt<LayerEventMap>()
  private readonly _coreUnsubscribers: Unsubscribe[] = []

  constructor(opts: LayerTreeOptions) {
    this._canvas = opts.canvas
    this._bindCoreEvents()
  }

  // ─────────────────────────────────────────────
  // 트리 조회
  // ─────────────────────────────────────────────

  getRootNodes(): LayerNode[] {
    return getRootNodes(this._rootOrder, this._nodeMap)
  }

  getNode(id: string): LayerNode | undefined {
    return this._nodeMap.get(id)
  }

  getChildren(id: string): LayerNode[] {
    const node = this._nodeMap.get(id)
    if (!node) return []
    return node.childrenIds
      .map((cid) => this._nodeMap.get(cid))
      .filter((n): n is LayerNode => n !== undefined)
  }

  getAncestors(id: string): LayerNode[] {
    return getAncestors(id, this._nodeMap)
  }

  getDescendants(id: string): LayerNode[] {
    return getDescendants(id, this._nodeMap)
  }

  /**
   * 특정 노드의 effective lock (자신 또는 조상이 잠긴 경우 true)
   * UI 에서 그레이아웃 처리에 사용한다.
   */
  getEffectiveLock(id: string): boolean {
    return getEffectiveLock(id, this._nodeMap)
  }

  /**
   * 특정 노드의 effective hidden (자신 또는 조상이 숨겨진 경우 true)
   */
  getEffectiveHidden(id: string): boolean {
    return getEffectiveHidden(id, this._nodeMap)
  }

  // ─────────────────────────────────────────────
  // 추가/제거
  // ─────────────────────────────────────────────

  /**
   * 레이어 노드를 추가한다.
   * editor-core 의 object:added 이벤트 처리에서 자동 호출되거나, 수동 호출도 가능.
   *
   * @param node 추가할 노드 (id, kind 필수)
   * @param parentId 부모 노드 id (null 또는 미지정 시 root)
   */
  add(
    node: Omit<LayerNode, 'parentId' | 'childrenIds' | 'locked' | 'hidden'> &
      Partial<Pick<LayerNode, 'parentId' | 'childrenIds' | 'locked' | 'hidden'>>,
    parentId?: string | null,
  ): void {
    const resolvedParentId = parentId ?? node.parentId ?? null
    const newNode: LayerNode = {
      id: node.id,
      kind: node.kind,
      parentId: resolvedParentId,
      childrenIds: node.childrenIds ?? [],
      locked: node.locked ?? false,
      hidden: node.hidden ?? false,
      name: node.name,
    }

    this._nodeMap.set(newNode.id, newNode)

    if (resolvedParentId === null) {
      // root 에 추가 (맨 위 z-order = 배열 끝)
      this._rootOrder = [...this._rootOrder, newNode.id]
    } else {
      const parent = this._nodeMap.get(resolvedParentId)
      if (parent) {
        const updatedParent: LayerNode = {
          ...parent,
          childrenIds: [...parent.childrenIds, newNode.id],
        }
        this._nodeMap.set(resolvedParentId, updatedParent)
      }
    }

    this._emitter.emit('tree:changed', { kind: 'add', ids: [newNode.id] })
  }

  /**
   * 레이어 노드를 제거한다.
   * 자식이 그룹 안에 있으면 부모도 비어있는지 검사 → 비면 그룹 자동 제거.
   */
  remove(id: string): void {
    const node = this._nodeMap.get(id)
    if (!node) return

    // 자손 먼저 제거
    const descendants = getDescendants(id, this._nodeMap)
    for (const desc of descendants) {
      this._nodeMap.delete(desc.id)
    }

    // 자신 제거
    this._nodeMap.delete(id)

    // 부모에서 자신 제거
    if (node.parentId !== null) {
      const parent = this._nodeMap.get(node.parentId)
      if (parent) {
        const updatedParent: LayerNode = {
          ...parent,
          childrenIds: parent.childrenIds.filter((cid) => cid !== id),
        }
        this._nodeMap.set(node.parentId, updatedParent)

        // 부모 그룹이 비어있으면 자동 언그룹(제거)
        if (updatedParent.kind === 'group' && updatedParent.childrenIds.length === 0) {
          this.remove(node.parentId)
          return
        }
      }
    } else {
      this._rootOrder = this._rootOrder.filter((rid) => rid !== id)
    }

    this._emitter.emit('tree:changed', { kind: 'remove', ids: [id] })
  }

  // ─────────────────────────────────────────────
  // z-order
  // ─────────────────────────────────────────────

  /**
   * 노드를 특정 인덱스로 이동한다.
   * @param parentId null 이면 root 수준, 미지정이면 현재 부모 유지
   */
  moveTo(id: string, toIndex: number, parentId?: string | null): void {
    const node = this._nodeMap.get(id)
    if (!node) return

    const targetParentId = parentId !== undefined ? parentId : node.parentId

    if (targetParentId !== node.parentId) {
      // 부모 변경: 기존 부모에서 제거 후 새 부모에 추가
      this._detachFromParent(id, node)
      this._attachToParent(id, targetParentId, toIndex)
    } else {
      // 동일 부모 내 이동
      this._reorderInCurrentParent(id, node, toIndex)
    }

    // fabric z-order 동기화
    syncZOrderToFabric(this._rootOrder, this._canvas)
    this._emitter.emit('tree:changed', { kind: 'move', ids: [id] })
  }

  bringForward(id: string): void {
    const node = this._nodeMap.get(id)
    if (!node) return
    this._modifySiblings(id, node, bringForwardInSiblings)
    syncZOrderToFabric(this._rootOrder, this._canvas)
    this._emitter.emit('tree:changed', { kind: 'move', ids: [id] })
  }

  sendBackward(id: string): void {
    const node = this._nodeMap.get(id)
    if (!node) return
    this._modifySiblings(id, node, sendBackwardInSiblings)
    syncZOrderToFabric(this._rootOrder, this._canvas)
    this._emitter.emit('tree:changed', { kind: 'move', ids: [id] })
  }

  bringToFront(id: string): void {
    const node = this._nodeMap.get(id)
    if (!node) return
    this._modifySiblings(id, node, bringToFrontInSiblings)
    syncZOrderToFabric(this._rootOrder, this._canvas)
    this._emitter.emit('tree:changed', { kind: 'move', ids: [id] })
  }

  sendToBack(id: string): void {
    const node = this._nodeMap.get(id)
    if (!node) return
    this._modifySiblings(id, node, sendToBackInSiblings)
    syncZOrderToFabric(this._rootOrder, this._canvas)
    this._emitter.emit('tree:changed', { kind: 'move', ids: [id] })
  }

  // ─────────────────────────────────────────────
  // 그룹
  // ─────────────────────────────────────────────

  /**
   * 여러 노드를 하나의 group 으로 묶는다.
   * @returns 새로 생성된 group node id
   */
  group(ids: string[], name?: string): string {
    if (ids.length < 2) {
      throw new Error('[editor-layers] group: 최소 2개 이상의 노드가 필요합니다.')
    }

    // 모든 ids 가 동일 부모(또는 root)에 있는지 확인
    const firstNode = this._nodeMap.get(ids[0] ?? '')
    const commonParentId = firstNode?.parentId ?? null
    for (const id of ids) {
      const n = this._nodeMap.get(id)
      if (!n) throw new Error(`[editor-layers] group: 노드 '${id}' 를 찾을 수 없습니다.`)
      if (n.parentId !== commonParentId) {
        throw new Error('[editor-layers] group: 모든 노드가 동일한 부모에 있어야 합니다.')
      }
    }

    const siblings =
      commonParentId === null
        ? this._rootOrder
        : (this._nodeMap.get(commonParentId)?.childrenIds ?? [])

    const groupId = nanoid()
    const result = computeGroupOperation(ids, groupId, siblings, this._nodeMap, name)

    // nodeMap 업데이트: 자식들의 parentId 변경
    for (const child of result.updatedChildren) {
      this._nodeMap.set(child.id, child)
    }

    // nodeMap 에 group 노드 추가
    this._nodeMap.set(groupId, result.groupNode)

    // 형제 배열에서 ids 제거 후 groupId 삽입
    if (commonParentId === null) {
      const withoutIds = this._rootOrder.filter((rid) => !ids.includes(rid))
      const insertIdx = Math.min(result.insertIndex, withoutIds.length)
      this._rootOrder = [...withoutIds.slice(0, insertIdx), groupId, ...withoutIds.slice(insertIdx)]
    } else {
      const parent = this._nodeMap.get(commonParentId)
      if (parent) {
        const withoutIds = parent.childrenIds.filter((cid) => !ids.includes(cid))
        const insertIdx = Math.min(result.insertIndex, withoutIds.length)
        const newChildrenIds = [
          ...withoutIds.slice(0, insertIdx),
          groupId,
          ...withoutIds.slice(insertIdx),
        ]
        this._nodeMap.set(commonParentId, { ...parent, childrenIds: newChildrenIds })
      }
    }

    syncZOrderToFabric(this._rootOrder, this._canvas)
    this._emitter.emit('tree:changed', { kind: 'group', ids: [groupId, ...ids] })
    return groupId
  }

  /**
   * group 노드를 평탄화한다.
   * @returns 평탄화된 자식 노드 ids
   */
  ungroup(groupId: string): string[] {
    const group = this._nodeMap.get(groupId)
    if (!group) throw new Error(`[editor-layers] ungroup: 그룹 '${groupId}' 를 찾을 수 없습니다.`)
    if (group.kind !== 'group') {
      throw new Error(`[editor-layers] ungroup: '${groupId}' 는 group 노드가 아닙니다.`)
    }

    const siblings =
      group.parentId === null
        ? this._rootOrder
        : (this._nodeMap.get(group.parentId)?.childrenIds ?? [])

    const result = computeUngroupOperation(groupId, siblings, this._nodeMap)

    // 자식들의 parentId 를 group 의 parentId 로 업데이트
    for (const child of result.restoredChildren) {
      this._nodeMap.set(child.id, child)
    }

    // group 제거
    this._nodeMap.delete(groupId)

    // 형제 배열에서 groupId 를 자식 ids 로 교체
    const childIds = result.restoredChildren.map((c) => c.id)
    if (group.parentId === null) {
      const withoutGroup = this._rootOrder.filter((rid) => rid !== groupId)
      const insertIdx = Math.max(0, result.insertIndex)
      this._rootOrder = [
        ...withoutGroup.slice(0, insertIdx),
        ...childIds,
        ...withoutGroup.slice(insertIdx),
      ]
    } else {
      const parent = this._nodeMap.get(group.parentId)
      if (parent) {
        const withoutGroup = parent.childrenIds.filter((cid) => cid !== groupId)
        const insertIdx = Math.max(0, result.insertIndex)
        const newChildrenIds = [
          ...withoutGroup.slice(0, insertIdx),
          ...childIds,
          ...withoutGroup.slice(insertIdx),
        ]
        this._nodeMap.set(group.parentId, { ...parent, childrenIds: newChildrenIds })
      }
    }

    syncZOrderToFabric(this._rootOrder, this._canvas)
    this._emitter.emit('tree:changed', { kind: 'ungroup', ids: [groupId, ...childIds] })
    return childIds
  }

  // ─────────────────────────────────────────────
  // 상태 (lock / hidden / rename)
  // ─────────────────────────────────────────────

  /**
   * 잠금 상태 설정.
   * @param recursive true 이면 자손도 같이 변경
   */
  setLock(id: string, locked: boolean, recursive = false): void {
    const changes = computeLockChanges(id, locked, recursive, this._nodeMap)
    for (const [nodeId, lockedVal] of changes) {
      const node = this._nodeMap.get(nodeId)
      if (!node) continue
      this._nodeMap.set(nodeId, { ...node, locked: lockedVal })

      // fabric 객체에도 반영
      const fabricObj = this._canvas.getObject(nodeId)
      if (fabricObj) applyLockToFabricObject(fabricObj, lockedVal)
    }
    this._emitter.emit('state:changed', { kind: 'lock', ids: [...changes.keys()] })
  }

  /**
   * 숨김 상태 설정.
   * @param recursive true 이면 자손도 같이 변경
   */
  setHidden(id: string, hidden: boolean, recursive = false): void {
    const changes = computeVisibilityChanges(id, hidden, recursive, this._nodeMap)
    for (const [nodeId, hiddenVal] of changes) {
      const node = this._nodeMap.get(nodeId)
      if (!node) continue
      this._nodeMap.set(nodeId, { ...node, hidden: hiddenVal })

      // fabric 객체에도 반영
      const fabricObj = this._canvas.getObject(nodeId)
      if (fabricObj) applyHiddenToFabricObject(fabricObj, hiddenVal)
    }
    this._canvas._fabricCanvas.requestRenderAll()
    this._emitter.emit('state:changed', { kind: 'visibility', ids: [...changes.keys()] })
  }

  rename(id: string, name: string): void {
    const node = this._nodeMap.get(id)
    if (!node) return
    this._nodeMap.set(id, { ...node, name })
    this._emitter.emit('state:changed', { kind: 'rename', ids: [id] })
  }

  // ─────────────────────────────────────────────
  // 직렬화
  // ─────────────────────────────────────────────

  toJson(): LayerNodeJson[] {
    return serializeTree(this._rootOrder, this._nodeMap)
  }

  loadJson(nodes: LayerNodeJson[]): void {
    const { nodeMap, rootOrder } = deserializeTree(nodes)
    this._nodeMap.clear()
    for (const [k, v] of nodeMap) {
      this._nodeMap.set(k, v)
    }
    this._rootOrder = rootOrder

    // fabric 상태 동기화
    syncZOrderToFabric(this._rootOrder, this._canvas)
    for (const node of this._nodeMap.values()) {
      const obj = this._canvas.getObject(node.id)
      if (obj) {
        applyLockToFabricObject(obj, node.locked)
        applyHiddenToFabricObject(obj, node.hidden)
      }
    }
    this._canvas._fabricCanvas.requestRenderAll()
    this._emitter.emit('tree:changed', { kind: 'add', ids: rootOrder })
  }

  // ─────────────────────────────────────────────
  // 이벤트
  // ─────────────────────────────────────────────

  on<K extends LayerEvent>(event: K, handler: (e: LayerEventMap[K]) => void): LayerUnsubscribe {
    this._emitter.on(event, handler)
    return () => this._emitter.off(event, handler)
  }

  // ─────────────────────────────────────────────
  // 수명
  // ─────────────────────────────────────────────

  dispose(): void {
    for (const unsub of this._coreUnsubscribers) {
      unsub()
    }
    this._coreUnsubscribers.length = 0
    this._nodeMap.clear()
    this._rootOrder = []
    this._emitter.all.clear()
  }

  // ─────────────────────────────────────────────
  // 내부 구현
  // ─────────────────────────────────────────────

  /**
   * editor-core 이벤트를 구독해 LayerTree 를 자동 동기화한다.
   */
  private _bindCoreEvents(): void {
    const unsubAdded = this._canvas.on('object:added', ({ id, data }) => {
      // 이미 트리에 있으면(예: loadJson 후 재add) 중복 추가 방지
      if (this._nodeMap.has(id)) return
      this.add({ id, kind: data.kind, name: undefined })
    })

    const unsubRemoved = this._canvas.on('object:removed', ({ id }) => {
      if (this._nodeMap.has(id)) {
        this.remove(id)
      }
    })

    const unsubSelection = this._canvas.on('selection:changed', ({ ids }) => {
      this._emitter.emit('selection:changed', { ids })
    })

    this._coreUnsubscribers.push(unsubAdded, unsubRemoved, unsubSelection)
  }

  /**
   * 형제 배열을 변경 함수로 수정 (rootOrder 또는 부모의 childrenIds)
   */
  private _modifySiblings(
    id: string,
    node: LayerNode,
    fn: (id: string, siblings: string[]) => string[],
  ): void {
    if (node.parentId === null) {
      this._rootOrder = fn(id, this._rootOrder)
    } else {
      const parent = this._nodeMap.get(node.parentId)
      if (parent) {
        const newChildrenIds = fn(id, parent.childrenIds)
        this._nodeMap.set(node.parentId, { ...parent, childrenIds: newChildrenIds })
      }
    }
  }

  /**
   * 현재 부모 안에서 z-order 만 변경
   */
  private _reorderInCurrentParent(id: string, node: LayerNode, toIndex: number): void {
    if (node.parentId === null) {
      this._rootOrder = reorderInSiblings(id, toIndex, this._rootOrder)
    } else {
      const parent = this._nodeMap.get(node.parentId)
      if (parent) {
        const newChildrenIds = reorderInSiblings(id, toIndex, parent.childrenIds)
        this._nodeMap.set(node.parentId, { ...parent, childrenIds: newChildrenIds })
      }
    }
  }

  /**
   * 노드를 현재 부모에서 분리
   */
  private _detachFromParent(id: string, node: LayerNode): void {
    if (node.parentId === null) {
      this._rootOrder = this._rootOrder.filter((rid) => rid !== id)
    } else {
      const parent = this._nodeMap.get(node.parentId)
      if (parent) {
        this._nodeMap.set(node.parentId, {
          ...parent,
          childrenIds: parent.childrenIds.filter((cid) => cid !== id),
        })
      }
    }
  }

  /**
   * 노드를 새 부모(또는 root)에 연결
   */
  private _attachToParent(id: string, parentId: string | null, toIndex: number): void {
    const node = this._nodeMap.get(id)
    if (!node) return

    const updatedNode: LayerNode = { ...node, parentId }
    this._nodeMap.set(id, updatedNode)

    if (parentId === null) {
      const clampedIndex = Math.max(0, Math.min(toIndex, this._rootOrder.length))
      this._rootOrder = [
        ...this._rootOrder.slice(0, clampedIndex),
        id,
        ...this._rootOrder.slice(clampedIndex),
      ]
    } else {
      const parent = this._nodeMap.get(parentId)
      if (parent) {
        const clampedIndex = Math.max(0, Math.min(toIndex, parent.childrenIds.length))
        const newChildrenIds = [
          ...parent.childrenIds.slice(0, clampedIndex),
          id,
          ...parent.childrenIds.slice(clampedIndex),
        ]
        this._nodeMap.set(parentId, { ...parent, childrenIds: newChildrenIds })
      }
    }
  }
}
