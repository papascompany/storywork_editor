/**
 * Commands — layers (MoveLayer/ZOrder/Group/Ungroup/Lock/Hidden/Rename) 테스트
 * undo 역방향 매트릭스 검증 포함
 */
import type { Format } from '@storywork/editor-core'
import { StoryCanvas } from '@storywork/editor-core'
import { LayerTree } from '@storywork/editor-layers'
import { Rect } from 'fabric'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { GroupCommand } from '../src/commands/layers/GroupCommand.js'
import { HiddenCommand, collectHiddenPrevStates } from '../src/commands/layers/HiddenCommand.js'
import { LockCommand, collectLockPrevStates } from '../src/commands/layers/LockCommand.js'
import { MoveLayerCommand } from '../src/commands/layers/MoveLayerCommand.js'
import { RenameLayerCommand } from '../src/commands/layers/RenameLayerCommand.js'
import { UngroupCommand } from '../src/commands/layers/UngroupCommand.js'
import { ZOrderCommand } from '../src/commands/layers/ZOrderCommand.js'
import { History } from '../src/History.js'

const B5: Format = { id: 'b5', widthMm: 182, heightMm: 257, dpi: 150 }

function makeCanvas(): StoryCanvas {
  return new StoryCanvas({ format: B5 })
}

function addRect(canvas: StoryCanvas, kind: 'pose' | 'background' | 'prop' = 'prop') {
  const rect = new Rect({ width: 50, height: 50 })
  return canvas.addObject({ kind }, rect)
}

// ─── MoveLayerCommand ───
describe('MoveLayerCommand', () => {
  let canvas: StoryCanvas
  let tree: LayerTree
  let history: History

  beforeEach(() => {
    canvas = makeCanvas()
    tree = new LayerTree({ canvas })
    history = new History()
  })

  afterEach(() => {
    history.dispose()
    tree.dispose()
    canvas.dispose()
  })

  it('do → 지정 인덱스로 이동, undo → 원래 인덱스 복원', () => {
    const id1 = addRect(canvas)
    const id2 = addRect(canvas)
    const id3 = addRect(canvas)

    // 초기: [id1, id2, id3] (z-order)
    const rootsBefore = tree.getRootNodes().map((n) => n.id)
    expect(rootsBefore).toEqual([id1, id2, id3])

    const cmd = new MoveLayerCommand({
      layerTree: tree,
      id: id1,
      fromIndex: 0,
      fromParentId: null,
      toIndex: 2,
      toParentId: null,
    })
    history.push(cmd)

    const rootsAfter = tree.getRootNodes().map((n) => n.id)
    expect(rootsAfter).toEqual([id2, id3, id1])

    history.undo()
    const rootsRestored = tree.getRootNodes().map((n) => n.id)
    expect(rootsRestored).toEqual([id1, id2, id3])
  })
})

// ─── ZOrderCommand ───
describe('ZOrderCommand', () => {
  let canvas: StoryCanvas
  let tree: LayerTree
  let history: History

  beforeEach(() => {
    canvas = makeCanvas()
    tree = new LayerTree({ canvas })
    history = new History()
  })

  afterEach(() => {
    history.dispose()
    tree.dispose()
    canvas.dispose()
  })

  it('bringForward do → 앞으로, undo → 원래 위치', () => {
    const id1 = addRect(canvas)
    const id2 = addRect(canvas)
    const id3 = addRect(canvas)
    // [id1, id2, id3]

    const siblingsBefore = tree.getRootNodes().map((n) => n.id)
    const cmd = new ZOrderCommand({
      layerTree: tree,
      id: id1,
      action: 'bringForward',
      siblingsBefore,
      parentId: null,
    })
    history.push(cmd)
    expect(tree.getRootNodes().map((n) => n.id)).toEqual([id2, id1, id3])

    history.undo()
    expect(tree.getRootNodes().map((n) => n.id)).toEqual([id1, id2, id3])
  })

  it('sendBackward do → 뒤로, undo → 원래 위치', () => {
    const id1 = addRect(canvas)
    const id2 = addRect(canvas)
    const id3 = addRect(canvas)

    const siblingsBefore = tree.getRootNodes().map((n) => n.id)
    const cmd = new ZOrderCommand({
      layerTree: tree,
      id: id3,
      action: 'sendBackward',
      siblingsBefore,
      parentId: null,
    })
    history.push(cmd)
    expect(tree.getRootNodes().map((n) => n.id)).toEqual([id1, id3, id2])

    history.undo()
    expect(tree.getRootNodes().map((n) => n.id)).toEqual([id1, id2, id3])
  })

  it('bringToFront do → 맨 앞, undo → 원래 위치', () => {
    const id1 = addRect(canvas)
    const id2 = addRect(canvas)
    const id3 = addRect(canvas)

    const siblingsBefore = tree.getRootNodes().map((n) => n.id)
    const cmd = new ZOrderCommand({
      layerTree: tree,
      id: id1,
      action: 'bringToFront',
      siblingsBefore,
      parentId: null,
    })
    history.push(cmd)
    expect(tree.getRootNodes().map((n) => n.id)).toEqual([id2, id3, id1])

    history.undo()
    expect(tree.getRootNodes().map((n) => n.id)).toEqual([id1, id2, id3])
  })

  it('sendToBack do → 맨 뒤, undo → 원래 위치', () => {
    const id1 = addRect(canvas)
    const id2 = addRect(canvas)
    const id3 = addRect(canvas)

    const siblingsBefore = tree.getRootNodes().map((n) => n.id)
    const cmd = new ZOrderCommand({
      layerTree: tree,
      id: id3,
      action: 'sendToBack',
      siblingsBefore,
      parentId: null,
    })
    history.push(cmd)
    expect(tree.getRootNodes().map((n) => n.id)).toEqual([id3, id1, id2])

    history.undo()
    expect(tree.getRootNodes().map((n) => n.id)).toEqual([id1, id2, id3])
  })
})

