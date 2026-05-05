/**
 * 잠금/숨김 전파 테스트
 * DoD §9: 그룹 생성 후 그룹 안의 객체 lock → 그룹 unlock 시 자식 lock 보존 케이스
 */
import { StoryCanvas } from '@storywork/editor-core'
import type { Format } from '@storywork/editor-core'
import { Rect } from 'fabric'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'

import { LayerTree } from '../src/tree/LayerTree.js'

const B5: Format = { id: 'b5', widthMm: 182, heightMm: 257, dpi: 150 }

describe('LayerTree — 잠금(lock)', () => {
  let canvas: StoryCanvas
  let tree: LayerTree

  beforeEach(() => {
    canvas = new StoryCanvas({ format: B5 })
    tree = new LayerTree({ canvas })
  })

  afterEach(() => {
    tree.dispose()
    canvas.dispose()
  })

  it('setLock — 단일 노드 lock', () => {
    const rect = new Rect({ width: 10, height: 10 })
    const id = canvas.addObject({ kind: 'pose' }, rect)

    tree.setLock(id, true)
    expect(tree.getNode(id)?.locked).toBe(true)
  })

  it('setLock — fabric 객체에도 적용됨', () => {
    const rect = new Rect({ width: 10, height: 10 })
    const id = canvas.addObject({ kind: 'pose' }, rect)

    tree.setLock(id, true)
    const obj = canvas.getObject(id)
    expect(obj?.selectable).toBe(false)
    expect(obj?.evented).toBe(false)
    expect(obj?.lockMovementX).toBe(true)
    expect(obj?.lockMovementY).toBe(true)
    expect(obj?.lockRotation).toBe(true)
  })

  it('setLock(id, false) — unlock 후 fabric 복원', () => {
    const rect = new Rect({ width: 10, height: 10 })
    const id = canvas.addObject({ kind: 'pose' }, rect)

    tree.setLock(id, true)
    tree.setLock(id, false)

    const obj = canvas.getObject(id)
    expect(obj?.selectable).toBe(true)
    expect(obj?.evented).toBe(true)
    expect(obj?.lockMovementX).toBe(false)
  })

  it('setLock recursive=true — 그룹과 자손 모두 lock', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const r3 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'pose' }, r1)
    const id2 = canvas.addObject({ kind: 'prop' }, r2)
    const id3 = canvas.addObject({ kind: 'decoration' }, r3)

    const groupId = tree.group([id1, id2])
    tree.add({ id: id3, kind: 'decoration' }) // id3 은 이미 root에 있음

    tree.setLock(groupId, true, true)

    expect(tree.getNode(groupId)?.locked).toBe(true)
    expect(tree.getNode(id1)?.locked).toBe(true)
    expect(tree.getNode(id2)?.locked).toBe(true)
    // id3 은 그룹 밖이므로 영향 없음
    expect(tree.getNode(id3)?.locked).toBe(false)
  })

  it('DoD §9: 그룹 안 자식 lock → 그룹 unlock 시 자식 lock 보존', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'pose' }, r1)
    const id2 = canvas.addObject({ kind: 'prop' }, r2)

    const groupId = tree.group([id1, id2])

    // 그룹 자체를 lock
    tree.setLock(groupId, true, true)
    expect(tree.getNode(id1)?.locked).toBe(true)
    expect(tree.getNode(id2)?.locked).toBe(true)

    // 그룹만 unlock (recursive=false)
    tree.setLock(groupId, false, false)
    expect(tree.getNode(groupId)?.locked).toBe(false)

    // 자식들은 명시적으로 lock 된 상태가 보존되어야 함
    expect(tree.getNode(id1)?.locked).toBe(true)
    expect(tree.getNode(id2)?.locked).toBe(true)

    // effective lock: 그룹이 unlock 됐으나 자식 자체가 lock → effective=true
    expect(tree.getEffectiveLock(id1)).toBe(true)
  })

  it('getEffectiveLock — 조상 lock 이면 effective=true', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'pose' }, r1)
    const id2 = canvas.addObject({ kind: 'prop' }, r2)

    const groupId = tree.group([id1, id2])

    // 그룹만 lock (자식은 lock=false)
    tree.setLock(groupId, true)
    expect(tree.getNode(id1)?.locked).toBe(false) // 자신 lock=false
    expect(tree.getEffectiveLock(id1)).toBe(true) // 조상이 lock이므로 effective=true
  })

  it('state:changed 이벤트 발행 — lock', () => {
    const rect = new Rect({ width: 10, height: 10 })
    const id = canvas.addObject({ kind: 'pose' }, rect)

    const events: string[] = []
    tree.on('state:changed', (e) => events.push(e.kind))

    tree.setLock(id, true)
    expect(events).toContain('lock')
  })
})

