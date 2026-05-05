/**
 * z-order 재정렬 테스트
 */
import { StoryCanvas } from '@storywork/editor-core'
import type { Format } from '@storywork/editor-core'
import { Rect } from 'fabric'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'

import { LayerTree } from '../src/tree/LayerTree.js'
import {
  moveInArray,
  reorderInSiblings,
  bringForwardInSiblings,
  sendBackwardInSiblings,
  bringToFrontInSiblings,
  sendToBackInSiblings,
} from '../src/tree/reorder.js'

const B5: Format = { id: 'b5', widthMm: 182, heightMm: 257, dpi: 150 }

describe('reorder 순수 함수', () => {
  it('moveInArray — 앞에서 뒤로', () => {
    expect(moveInArray([1, 2, 3, 4], 0, 3)).toEqual([2, 3, 4, 1])
  })

  it('moveInArray — 뒤에서 앞으로', () => {
    expect(moveInArray([1, 2, 3, 4], 3, 0)).toEqual([4, 1, 2, 3])
  })

  it('moveInArray — 동일 위치', () => {
    expect(moveInArray([1, 2, 3], 1, 1)).toEqual([1, 2, 3])
  })

  it('reorderInSiblings — 유효한 이동', () => {
    expect(reorderInSiblings('b', 2, ['a', 'b', 'c', 'd'])).toEqual(['a', 'c', 'b', 'd'])
  })

  it('reorderInSiblings — id 없으면 원본 반환', () => {
    const arr = ['a', 'b', 'c']
    expect(reorderInSiblings('x', 0, arr)).toBe(arr)
  })

  it('reorderInSiblings — 인덱스 범위 클램프', () => {
    expect(reorderInSiblings('a', 99, ['a', 'b', 'c'])).toEqual(['b', 'c', 'a'])
    expect(reorderInSiblings('c', -1, ['a', 'b', 'c'])).toEqual(['c', 'a', 'b'])
  })

  it('bringForwardInSiblings — 한 칸 앞으로', () => {
    expect(bringForwardInSiblings('b', ['a', 'b', 'c'])).toEqual(['a', 'c', 'b'])
  })

  it('bringForwardInSiblings — 이미 맨 앞이면 변화 없음', () => {
    expect(bringForwardInSiblings('c', ['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
  })

  it('sendBackwardInSiblings — 한 칸 뒤로', () => {
    expect(sendBackwardInSiblings('b', ['a', 'b', 'c'])).toEqual(['b', 'a', 'c'])
  })

  it('sendBackwardInSiblings — 이미 맨 뒤이면 변화 없음', () => {
    expect(sendBackwardInSiblings('a', ['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
  })

  it('bringToFrontInSiblings', () => {
    expect(bringToFrontInSiblings('a', ['a', 'b', 'c'])).toEqual(['b', 'c', 'a'])
  })

  it('sendToBackInSiblings', () => {
    expect(sendToBackInSiblings('c', ['a', 'b', 'c'])).toEqual(['c', 'a', 'b'])
  })
})

describe('LayerTree z-order', () => {
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

  it('moveTo — root 레벨 z-order 변경', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const r3 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'background' }, r1)
    const id2 = canvas.addObject({ kind: 'pose' }, r2)
    const id3 = canvas.addObject({ kind: 'prop' }, r3)

    // 초기: [id1, id2, id3]
    expect(tree.getRootNodes().map((n) => n.id)).toEqual([id1, id2, id3])

    // id1 을 인덱스 2 (맨 위)로 이동
    tree.moveTo(id1, 2)
    expect(tree.getRootNodes().map((n) => n.id)).toEqual([id2, id3, id1])
  })

  it('bringForward', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'background' }, r1)
    const id2 = canvas.addObject({ kind: 'pose' }, r2)

    tree.bringForward(id1)
    expect(tree.getRootNodes().map((n) => n.id)).toEqual([id2, id1])
  })

  it('sendBackward', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'background' }, r1)
    const id2 = canvas.addObject({ kind: 'pose' }, r2)

    tree.sendBackward(id2)
    expect(tree.getRootNodes().map((n) => n.id)).toEqual([id2, id1])
  })

  it('bringToFront', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const r3 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'background' }, r1)
    const id2 = canvas.addObject({ kind: 'pose' }, r2)
    const id3 = canvas.addObject({ kind: 'prop' }, r3)

    tree.bringToFront(id1)
    expect(tree.getRootNodes().map((n) => n.id)).toEqual([id2, id3, id1])
  })

  it('sendToBack', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const r3 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'background' }, r1)
    const id2 = canvas.addObject({ kind: 'pose' }, r2)
    const id3 = canvas.addObject({ kind: 'prop' }, r3)

    tree.sendToBack(id3)
    expect(tree.getRootNodes().map((n) => n.id)).toEqual([id3, id1, id2])
  })

  it('tree:changed 이벤트 발행 — move', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'background' }, r1)
    canvas.addObject({ kind: 'pose' }, r2)

    const events: string[] = []
    tree.on('tree:changed', (e) => events.push(e.kind))

    tree.bringToFront(id1)
    expect(events).toContain('move')
  })
})
