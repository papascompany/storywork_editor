/**
 * 100스텝 라운드트립 테스트
 *
 * 시나리오:
 * 1. 100개의 무작위 명령 시퀀스 push
 * 2. 모두 undo → 초기 상태 일치 확인
 * 3. 모두 redo → 최종 상태 일치 확인
 * 4. 메모리: capacity=200 이하 유지
 *
 * 설계 원칙: 순수하게 역방향 가능한 커맨드만 사용
 * (group 내 개별 삭제는 상태 불일치를 유발하므로 배제)
 */
import type { Format } from '@storywork/editor-core'
import { StoryCanvas } from '@storywork/editor-core'
import { LayerTree } from '@storywork/editor-layers'
import { Rect } from 'fabric'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AddObjectCommand } from '../src/commands/canvas/AddObjectCommand.js'
import { RemoveObjectCommand } from '../src/commands/canvas/RemoveObjectCommand.js'
import { TransformObjectCommand } from '../src/commands/canvas/TransformObjectCommand.js'
import { HiddenCommand, collectHiddenPrevStates } from '../src/commands/layers/HiddenCommand.js'
import { LockCommand, collectLockPrevStates } from '../src/commands/layers/LockCommand.js'
import { ZOrderCommand } from '../src/commands/layers/ZOrderCommand.js'
import { History } from '../src/History.js'
import type { Command } from '../src/types.js'

const B5: Format = { id: 'b5', widthMm: 182, heightMm: 257, dpi: 150 }

function makeCanvas(): StoryCanvas {
  return new StoryCanvas({ format: B5 })
}

/**
 * 결정론적 의사난수 (seeded)
 */
