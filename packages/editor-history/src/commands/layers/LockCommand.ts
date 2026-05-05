// ─────────────────────────────────────────────
// LockCommand — 레이어 잠금 상태 변경
// ─────────────────────────────────────────────

import type { LayerTree } from '@storywork/editor-layers'

import type { Command } from '../../types.js'

export type LockCommandOptions = {
  layerTree: LayerTree
  id: string
  locked: boolean
  recursive?: boolean
  /**
   * do() 전 영향받는 모든 노드의 이전 locked 상태 스냅샷.
   * recursive=true 일 때 자손까지 포함. LockCommand 생성자 밖에서 수집해야 한다.
   * Map<nodeId, prevLocked>
   */
  prevStates: Map<string, boolean>
}

/**
 * LockCommand — LayerTree.setLock() 의 Command 래퍼.
 *
 * do()  → setLock(id, locked, recursive)
 * undo() → prevStates 의 각 노드를 개별 복원 (setLock with recursive=false)
 *
 * recursive 케이스:
 * - do() 전 대상 노드 + 자손 모두의 locked 상태를 prevStates 로 받아 저장
 * - undo() 에서 각 노드를 개별 복원하므로 자손의 원래 상태가 보존된다
 */
export class LockCommand implements Command {
  readonly name = 'layers:lock'
  readonly timestamp: number

  private readonly _layerTree: LayerTree
  private readonly _id: string
  private readonly _locked: boolean
  private readonly _recursive: boolean
  private readonly _prevStates: Map<string, boolean>

  constructor(opts: LockCommandOptions) {
    this._layerTree = opts.layerTree
    this._id = opts.id
    this._locked = opts.locked
    this._recursive = opts.recursive ?? false
    this._prevStates = new Map(opts.prevStates)
    this.timestamp = Date.now()
  }

  do(): void {
    this._layerTree.setLock(this._id, this._locked, this._recursive)
  }

  undo(): void {
    // 각 노드를 이전 상태로 개별 복원 (recursive=false 로 1개씩)
    for (const [nodeId, prevLocked] of this._prevStates) {
      this._layerTree.setLock(nodeId, prevLocked, false)
    }
  }
}

/**
 * LockCommand 생성 전 prevStates 를 수집하는 헬퍼.
 * LayerTree.getDescendants + 자신을 포함해 현재 locked 스냅샷을 만든다.
 */
export function collectLockPrevStates(
  layerTree: LayerTree,
  id: string,
  recursive: boolean,
): Map<string, boolean> {
  const states = new Map<string, boolean>()
  const self = layerTree.getNode(id)
  if (!self) return states
  states.set(id, self.locked)

  if (recursive) {
    for (const desc of layerTree.getDescendants(id)) {
      states.set(desc.id, desc.locked)
    }
  }
  return states
}
