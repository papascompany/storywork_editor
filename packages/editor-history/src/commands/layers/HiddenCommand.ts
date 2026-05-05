// ─────────────────────────────────────────────
// HiddenCommand — 레이어 숨김 상태 변경
// ─────────────────────────────────────────────

import type { LayerTree } from '@storywork/editor-layers'

import type { Command } from '../../types.js'

export type HiddenCommandOptions = {
  layerTree: LayerTree
  id: string
  hidden: boolean
  recursive?: boolean
  /**
   * do() 전 영향받는 모든 노드의 이전 hidden 상태 스냅샷.
   * recursive=true 일 때 자손까지 포함.
   * Map<nodeId, prevHidden>
   */
  prevStates: Map<string, boolean>
}

/**
 * HiddenCommand — LayerTree.setHidden() 의 Command 래퍼.
 *
 * do()  → setHidden(id, hidden, recursive)
 * undo() → prevStates 의 각 노드를 개별 복원
 *
 * LockCommand 와 동일한 recursive 처리 패턴을 사용한다.
 */
export class HiddenCommand implements Command {
  readonly name = 'layers:hidden'
  readonly timestamp: number

  private readonly _layerTree: LayerTree
  private readonly _id: string
  private readonly _hidden: boolean
  private readonly _recursive: boolean
  private readonly _prevStates: Map<string, boolean>

  constructor(opts: HiddenCommandOptions) {
    this._layerTree = opts.layerTree
    this._id = opts.id
    this._hidden = opts.hidden
    this._recursive = opts.recursive ?? false
    this._prevStates = new Map(opts.prevStates)
    this.timestamp = Date.now()
  }

  do(): void {
    this._layerTree.setHidden(this._id, this._hidden, this._recursive)
  }

  undo(): void {
    for (const [nodeId, prevHidden] of this._prevStates) {
      this._layerTree.setHidden(nodeId, prevHidden, false)
    }
  }
}

/**
 * HiddenCommand 생성 전 prevStates 를 수집하는 헬퍼.
 */
export function collectHiddenPrevStates(
  layerTree: LayerTree,
  id: string,
  recursive: boolean,
): Map<string, boolean> {
  const states = new Map<string, boolean>()
  const self = layerTree.getNode(id)
  if (!self) return states
  states.set(id, self.hidden)

  if (recursive) {
    for (const desc of layerTree.getDescendants(id)) {
      states.set(desc.id, desc.hidden)
    }
  }
  return states
}
