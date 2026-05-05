// ─────────────────────────────────────────────
// MoveLayerCommand — 레이어 이동 (z-order + 부모 변경)
// ─────────────────────────────────────────────

import type { LayerTree } from '@storywork/editor-layers'

import type { Command } from '../../types.js'

export type MoveLayerCommandOptions = {
  layerTree: LayerTree
  id: string
  fromIndex: number
  fromParentId: string | null
  toIndex: number
  toParentId: string | null
}

/**
 * MoveLayerCommand — LayerTree.moveTo() 의 Command 래퍼.
 *
 * do()  → moveTo(id, toIndex, toParentId)
 * undo() → moveTo(id, fromIndex, fromParentId)
 */
export class MoveLayerCommand implements Command {
  readonly name = 'layers:move'
  readonly timestamp: number

  private readonly _layerTree: LayerTree
  private readonly _id: string
  private readonly _fromIndex: number
  private readonly _fromParentId: string | null
  private readonly _toIndex: number
  private readonly _toParentId: string | null

  constructor(opts: MoveLayerCommandOptions) {
    this._layerTree = opts.layerTree
    this._id = opts.id
    this._fromIndex = opts.fromIndex
    this._fromParentId = opts.fromParentId
    this._toIndex = opts.toIndex
    this._toParentId = opts.toParentId
    this.timestamp = Date.now()
  }

  do(): void {
    this._layerTree.moveTo(this._id, this._toIndex, this._toParentId)
  }

  undo(): void {
    this._layerTree.moveTo(this._id, this._fromIndex, this._fromParentId)
  }
}
