/**
 * 그룹/언그룹 테스트
 */
import { StoryCanvas } from '@storywork/editor-core'
import type { Format } from '@storywork/editor-core'
import { Rect } from 'fabric'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'

import { LayerTree } from '../src/tree/LayerTree.js'

const B5: Format = { id: 'b5', widthMm: 182, heightMm: 257, dpi: 150 }

describe('LayerTree — 그룹', () => {
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

  it('group — 두 노드를 그룹으로 묶기', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'pose' }, r1)
    const id2 = canvas.addObject({ kind: 'prop' }, r2)

    const groupId = tree.group([id1, id2], 'my-group')

    expect(typeof groupId).toBe('string')
    const groupNode = tree.getNode(groupId)
    expect(groupNode).toBeDefined()
    expect(groupNode?.kind).toBe('group')
    expect(groupNode?.name).toBe('my-group')
    expect(groupNode?.childrenIds).toContain(id1)
    expect(groupNode?.childrenIds).toContain(id2)

    // root 에는 groupId 만 있어야 함
    const rootIds = tree.getRootNodes().map((n) => n.id)
    expect(rootIds).toContain(groupId)
    expect(rootIds).not.toContain(id1)
    expect(rootIds).not.toContain(id2)
  })

  it('group — 자식들의 parentId 가 groupId 로 변경됨', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'pose' }, r1)
    const id2 = canvas.addObject({ kind: 'background' }, r2)

    const groupId = tree.group([id1, id2])

    expect(tree.getNode(id1)?.parentId).toBe(groupId)
    expect(tree.getNode(id2)?.parentId).toBe(groupId)
  })

  it('getChildren — 그룹 자식 조회', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'pose' }, r1)
    const id2 = canvas.addObject({ kind: 'prop' }, r2)

    const groupId = tree.group([id1, id2])
    const children = tree.getChildren(groupId)
    expect(children).toHaveLength(2)
    expect(children.map((c) => c.id)).toContain(id1)
    expect(children.map((c) => c.id)).toContain(id2)
  })

  it('getAncestors — 그룹 내 자식의 조상', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'pose' }, r1)
    const id2 = canvas.addObject({ kind: 'prop' }, r2)

    const groupId = tree.group([id1, id2])
    const ancestors = tree.getAncestors(id1)
    expect(ancestors.map((a) => a.id)).toContain(groupId)
  })

  it('getDescendants — 그룹의 자손 목록', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'pose' }, r1)
    const id2 = canvas.addObject({ kind: 'prop' }, r2)

    const groupId = tree.group([id1, id2])
    const descendants = tree.getDescendants(groupId)
    expect(descendants.map((d) => d.id)).toContain(id1)
    expect(descendants.map((d) => d.id)).toContain(id2)
  })

  it('group — 1개만 전달하면 에러', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'pose' }, r1)

    expect(() => tree.group([id1])).toThrow()
  })

  it('group — tree:changed 이벤트 발행', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'pose' }, r1)
    const id2 = canvas.addObject({ kind: 'prop' }, r2)

    const events: string[] = []
    tree.on('tree:changed', (e) => events.push(e.kind))

    tree.group([id1, id2])
    expect(events).toContain('group')
  })

  it('ungroup — 그룹 해제 후 자식들이 root 로 복귀', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'pose' }, r1)
    const id2 = canvas.addObject({ kind: 'prop' }, r2)

    const groupId = tree.group([id1, id2])
    const childIds = tree.ungroup(groupId)

    expect(childIds).toContain(id1)
    expect(childIds).toContain(id2)

    // 그룹은 제거됨
    expect(tree.getNode(groupId)).toBeUndefined()

    // 자식들은 root 로 복귀
    expect(tree.getNode(id1)?.parentId).toBeNull()
    expect(tree.getNode(id2)?.parentId).toBeNull()
    const rootIds = tree.getRootNodes().map((n) => n.id)
    expect(rootIds).toContain(id1)
    expect(rootIds).toContain(id2)
  })

  it('ungroup — tree:changed 이벤트 발행', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'pose' }, r1)
    const id2 = canvas.addObject({ kind: 'prop' }, r2)

    const groupId = tree.group([id1, id2])
    const events: string[] = []
    tree.on('tree:changed', (e) => events.push(e.kind))

    tree.ungroup(groupId)
    expect(events).toContain('ungroup')
  })

  it('ungroup — 그룹이 아닌 노드에 호출 시 에러', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'pose' }, r1)

    expect(() => tree.ungroup(id1)).toThrow()
  })

  it('2단계 중첩 그룹 — 내부 그룹이 외부 그룹의 자식', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const r3 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'pose' }, r1)
    const id2 = canvas.addObject({ kind: 'prop' }, r2)
    const id3 = canvas.addObject({ kind: 'decoration' }, r3)

    // 내부 그룹: id1 + id2
    const innerGroupId = tree.group([id1, id2], 'inner')

    // 외부 그룹: innerGroup + id3
    const outerGroupId = tree.group([innerGroupId, id3], 'outer')

    // 구조 확인
    const outerNode = tree.getNode(outerGroupId)
    expect(outerNode?.childrenIds).toContain(innerGroupId)
    expect(outerNode?.childrenIds).toContain(id3)

    const innerNode = tree.getNode(innerGroupId)
    expect(innerNode?.parentId).toBe(outerGroupId)
    expect(innerNode?.childrenIds).toContain(id1)
    expect(innerNode?.childrenIds).toContain(id2)

    // id1 의 조상: innerGroup → outerGroup
    const ancestors = tree.getAncestors(id1)
    const ancestorIds = ancestors.map((a) => a.id)
    expect(ancestorIds[0]).toBe(innerGroupId)
    expect(ancestorIds[1]).toBe(outerGroupId)

    // outerGroup 의 자손: innerGroup, id3, id1, id2
    const descendants = tree.getDescendants(outerGroupId)
    const descIds = descendants.map((d) => d.id)
    expect(descIds).toContain(innerGroupId)
    expect(descIds).toContain(id1)
    expect(descIds).toContain(id2)
    expect(descIds).toContain(id3)
  })

  it('canvas 에서 그룹 자식 제거 → 부모 그룹 비어있으면 자동 제거', () => {
    const r1 = new Rect({ width: 10, height: 10 })
    const r2 = new Rect({ width: 10, height: 10 })
    const id1 = canvas.addObject({ kind: 'pose' }, r1)
    const id2 = canvas.addObject({ kind: 'prop' }, r2)

    const groupId = tree.group([id1, id2])

    // id1 제거 → 그룹에 id2 남음
    canvas.removeObject(id1)
    expect(tree.getNode(groupId)).toBeDefined()

    // id2 제거 → 그룹 비어있으므로 자동 제거
    canvas.removeObject(id2)
    expect(tree.getNode(groupId)).toBeUndefined()
  })
})
