/**
 * Commands — canvas (add/remove/transform) 테스트
 */
import type { Format } from '@storywork/editor-core'
import { StoryCanvas } from '@storywork/editor-core'
import { Rect } from 'fabric'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AddObjectCommand } from '../src/commands/canvas/AddObjectCommand.js'
import { RemoveObjectCommand } from '../src/commands/canvas/RemoveObjectCommand.js'
import {
  TransformObjectCommand,
  snapshotFromFabricObject,
} from '../src/commands/canvas/TransformObjectCommand.js'
import { History } from '../src/History.js'

const B5: Format = { id: 'b5', widthMm: 182, heightMm: 257, dpi: 150 }

function makeCanvas(): StoryCanvas {
  return new StoryCanvas({ format: B5 })
}

// ─── AddObjectCommand ───
describe('AddObjectCommand', () => {
  let canvas: StoryCanvas
  let history: History

  beforeEach(() => {
    canvas = makeCanvas()
    history = new History()
  })

  afterEach(() => {
    history.dispose()
    canvas.dispose()
  })

  it('do() → 객체 추가됨', () => {
    const rect = new Rect({ width: 100, height: 100 })
    const cmd = new AddObjectCommand({ canvas, fabricObj: rect, dataOverrides: { kind: 'pose' } })

    history.push(cmd)

    const objects = canvas._fabricCanvas.getObjects()
    expect(objects).toHaveLength(1)
  })

  it('undo() → 객체 제거됨', () => {
    const rect = new Rect({ width: 100, height: 100 })
    const cmd = new AddObjectCommand({ canvas, fabricObj: rect, dataOverrides: { kind: 'pose' } })

    history.push(cmd)
    history.undo()

    const objects = canvas._fabricCanvas.getObjects()
    expect(objects).toHaveLength(0)
  })

  it('undo → redo → 다시 추가됨', () => {
    const rect = new Rect({ width: 100, height: 100 })
    const cmd = new AddObjectCommand({ canvas, fabricObj: rect, dataOverrides: { kind: 'pose' } })

    history.push(cmd)
    history.undo()
    history.redo()

    const objects = canvas._fabricCanvas.getObjects()
    expect(objects).toHaveLength(1)
  })

  it('name 은 canvas:add', () => {
    const rect = new Rect({ width: 10, height: 10 })
    const cmd = new AddObjectCommand({ canvas, fabricObj: rect, dataOverrides: { kind: 'prop' } })
    expect(cmd.name).toBe('canvas:add')
  })
})

// ─── RemoveObjectCommand ───
describe('RemoveObjectCommand', () => {
  let canvas: StoryCanvas
  let history: History

  beforeEach(() => {
    canvas = makeCanvas()
    history = new History()
  })

  afterEach(() => {
    history.dispose()
    canvas.dispose()
  })

  it('do() → 객체 제거됨', () => {
    const rect = new Rect({ width: 100, height: 100 })
    const id = canvas.addObject({ kind: 'background' }, rect)
    const objectData = canvas.getObjectData(id)
    if (!objectData) throw new Error('objectData 가 없습니다')

    const cmd = new RemoveObjectCommand({ canvas, id, fabricObj: rect, objectData })
    history.push(cmd)

    expect(canvas._fabricCanvas.getObjects()).toHaveLength(0)
  })

  it('undo() → 객체 복원됨', () => {
    const rect = new Rect({ width: 100, height: 100 })
    const id = canvas.addObject({ kind: 'background' }, rect)
    const objectData = canvas.getObjectData(id)
    if (!objectData) throw new Error('objectData 가 없습니다')

    const cmd = new RemoveObjectCommand({ canvas, id, fabricObj: rect, objectData })
    history.push(cmd)
    history.undo()

    expect(canvas._fabricCanvas.getObjects()).toHaveLength(1)
  })

  it('라운드트립: remove → undo → remove → undo', () => {
    const rect = new Rect({ width: 50, height: 50 })
    const id = canvas.addObject({ kind: 'prop' }, rect)
    const objectData = canvas.getObjectData(id)
    if (!objectData) throw new Error('objectData 가 없습니다')

    const cmd = new RemoveObjectCommand({ canvas, id, fabricObj: rect, objectData })

    history.push(cmd)
    expect(canvas._fabricCanvas.getObjects()).toHaveLength(0)
    history.undo()
    expect(canvas._fabricCanvas.getObjects()).toHaveLength(1)
    history.redo()
    expect(canvas._fabricCanvas.getObjects()).toHaveLength(0)
    history.undo()
    expect(canvas._fabricCanvas.getObjects()).toHaveLength(1)
  })
})