// ─── GroupCommand / UngroupCommand ───
describe('GroupCommand / UngroupCommand', () => {
  let canvas: StoryCanvas
  let tree: LayerTree
  let history: History

  beforeEach(() => {
    canvas = makeCanvas()
    tree = new LayerTree({ canvas })
    history = new History()
  })

  afterEach(() => {
    history.dispose()
    tree.dispose()
    canvas.dispose()
  })

  it('GroupCommand: do → 그룹 생성, undo → 평탄화', () => {
    const id1 = addRect(canvas)
    const id2 = addRect(canvas)

    const cmd = new GroupCommand({ layerTree: tree, ids: [id1, id2], name: '테스트 그룹' })
    history.push(cmd)

    const groupId = cmd.groupId
    if (!groupId) throw new Error('groupId 가 없습니다')
    expect(groupId).not.toBeNull()
    expect(tree.getNode(groupId)?.kind).toBe('group')
    expect(tree.getRootNodes()).toHaveLength(1)

    history.undo()
    expect(tree.getNode(groupId)).toBeUndefined()
    expect(tree.getRootNodes()).toHaveLength(2)
    // id1, id2 가 다시 root 에 있어야 함
    const rootIds = tree.getRootNodes().map((n) => n.id)
    expect(rootIds).toContain(id1)
    expect(rootIds).toContain(id2)
  })

  it('GroupCommand: undo → redo → 다시 그룹화됨', () => {
    const id1 = addRect(canvas)
    const id2 = addRect(canvas)

    const cmd = new GroupCommand({ layerTree: tree, ids: [id1, id2] })
    history.push(cmd)
    history.undo()
    history.redo()

    // redo 후 다시 그룹 1개
    expect(tree.getRootNodes()).toHaveLength(1)
    expect(tree.getRootNodes()[0]?.kind).toBe('group')
  })

  it('UngroupCommand: do → 평탄화, undo → 재그룹화', () => {
    const id1 = addRect(canvas)
    const id2 = addRect(canvas)
    const groupId = tree.group([id1, id2], '그룹')

    const groupNode = tree.getNode(groupId)
    if (!groupNode) throw new Error('groupNode 가 없습니다')
    const cmd = new UngroupCommand({ layerTree: tree, groupId, groupNodeSnapshot: groupNode })
    history.push(cmd)

    expect(tree.getNode(groupId)).toBeUndefined()
    expect(tree.getRootNodes()).toHaveLength(2)

    history.undo()
    // 재그룹화 (새 groupId 생성)
    expect(tree.getRootNodes()).toHaveLength(1)
    expect(tree.getRootNodes()[0]?.kind).toBe('group')
  })
})

