// ─────────────────────────────────────────────
// canvas-observer — editor-core 이벤트 → Command 자동 push
// ─────────────────────────────────────────────

import type { StoryCanvas, Unsubscribe } from '@storywork/editor-core'
import type { LayerTree } from '@storywork/editor-layers'
import type { Canvas, FabricObject } from 'fabric'

import {
  TransformObjectCommand,
  snapshotFromFabricObject,
} from '../commands/canvas/TransformObjectCommand.js'
import type { History } from '../History.js'
import type { TransformSnapshot } from '../types.js'

export type AttachAutoPushOptions = {
  history: History
  canvas: StoryCanvas
  layerTree?: LayerTree
  /**
   * object:modified (transform 종료) 시 자동 TransformObjectCommand push 여부.
   * 기본값 true. 드래그 중 매 프레임 push 하지 않는다.
   */
  autoTransform?: boolean
  coalesceWindowMs?: number
}

type FabricCanvas = Canvas

/**
 * attachAutoPush — editor-core 이벤트를 구독해 Command 를 자동으로 History 에 push 한다.
 *
 * object:modified → TransformObjectCommand (transform 종료 시점에만)
 *
 * 사용 시 주의:
 * - 직접 Command push 방식과 혼용하면 이중 실행 위험이 있다.
 * - transform 자동 push 만 켜는 것을 권장한다.
 *
 * @returns dispose 함수 (호출 시 모든 구독 해제)
 */
export function attachAutoPush(opts: AttachAutoPushOptions): Unsubscribe {
  const { history, canvas, autoTransform = true, coalesceWindowMs = 300 } = opts

  const cleanup: Array<() => void> = []

  if (autoTransform) {
    const fabricCanvas = canvas._fabricCanvas as FabricCanvas
    const beforeSnapshots = new Map<string, TransformSnapshot>()

    // 드래그 시작 전 스냅샷 저장
    const onMouseDown = (e: { target?: FabricObject | null }) => {
      const target = e.target
      if (!target) return
      const obj = target as FabricObject & { data?: { id?: string } }
      const id = obj.data?.id
      if (!id) return
      beforeSnapshots.set(id, snapshotFromFabricObject(obj))
    }

    // 드래그 종료 (transform 완료) 시 Command push
    const onModified = (e: { target?: FabricObject | null }) => {
      const target = e.target
      if (!target) return
      const obj = target as FabricObject & { data?: { id?: string } }
      const id = obj.data?.id
      if (!id) return
      const before = beforeSnapshots.get(id)
      if (!before) return
      const after = snapshotFromFabricObject(obj)

      if (isSnapshotEqual(before, after)) {
        beforeSnapshots.delete(id)
        return
      }

      const cmd = new TransformObjectCommand({ canvas, id, before, after })
      cmd.setCoalesceWindowMs(coalesceWindowMs)

      // TransformObjectCommand.do() 는 멱등 — fabric 이 이미 적용했으므로 재적용해도 동일
      history.push(cmd)
      beforeSnapshots.delete(id)
    }

    fabricCanvas.on('mouse:down', onMouseDown)
    fabricCanvas.on('object:modified', onModified)

    cleanup.push(() => {
      fabricCanvas.off('mouse:down', onMouseDown)
      fabricCanvas.off('object:modified', onModified)
      beforeSnapshots.clear()
    })
  }

  return () => {
    for (const fn of cleanup) fn()
    cleanup.length = 0
  }
}

function isSnapshotEqual(a: TransformSnapshot, b: TransformSnapshot): boolean {
  return (
    a.left === b.left &&
    a.top === b.top &&
    a.scaleX === b.scaleX &&
    a.scaleY === b.scaleY &&
    a.angle === b.angle &&
    a.flipX === b.flipX &&
    a.flipY === b.flipY
  )
}

// Re-export for convenience
export { snapshotFromFabricObject, TransformObjectCommand }
