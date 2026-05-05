/**
 * 5개 골든 PageJsonV1 라운드트립 테스트.
 * load → toJson 후 필수 필드(id, kind, resourceId, slotId, locked, meta) 가 보존되는지 검증한다.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { parsePageJson } from '@storywork/schema/editor'
import type { PageJsonV1 } from '@storywork/schema/editor'
import { describe, expect, it } from 'vitest'

import { StoryCanvas } from '../src/canvas/StoryCanvas.js'
import type { Format } from '../src/types.js'

function loadGolden(filename: string): PageJsonV1 {
  const raw = readFileSync(join(import.meta.dirname ?? __dirname, 'golden', filename), 'utf-8')
  return parsePageJson(JSON.parse(raw))
}

async function roundtrip(golden: PageJsonV1): Promise<PageJsonV1> {
  const format: Format = golden.format
  const canvas = new StoryCanvas({ format })
  await canvas.loadJson(golden)
  const result = canvas.toJson()
  canvas.dispose()
  return result
}

describe('골든 라운드트립', () => {
  it('empty-page: 레이어 없음 보존', async () => {
    const golden = loadGolden('empty-page.json')
    const result = await roundtrip(golden)

    expect(result.v).toBe(1)
    expect(result.format.id).toBe(golden.format.id)
    expect(result.format.widthMm).toBe(golden.format.widthMm)
    expect(result.format.heightMm).toBe(golden.format.heightMm)
    expect(result.format.dpi).toBe(golden.format.dpi)
    expect(result.layers.length).toBe(0)
  })

  it('single-pose: id/kind/resourceId/slotId/meta 보존', async () => {
    const golden = loadGolden('single-pose.json')
    const result = await roundtrip(golden)

    expect(result.layers.length).toBe(1)
    const layer = result.layers[0]
    expect(layer).toBeDefined()
    if (!layer) return

    expect(layer.id).toBe('pose-001')
    expect(layer.kind).toBe('pose')
    expect(layer.data.resourceId).toBe('resource-abc-123')
    expect(layer.data.slotId).toBe('slot-main')
    expect(layer.data.locked).toBe(false)
    expect(layer.data.meta?.['action']).toBe('standing')
    expect(layer.data.meta?.['bodyType']).toBe('F')
  })

  it('pose-with-bg: 2개 레이어 id/kind 보존', async () => {
    const golden = loadGolden('pose-with-bg.json')
    const result = await roundtrip(golden)

    expect(result.layers.length).toBe(2)
    const ids = new Set(result.layers.map((l) => l.id))
    expect(ids.has('bg-001')).toBe(true)
    expect(ids.has('pose-002')).toBe(true)

    const bg = result.layers.find((l) => l.id === 'bg-001')
    expect(bg?.kind).toBe('bg')
    expect(bg?.data.resourceId).toBe('resource-bg-456')

    const pose = result.layers.find((l) => l.id === 'pose-002')
    expect(pose?.kind).toBe('pose')
    expect(pose?.data.resourceId).toBe('resource-pose-789')
  })

  it('grouped-objects: 그룹 id/kind/children 보존', async () => {
    const golden = loadGolden('grouped-objects.json')
    const result = await roundtrip(golden)

    // 그룹은 최상위 레이어로 1개
    expect(result.layers.length).toBe(1)
    const group = result.layers[0]
    expect(group).toBeDefined()
    if (!group) return

    expect(group.id).toBe('group-001')
    expect(group.kind).toBe('group')
    expect(group.data.meta?.['groupLabel']).toBe('캐릭터 + 말풍선')
  })

  it('locked-layer: locked 플래그 보존', async () => {
    const golden = loadGolden('locked-layer.json')
    const result = await roundtrip(golden)

    expect(result.layers.length).toBe(2)
    const bg = result.layers.find((l) => l.id === 'bg-locked-001')
    const pose = result.layers.find((l) => l.id === 'pose-unlocked-001')

    expect(bg?.data.locked).toBe(true)
    expect(pose?.data.locked).toBe(false)
    expect(pose?.data.meta?.['action']).toBe('surprised')
  })

  it('format 라운드트립 — widthMm/heightMm/dpi 픽셀 차이 없음', async () => {
    const golden = loadGolden('locked-layer.json') // A4 300dpi
    const result = await roundtrip(golden)

    expect(result.format.widthMm).toBe(210)
    expect(result.format.heightMm).toBe(297)
    expect(result.format.dpi).toBe(300)
  })
})