// ─── TransformObjectCommand ───
describe('TransformObjectCommand', () => {
  let canvas: StoryCanvas
  let history: History

  beforeEach(() => {
    canvas = makeCanvas()
    history = new History()
  })

  afterEach(() => {
    history.dispose()
    canvas.dispose()
  })

  it('do() → after 스냅샷 적용', () => {
    const rect = new Rect({ width: 100, height: 100, left: 0, top: 0 })
    const id = canvas.addObject({ kind: 'pose' }, rect)
    const obj = canvas.getObject(id)
    if (!obj) throw new Error('obj 가 없습니다')

    const before = snapshotFromFabricObject(obj)
    const after = { ...before, left: 50, top: 30, angle: 45 }

    const cmd = new TransformObjectCommand({ canvas, id, before, after })
    history.push(cmd)

    expect(obj.left).toBe(50)
    expect(obj.top).toBe(30)
    expect(obj.angle).toBe(45)
  })

  it('undo() → before 스냅샷 복원 (라운드트립 0 차이)', () => {
    const rect = new Rect({ width: 100, height: 100, left: 10, top: 20, angle: 30 })
    const id = canvas.addObject({ kind: 'pose' }, rect)
    const obj = canvas.getObject(id)
    if (!obj) throw new Error('obj 가 없습니다')

    const before = snapshotFromFabricObject(obj)
    const after = { ...before, left: 100, top: 200, angle: 90 }

    const cmd = new TransformObjectCommand({ canvas, id, before, after })
    history.push(cmd)
    history.undo()

    expect(obj.left).toBeCloseTo(before.left)
    expect(obj.top).toBeCloseTo(before.top)
    expect(obj.angle).toBeCloseTo(before.angle)
  })

  it('coalesceWith — 동일 객체 + 300ms 이내 → 합쳐짐', () => {
    const now = Date.now()
    const rect = new Rect({ left: 0, top: 0 })
    const id = canvas.addObject({ kind: 'prop' }, rect)

    const before1 = { left: 0, top: 0, scaleX: 1, scaleY: 1, angle: 0, flipX: false, flipY: false }
    const after1 = { left: 10, top: 0, scaleX: 1, scaleY: 1, angle: 0, flipX: false, flipY: false }
    const after2 = { left: 20, top: 0, scaleX: 1, scaleY: 1, angle: 0, flipX: false, flipY: false }

    const cmd1 = new TransformObjectCommand({ canvas, id, before: before1, after: after1 })
    Object.defineProperty(cmd1, 'timestamp', { value: now })

    const cmd2 = new TransformObjectCommand({ canvas, id, before: after1, after: after2 })
    Object.defineProperty(cmd2, 'timestamp', { value: now + 50 })

    const merged = cmd1.coalesceWith(cmd2)
    expect(merged).not.toBeNull()
    if (merged instanceof TransformObjectCommand) {
      expect(merged.before.left).toBe(0)
      expect(merged.after.left).toBe(20)
    }
  })

  it('coalesceWith — 다른 객체 → null', () => {
    const rect1 = new Rect({ left: 0, top: 0 })
    const id1 = canvas.addObject({ kind: 'prop' }, rect1)
    const rect2 = new Rect({ left: 0, top: 0 })
    const id2 = canvas.addObject({ kind: 'pose' }, rect2)

    const snap = { left: 0, top: 0, scaleX: 1, scaleY: 1, angle: 0, flipX: false, flipY: false }
    const cmd1 = new TransformObjectCommand({
      canvas,
      id: id1,
      before: snap,
      after: { ...snap, left: 10 },
    })
    const cmd2 = new TransformObjectCommand({
      canvas,
      id: id2,
      before: snap,
      after: { ...snap, left: 20 },
    })

    expect(cmd1.coalesceWith(cmd2)).toBeNull()
  })

  it('snapshotFromFabricObject — 정확히 추출', () => {
    const rect = new Rect({ left: 15, top: 25, scaleX: 2, scaleY: 0.5, angle: 90 })
    const snap = snapshotFromFabricObject(rect)

    expect(snap.left).toBe(15)
    expect(snap.top).toBe(25)
    expect(snap.scaleX).toBe(2)
    expect(snap.scaleY).toBe(0.5)
    expect(snap.angle).toBe(90)
  })
})
