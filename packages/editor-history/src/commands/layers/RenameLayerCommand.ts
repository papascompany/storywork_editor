// ─────────────────────────────────────────────
// RenameLayerCommand — 레이어 이름 변경
// ─────────────────────────────────────────────

import type { LayerTree } from '@storywork/editor-layers'

import type { Command } from '../../types.js'

export type RenameLayerCommandOptions = {
  layerTree: LayerTree
  id: string
  prevName: string | undefined
  nextName: string
}

/**
 * RenameLayerCommand — LayerTree.rename() 의 Command 래퍼.
 *
 * do()  → rename(id, nextName)
 * undo() → rename(id, prevName) / prevName 이 undefined 이면 '' 로 복원
 */
export class RenameLayerCommand implements Command {
  readonly name = 'layers:rename'
  readonly timestamp: number

  private readonly _layerTree: LayerTree
  private readonly _id: string
  private readonly _prevName: string | undefined
  private readonly _nextName: string

  constructor(opts: RenameLayerCommandOptions) {
    this._layerTree = opts.layerTree
    this._id = opts.id
    this._prevName = opts.prevName
    this._nextName = opts.nextName
    this.timestamp = Date.now()
  }

  do(): void {
    this._layerTree.rename(this._id, this._nextName)
  }

  undo(): void {
    this._layerTree.rename(this._id, this._prevName ?? '')
  }
}
