// ─────────────────────────────────────────────
// GroupCommand — 여러 레이어 → 그룹
// ─────────────────────────────────────────────

import type { LayerTree } from '@storywork/editor-layers'

import type { Command } from '../../types.js'

export type GroupCommandOptions = {
  layerTree: LayerTree
  ids: string[]
  name?: string
}

/**
 * GroupCommand — LayerTree.group() 의 Command 래퍼.
 *
 * do()  → group(ids)  → groupId 저장
 * undo() → ungroup(groupId)
 */
export class GroupCommand implements Command {
  readonly name = 'layers:group'
  readonly timestamp: number

  private readonly _layerTree: LayerTree
  private readonly _ids: string[]
  private readonly _groupName?: string
  private _groupId: string | null = null

  constructor(opts: GroupCommandOptions) {
    this._layerTree = opts.layerTree
    this._ids = [...opts.ids]
    this._groupName = opts.name
    this.timestamp = Date.now()
  }

  do(): void {
    // 존재하는 노드만 그룹화 (redo 시 일부가 제거된 경우 방어)
    const existingIds = this._ids.filter((id) => this._layerTree.getNode(id) !== undefined)
    if (existingIds.length < 2) {
      // 그룹화할 노드가 2개 미만이면 skip
      return
    }
    this._groupId = this._layerTree.group(existingIds, this._groupName)
  }

  undo(): void {
    if (this._groupId === null) return
    // 그룹이 다른 command 에 의해 이미 해제된 경우 graceful skip
    const node = this._layerTree.getNode(this._groupId)
    if (!node || node.kind !== 'group') {
      this._groupId = null
      return
    }
    this._layerTree.ungroup(this._groupId)
    this._groupId = null
  }

  get groupId(): string | null {
    return this._groupId
  }
}