describe('LayerTree — 숨김(visibility)', () => {
  let canvas: StoryCanvas
  let tree: LayerTree

  beforeEach(() => {
    canvas = new StoryCanvas({ format: B5 })
    tree = new LayerTree({ canvas })
  })

  afterEach(() => {
    tree.dispose()
    canvas.dispose()
  })

  it('setHidden — 단일 노드 hidden', () => {
    const rect = new Rect({ width: 10, height: 10 })
    const id = canvas.addObject({ kind: 'pose' }, rect)

    tree.setHidden(id, true)
    expect(tree.getNode(id)?.hidden).toBe(true)
  })

  it('setHidden — fabric 객체의 visible 속성 변경', () => {
    const rect = new Rect({ width: 10, height: 10 })
    const id = canvas.addObject({ kind: 'pose' }, rect)

    tree.setHidden(id, true)
    const obj = canvas.getObject(id)
    expect(obj?.visible).toBe(false)
  })

  it('setHidden — show 복원', () => {
    const rect = new Rect({ width: 10, height: 10 })
    const id = canvas.addObject({ kind: 'pose' }, rect)

    tree.setHidden(id, true)
    tree.setHidden(id, false)

    const obj = canvas.getObject(id)
    expect(obj?.visible).toBe(true)
    expect(tree.getNode(id)?.hidden).toBe(false)
  })

  it('setHidden recursive=true — 그룹과 자손 모두 숨김', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'pose' }, r1)
    const id2 = canvas.addObject({ kind: 'prop' }, r2)

    const groupId = tree.group([id1, id2])
    tree.setHidden(groupId, true, true)

    expect(tree.getNode(groupId)?.hidden).toBe(true)
    expect(tree.getNode(id1)?.hidden).toBe(true)
    expect(tree.getNode(id2)?.hidden).toBe(true)
  })

  it('getEffectiveHidden — 조상이 숨겨지면 effective=true', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'pose' }, r1)
    const id2 = canvas.addObject({ kind: 'prop' }, r2)

    const groupId = tree.group([id1, id2])
    tree.setHidden(groupId, true) // 그룹만 숨김 (자식 hidden=false)

    expect(tree.getNode(id1)?.hidden).toBe(false)
    expect(tree.getEffectiveHidden(id1)).toBe(true) // 조상이 숨겨졌으므로 effective=true
  })

  it('state:changed 이벤트 발행 — visibility', () => {
    const rect = new Rect({ width: 10, height: 10 })
    const id = canvas.addObject({ kind: 'pose' }, rect)

    const events: string[] = []
    tree.on('state:changed', (e) => events.push(e.kind))

    tree.setHidden(id, true)
    expect(events).toContain('visibility')
  })
})

describe('LayerTree — rename', () => {
  let canvas: StoryCanvas
  let tree: LayerTree

  beforeEach(() => {
    canvas = new StoryCanvas({ format: B5 })
    tree = new LayerTree({ canvas })
  })

  afterEach(() => {
    tree.dispose()
    canvas.dispose()
  })

  it('rename — 이름 변경', () => {
    const rect = new Rect({ width: 10, height: 10 })
    const id = canvas.addObject({ kind: 'pose' }, rect)

    tree.rename(id, '주인공 포즈')
    expect(tree.getNode(id)?.name).toBe('주인공 포즈')
  })

  it('state:changed 이벤트 발행 — rename', () => {
    const rect = new Rect({ width: 10, height: 10 })
    const id = canvas.addObject({ kind: 'pose' }, rect)

    const events: string[] = []
    tree.on('state:changed', (e) => events.push(e.kind))

    tree.rename(id, 'test')
    expect(events).toContain('rename')
  })
})