// ─── LockCommand ───
describe('LockCommand', () => {
  let canvas: StoryCanvas
  let tree: LayerTree
  let history: History

  beforeEach(() => {
    canvas = makeCanvas()
    tree = new LayerTree({ canvas })
    history = new History()
  })

  afterEach(() => {
    history.dispose()
    tree.dispose()
    canvas.dispose()
  })

  it('do → locked, undo → unlocked', () => {
    const id = addRect(canvas)
    expect(tree.getNode(id)?.locked).toBe(false)

    const prevStates = collectLockPrevStates(tree, id, false)
    const cmd = new LockCommand({ layerTree: tree, id, locked: true, prevStates })
    history.push(cmd)

    expect(tree.getNode(id)?.locked).toBe(true)

    history.undo()
    expect(tree.getNode(id)?.locked).toBe(false)
  })

  it('recursive do/undo — 자손 prev 상태 보존', () => {
    const parentId = addRect(canvas)
    const childId = addRect(canvas)
    // 직접 tree 에 child 추가 (그룹 구조 없이 테스트)
    tree.add({ id: childId + '_child', kind: 'prop' }, parentId)

    // 자손의 이전 상태: child 는 이미 locked
    tree.setLock(childId, true)

    const prevStates = collectLockPrevStates(tree, parentId, true)
    const cmd = new LockCommand({
      layerTree: tree,
      id: parentId,
      locked: true,
      recursive: true,
      prevStates,
    })
    history.push(cmd)
    history.undo()

    // parent 는 unlocked (prevState=false 복원)
    expect(tree.getNode(parentId)?.locked).toBe(false)
    // child 는 원래 locked 상태(prevState=true) 복원
    expect(tree.getNode(childId)?.locked).toBe(true)
  })

  it('name 은 layers:lock', () => {
    const id = addRect(canvas)
    const cmd = new LockCommand({
      layerTree: tree,
      id,
      locked: true,
      prevStates: new Map([[id, false]]),
    })
    expect(cmd.name).toBe('layers:lock')
  })
})

// ─── HiddenCommand ───
describe('HiddenCommand', () => {
  let canvas: StoryCanvas
  let tree: LayerTree
  let history: History

  beforeEach(() => {
    canvas = makeCanvas()
    tree = new LayerTree({ canvas })
    history = new History()
  })

  afterEach(() => {
    history.dispose()
    tree.dispose()
    canvas.dispose()
  })

  it('do → hidden, undo → visible', () => {
    const id = addRect(canvas)
    expect(tree.getNode(id)?.hidden).toBe(false)

    const prevStates = collectHiddenPrevStates(tree, id, false)
    const cmd = new HiddenCommand({ layerTree: tree, id, hidden: true, prevStates })
    history.push(cmd)

    expect(tree.getNode(id)?.hidden).toBe(true)

    history.undo()
    expect(tree.getNode(id)?.hidden).toBe(false)
  })

  it('recursive do/undo — 자손 prev 상태 보존', () => {
    const id1 = addRect(canvas)
    const id2 = addRect(canvas)
    const groupId = tree.group([id1, id2])

    // id1 을 미리 숨겨 놓기
    tree.setHidden(id1, true)

    const prevStates = collectHiddenPrevStates(tree, groupId, true)
    const cmd = new HiddenCommand({
      layerTree: tree,
      id: groupId,
      hidden: true,
      recursive: true,
      prevStates,
    })
    history.push(cmd)
    history.undo()

    // groupId 는 visible 복원
    expect(tree.getNode(groupId)?.hidden).toBe(false)
    // id1 은 원래 숨겨진 상태 복원
    expect(tree.getNode(id1)?.hidden).toBe(true)
    // id2 는 visible 복원
    expect(tree.getNode(id2)?.hidden).toBe(false)
  })
})

// ─── RenameLayerCommand ───
describe('RenameLayerCommand', () => {
  let canvas: StoryCanvas
  let tree: LayerTree
  let history: History

  beforeEach(() => {
    canvas = makeCanvas()
    tree = new LayerTree({ canvas })
    history = new History()
  })

  afterEach(() => {
    history.dispose()
    tree.dispose()
    canvas.dispose()
  })

  it('do → 이름 변경, undo → 이전 이름 복원', () => {
    const id = addRect(canvas)
    tree.rename(id, '초기 이름')

    const cmd = new RenameLayerCommand({
      layerTree: tree,
      id,
      prevName: '초기 이름',
      nextName: '새 이름',
    })
    history.push(cmd)
    expect(tree.getNode(id)?.name).toBe('새 이름')

    history.undo()
    expect(tree.getNode(id)?.name).toBe('초기 이름')
  })

  it('prevName undefined → undo 시 빈 문자열로 복원', () => {
    const id = addRect(canvas)

    const cmd = new RenameLayerCommand({
      layerTree: tree,
      id,
      prevName: undefined,
      nextName: '이름',
    })
    history.push(cmd)
    history.undo()
    expect(tree.getNode(id)?.name).toBe('')
  })

  it('name 은 layers:rename', () => {
    const id = addRect(canvas)
    const cmd = new RenameLayerCommand({
      layerTree: tree,
      id,
      prevName: undefined,
      nextName: '테스트',
    })
    expect(cmd.name).toBe('layers:rename')
  })
})
