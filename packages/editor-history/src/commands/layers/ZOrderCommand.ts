// ─────────────────────────────────────────────
// ZOrderCommand — bring/send to front/back/forward/backward 통합
// ─────────────────────────────────────────────

import type { LayerTree } from '@storywork/editor-layers'

import type { Command } from '../../types.js'

export type ZOrderAction = 'bringForward' | 'sendBackward' | 'bringToFront' | 'sendToBack'

export type ZOrderCommandOptions = {
  layerTree: LayerTree
  id: string
  action: ZOrderAction
  /** do() 전 형제 배열 스냅샷 (undo 역방향 계산에 사용) */
  siblingsBefore: readonly string[]
  parentId: string | null
}

/**
 * ZOrderCommand — z-order 변경 4종의 통합 Command.
 *
 * do()  → action 에 따라 bringForward/sendBackward/bringToFront/sendToBack
 * undo() → 형제 배열 스냅샷으로 이전 인덱스를 계산해 moveTo 복원
 *
 * 역방향: siblingsBefore 에서 id 의 인덱스를 찾아 moveTo(prevIndex) 호출.
 */
export class ZOrderCommand implements Command {
  readonly name = 'layers:zorder'
  readonly timestamp: number

  private readonly _layerTree: LayerTree
  private readonly _id: string
  private readonly _action: ZOrderAction
  private readonly _siblingsBefore: readonly string[]
  private readonly _parentId: string | null

  constructor(opts: ZOrderCommandOptions) {
    this._layerTree = opts.layerTree
    this._id = opts.id
    this._action = opts.action
    this._siblingsBefore = opts.siblingsBefore
    this._parentId = opts.parentId
    this.timestamp = Date.now()
  }

  do(): void {
    switch (this._action) {
      case 'bringForward':
        this._layerTree.bringForward(this._id)
        break
      case 'sendBackward':
        this._layerTree.sendBackward(this._id)
        break
      case 'bringToFront':
        this._layerTree.bringToFront(this._id)
        break
      case 'sendToBack':
        this._layerTree.sendToBack(this._id)
        break
    }
  }

  undo(): void {
    const prevIndex = this._siblingsBefore.indexOf(this._id)
    if (prevIndex === -1) return
    this._layerTree.moveTo(this._id, prevIndex, this._parentId)
  }
}
