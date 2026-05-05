/**
 * 골든 케이스 라운드트립 테스트
 * DoD §7: 골든 3개 라운드트립 100%
 */
import { describe, expect, it } from 'vitest'

import { deserializeTree } from '../src/serialize/fromJson.js'
import { serializeTree } from '../src/serialize/toJson.js'
import type { LayerNodeJson } from '../src/types.js'

import flatLayersJson from './golden/flat-layers.json'
import lockedTreeJson from './golden/locked-tree.json'
import nestedGroupJson from './golden/nested-group.json'

/**
 * LayerNodeJson 이 올바른 형식인지 재귀 검사
 */
function validateLayerNodeJson(node: LayerNodeJson): void {
  expect(node.v).toBe(1)
  expect(typeof node.id).toBe('string')
  expect(node.id.length).toBeGreaterThan(0)
  expect(typeof node.kind).toBe('string')

  if (node.locked !== undefined) expect(typeof node.locked).toBe('boolean')
  if (node.hidden !== undefined) expect(typeof node.hidden).toBe('boolean')
  if (node.name !== undefined) expect(typeof node.name).toBe('string')

  if (node.children) {
    expect(Array.isArray(node.children)).toBe(true)
    for (const child of node.children) {
      validateLayerNodeJson(child)
    }
  }
}

/**
 * JSON 구조를 깊게 비교 (v 필드 포함, undefined 제거 후)
 */
function normalizeJson(nodes: LayerNodeJson[]): unknown {
  return JSON.parse(JSON.stringify(nodes))
}

describe('Golden: flat-layers.json 라운드트립', () => {
  const input = flatLayersJson as LayerNodeJson[]

  it('골든 파일 구조 유효성 검사', () => {
    for (const node of input) {
      validateLayerNodeJson(node)
    }
  })

  it('deserialize → serialize 라운드트립', () => {
    const { nodeMap, rootOrder } = deserializeTree(input)
    const output = serializeTree(rootOrder, nodeMap)

    expect(output).toHaveLength(5)
    expect(normalizeJson(output)).toEqual(normalizeJson(input))
  })

  it('id 매핑 정확성', () => {
    const { nodeMap } = deserializeTree(input)
    expect(nodeMap.has('layer-bg-001')).toBe(true)
    expect(nodeMap.has('layer-pose-001')).toBe(true)
    expect(nodeMap.has('layer-prop-001')).toBe(true)
    expect(nodeMap.has('layer-bubble-001')).toBe(true)
    expect(nodeMap.has('layer-deco-001')).toBe(true)
  })

  it('parentId 모두 null (flat 구조)', () => {
    const { nodeMap } = deserializeTree(input)
    for (const node of nodeMap.values()) {
      expect(node.parentId).toBeNull()
    }
  })

  it('locked/name 속성 보존', () => {
    const { nodeMap } = deserializeTree(input)
    expect(nodeMap.get('layer-deco-001')?.locked).toBe(true)
    expect(nodeMap.get('layer-bubble-001')?.name).toBe('주인공 대사')
  })

  it('z-order 순서 보존', () => {
    const { rootOrder } = deserializeTree(input)
    expect(rootOrder).toEqual([
      'layer-bg-001',
      'layer-pose-001',
      'layer-prop-001',
      'layer-bubble-001',
      'layer-deco-001',
    ])
  })
})

describe('Golden: nested-group.json 라운드트립', () => {
  const input = nestedGroupJson as LayerNodeJson[]

  it('골든 파일 구조 유효성 검사', () => {
    for (const node of input) {
      validateLayerNodeJson(node)
    }
  })

  it('deserialize → serialize 라운드트립', () => {
    const { nodeMap, rootOrder } = deserializeTree(input)
    const output = serializeTree(rootOrder, nodeMap)

    expect(output).toHaveLength(3) // bg, outer-group, bubble
    expect(normalizeJson(output)).toEqual(normalizeJson(input))
  })

  it('중첩 구조 — outer group 이 inner group 을 포함', () => {
    const { nodeMap } = deserializeTree(input)

    const outerGroup = nodeMap.get('group-outer-001')
    expect(outerGroup).toBeDefined()
    expect(outerGroup?.childrenIds).toContain('group-inner-001')
    expect(outerGroup?.childrenIds).toContain('layer-prop-001')

    const innerGroup = nodeMap.get('group-inner-001')
    expect(innerGroup?.parentId).toBe('group-outer-001')
    expect(innerGroup?.childrenIds).toContain('layer-pose-001')
    expect(innerGroup?.childrenIds).toContain('layer-pose-002')
  })

  it('leaf 노드의 parentId 정확성', () => {
    const { nodeMap } = deserializeTree(input)
    expect(nodeMap.get('layer-pose-001')?.parentId).toBe('group-inner-001')
    expect(nodeMap.get('layer-pose-002')?.parentId).toBe('group-inner-001')
    expect(nodeMap.get('layer-prop-001')?.parentId).toBe('group-outer-001')
  })

  it('root 노드는 bg, outer-group, bubble 3개', () => {
    const { rootOrder } = deserializeTree(input)
    expect(rootOrder).toHaveLength(3)
    expect(rootOrder).toContain('layer-bg-001')
    expect(rootOrder).toContain('group-outer-001')
    expect(rootOrder).toContain('layer-bubble-001')
  })
})

describe('Golden: locked-tree.json 라운드트립', () => {
  const input = lockedTreeJson as LayerNodeJson[]

  it('골든 파일 구조 유효성 검사', () => {
    for (const node of input) {
      validateLayerNodeJson(node)
    }
  })

  it('deserialize → serialize 라운드트립', () => {
    const { nodeMap, rootOrder } = deserializeTree(input)
    const output = serializeTree(rootOrder, nodeMap)

    expect(normalizeJson(output)).toEqual(normalizeJson(input))
  })

  it('locked 속성 보존', () => {
    const { nodeMap } = deserializeTree(input)
    expect(nodeMap.get('layer-bg-001')?.locked).toBe(true)
    expect(nodeMap.get('group-locked-001')?.locked).toBe(true)
    expect(nodeMap.get('layer-pose-001')?.locked).toBe(true)
    expect(nodeMap.get('layer-prop-001')?.locked).toBe(true)
    expect(nodeMap.get('layer-bubble-001')?.locked).toBe(false)
  })

  it('hidden 속성 보존', () => {
    const { nodeMap } = deserializeTree(input)
    expect(nodeMap.get('layer-pose-002')?.hidden).toBe(true)
    expect(nodeMap.get('layer-bubble-001')?.hidden).toBe(false)
  })

  it('name 속성 보존', () => {
    const { nodeMap } = deserializeTree(input)
    expect(nodeMap.get('layer-bg-001')?.name).toBe('배경 (잠금)')
    expect(nodeMap.get('group-locked-001')?.name).toBe('잠긴 그룹')
    expect(nodeMap.get('layer-pose-002')?.name).toBe('숨김 포즈')
    expect(nodeMap.get('layer-bubble-001')?.name).toBe('말풍선 (정상)')
  })
})