function makeRng(seed: number) {
  let s = seed
  return (): number => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

/**
 * 캔버스 + LayerTree 상태 스냅샷
 */
function snapshotState(canvas: StoryCanvas, tree: LayerTree): string {
  const objects = canvas._fabricCanvas.getObjects()
  const objIds = objects.map((o) => (o as { data?: { id?: string } }).data?.id ?? '?').sort()
  const rootNodes = tree.getRootNodes().map((n) => `${n.id}(${n.kind},${n.locked},${n.hidden})`)
  return JSON.stringify({ objIds, rootNodes })
}

/**
 * 현재 캔버스 root-level 객체 ids
 */
function getRootIds(canvas: StoryCanvas, tree: LayerTree): string[] {
  return tree
    .getRootNodes()
    .filter((n) => n.parentId === null && n.kind !== 'group')
    .map((n) => n.id)
    .filter((id) => canvas.getObject(id) !== undefined)
}

describe('100스텝 라운드트립', () => {
  let canvas: StoryCanvas
  let tree: LayerTree
  let history: History

  beforeEach(() => {
    canvas = makeCanvas()
    tree = new LayerTree({ canvas })
    history = new History({ capacity: 200 })
  })

  afterEach(() => {
    history.dispose()
    tree.dispose()
    canvas.dispose()
  })

  it('100 커맨드 push → 전체 undo → 전체 redo — 상태 일치', () => {
    const rng = makeRng(42)
    const commands: Command[] = []

    // 초기 상태 스냅샷
    const initialSnapshot = snapshotState(canvas, tree)

    // 초기 객체 5개 추가
    for (let i = 0; i < 5; i++) {
      const rect = new Rect({ width: 50, height: 50, left: i * 30, top: i * 20 })
      const cmd = new AddObjectCommand({
        canvas,
        fabricObj: rect,
        dataOverrides: { kind: 'prop' },
      })
      history.push(cmd)
      commands.push(cmd)
    }

    // 100 스텝 랜덤 커맨드 생성 (group/ungroup 제외 — 역방향 일관성 위해)
    let stepCount = commands.length
    while (stepCount < 100) {
      const allCanvasIds = canvas._fabricCanvas
        .getObjects()
        .map((o) => (o as { data?: { id?: string } }).data?.id)
        .filter((id): id is string => id !== undefined)

      if (allCanvasIds.length === 0) {
        // 객체가 없으면 add만
        const rect = new Rect({ width: 40, height: 40 })
        const cmd = new AddObjectCommand({
          canvas,
          fabricObj: rect,
          dataOverrides: { kind: 'prop' },
        })
        history.push(cmd)
        commands.push(cmd)
        stepCount++
        continue
      }

      const pick = rng()

      if (pick < 0.2 && allCanvasIds.length < 15) {
        // add
        const rect = new Rect({ width: 40, height: 40, left: rng() * 100, top: rng() * 100 })
        const cmd = new AddObjectCommand({
          canvas,
          fabricObj: rect,
          dataOverrides: { kind: 'prop' },
        })
        history.push(cmd)
        commands.push(cmd)
        stepCount++
      } else if (pick < 0.35 && allCanvasIds.length > 3) {
        // remove (root-level non-group 노드만)
        const removable = getRootIds(canvas, tree)
        if (removable.length > 0) {
          const targetId = removable[Math.floor(rng() * removable.length)] ?? removable[0]
          if (!targetId) break
          const fabricObj = canvas.getObject(targetId) as Rect
          const objectData = canvas.getObjectData(targetId)
          if (fabricObj && objectData) {
            const cmd = new RemoveObjectCommand({ canvas, id: targetId, fabricObj, objectData })
            history.push(cmd)
            commands.push(cmd)
            stepCount++
          }
        }
      } else if (pick < 0.55) {
        // transform
        const targetId = allCanvasIds[Math.floor(rng() * allCanvasIds.length)] ?? allCanvasIds[0]
        if (!targetId) {
          stepCount++
          continue
        }
        const obj = canvas.getObject(targetId)
        if (obj) {
          const before = {
            left: obj.left ?? 0,
            top: obj.top ?? 0,
            scaleX: obj.scaleX ?? 1,
            scaleY: obj.scaleY ?? 1,
            angle: obj.angle ?? 0,
            flipX: obj.flipX ?? false,
            flipY: obj.flipY ?? false,
          }
          const after = {
            ...before,
            left: before.left + (rng() * 20 - 10),
            top: before.top + (rng() * 20 - 10),
          }
          const cmd = new TransformObjectCommand({ canvas, id: targetId, before, after })
          history.push(cmd)
          commands.push(cmd)
          stepCount++
        }
      } else if (pick < 0.7) {
        // lock toggle (root-level only)
        const rootIds = getRootIds(canvas, tree)
        if (rootIds.length > 0) {
          const targetId = rootIds[Math.floor(rng() * rootIds.length)] ?? rootIds[0]
          if (!targetId) {
            stepCount++
            continue
          }
          const node = tree.getNode(targetId)
          if (node) {
            const prevStates = collectLockPrevStates(tree, targetId, false)
            const cmd = new LockCommand({
              layerTree: tree,
              id: targetId,
              locked: !node.locked,
              prevStates,
            })
            history.push(cmd)
            commands.push(cmd)
            stepCount++
          }
        }
      } else if (pick < 0.85) {
        // hidden toggle (root-level only)
        const rootIds = getRootIds(canvas, tree)
        if (rootIds.length > 0) {
          const targetId = rootIds[Math.floor(rng() * rootIds.length)] ?? rootIds[0]
          if (!targetId) {
            stepCount++
            continue
          }
          const node = tree.getNode(targetId)
          if (node) {
            const prevStates = collectHiddenPrevStates(tree, targetId, false)
            const cmd = new HiddenCommand({
              layerTree: tree,
              id: targetId,
              hidden: !node.hidden,
              prevStates,
            })
            history.push(cmd)
            commands.push(cmd)
            stepCount++
          }
        }
      } else {
        // zorder (root-level only)
        const rootIds = getRootIds(canvas, tree)
        if (rootIds.length > 0) {
          const targetId = rootIds[Math.floor(rng() * rootIds.length)] ?? rootIds[0]
          if (!targetId) {
            stepCount++
            continue
          }
          const node = tree.getNode(targetId)
          if (node && node.parentId === null) {
            const siblingsBefore = tree.getRootNodes().map((n) => n.id)
            const actions = ['bringForward', 'sendBackward', 'bringToFront', 'sendToBack'] as const
            const action = actions[Math.floor(rng() * actions.length)] ?? 'bringForward'
            const cmd = new ZOrderCommand({
              layerTree: tree,
              id: targetId,
              action,
              siblingsBefore,
              parentId: null,
            })
            history.push(cmd)
            commands.push(cmd)
            stepCount++
          }
        }
      }
    }

    // 최종 상태 스냅샷
    const finalSnapshot = snapshotState(canvas, tree)

    // 메모리 가드: capacity=200 이하
    expect(history.depth().undo).toBeLessThanOrEqual(200)

    // 전체 undo
    let undoCount = 0
    while (history.canUndo()) {
      history.undo()
      undoCount++
    }
    expect(undoCount).toBeGreaterThan(0)

    // 초기 상태 일치
    const afterUndoSnapshot = snapshotState(canvas, tree)
    expect(afterUndoSnapshot).toBe(initialSnapshot)

    // 전체 redo
    let redoCount = 0
    while (history.canRedo()) {
      history.redo()
      redoCount++
    }
    expect(redoCount).toBe(undoCount)

    // 최종 상태 일치
    const afterRedoSnapshot = snapshotState(canvas, tree)
    expect(afterRedoSnapshot).toBe(finalSnapshot)
  })

  it('capacity=5 초과 시 100 push → depth.undo <= 5', () => {
    const smallHistory = new History({ capacity: 5 })
    for (let i = 0; i < 100; i++) {
      const rect = new Rect({ width: 10, height: 10 })
      const cmd = new AddObjectCommand({
        canvas,
        fabricObj: rect,
        dataOverrides: { kind: 'prop' },
      })
      smallHistory.push(cmd)
    }
    expect(smallHistory.depth().undo).toBeLessThanOrEqual(5)
    smallHistory.dispose()
  })

  it('100스텝 add/undo/redo 사이클 — depth 정확', () => {
    // 순수 add 100개
    const rects: Rect[] = []
    for (let i = 0; i < 100; i++) {
      const rect = new Rect({ width: 10, height: 10 })
      rects.push(rect)
      history.push(
        new AddObjectCommand({ canvas, fabricObj: rect, dataOverrides: { kind: 'prop' } }),
      )
    }
    expect(history.depth().undo).toBe(100)

    // 모두 undo
    for (let i = 0; i < 100; i++) {
      expect(history.undo()).toBe(true)
    }
    expect(history.depth().undo).toBe(0)
    expect(history.depth().redo).toBe(100)
    expect(canvas._fabricCanvas.getObjects()).toHaveLength(0)

    // 모두 redo
    for (let i = 0; i < 100; i++) {
      expect(history.redo()).toBe(true)
    }
    expect(history.depth().redo).toBe(0)
    expect(canvas._fabricCanvas.getObjects()).toHaveLength(100)
  })
})
