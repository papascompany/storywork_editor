// ─────────────────────────────────────────────
// UngroupCommand — 그룹 → 평탄화
// ─────────────────────────────────────────────

import type { LayerNode, LayerTree } from '@storywork/editor-layers'

import type { Command } from '../../types.js'

export type UngroupCommandOptions = {
  layerTree: LayerTree
  groupId: string
  /** do() 전 그룹 노드 스냅샷 (undo 시 name, parentId 등 복원에 사용) */
  groupNodeSnapshot: LayerNode
}

/**
 * UngroupCommand — LayerTree.ungroup() 의 Command 래퍼.
 *
 * do()  → ungroup(groupId) → 자식 ids 저장
 * undo() → group(childIds, groupNodeSnapshot.name) → 기존 groupId 로 재등록은 불가하므로
 *          새 groupId 를 생성한다 (이는 LayerTree.group 의 동작).
 *          실제 협업 시나리오에서는 OT 가 처리하므로 단독 사용에서는 문제 없음.
 */
export class UngroupCommand implements Command {
  readonly name = 'layers:ungroup'
  readonly timestamp: number

  private readonly _layerTree: LayerTree
  private readonly _groupId: string
  private readonly _groupNodeSnapshot: LayerNode
  private _restoredChildIds: string[] | null = null
  private _newGroupId: string | null = null

  constructor(opts: UngroupCommandOptions) {
    this._layerTree = opts.layerTree
    this._groupId = opts.groupId
    this._groupNodeSnapshot = { ...opts.groupNodeSnapshot }
    this.timestamp = Date.now()
  }

  do(): void {
    this._restoredChildIds = this._layerTree.ungroup(this._groupId)
    this._newGroupId = null
  }

  undo(): void {
    if (!this._restoredChildIds || this._restoredChildIds.length < 2) return
    this._newGroupId = this._layerTree.group(this._restoredChildIds, this._groupNodeSnapshot.name)
  }

  get originalGroupId(): string {
    return this._groupId
  }

  get newGroupId(): string | null {
    return this._newGroupId
  }
}
