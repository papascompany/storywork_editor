// ─────────────────────────────────────────────
// json.test.ts — exportJson 단위 테스트
// PageJsonV1 + LayerNodeJson 결합 검증
// ─────────────────────────────────────────────

import { StoryCanvas } from '@storywork/editor-core'
import { LayerTree } from '@storywork/editor-layers'
import type { PageJsonV1 } from '@storywork/schema/editor'
import { Rect } from 'fabric'
import { describe, expect, it } from 'vitest'

import { exportJson } from '../src/index.js'

import emptyPageJson from './golden/empty-page.json'
import singleRectJson from './golden/single-rect.json'

const TEST_FORMAT = {
  id: 'a4-portrait',
  widthMm: 210,
  heightMm: 297,
  dpi: 96,
}

describe('exportJson', () => {
  it('빈 캔버스를 내보내면 layers 가 빈 배열이다', () => {
    const canvas = new StoryCanvas({ format: TEST_FORMAT })

    const result = exportJson(canvas)

    expect(result.page.v).toBe(1)
    expect(result.page.format.id).toBe('a4-portrait')
    expect(result.page.layers).toHaveLength(0)
    expect(result.layers).toHaveLength(0)

    canvas.dispose()
  })

  it('LayerTree 없이 호출하면 layers 는 빈 배열이다', () => {
    const canvas = new StoryCanvas({ format: TEST_FORMAT })

    const result = exportJson(canvas, undefined)
    expect(result.layers).toHaveLength(0)

    canvas.dispose()
  })

  it('빈 페이지 JSON 로드 후 exportJson 결과가 원본 format 과 일치한다', async () => {
    const canvas = new StoryCanvas({ format: TEST_FORMAT })

    await canvas.loadJson(emptyPageJson as PageJsonV1)
    const result = exportJson(canvas)

    expect(result.page.v).toBe(1)
    expect(result.page.format.widthMm).toBe(210)
    expect(result.page.format.heightMm).toBe(297)
    expect(result.page.format.dpi).toBe(96)

    canvas.dispose()
  })

  it('단일 rect 로드 후 exportJson: 레이어 1개, id 보존', async () => {
    const canvas = new StoryCanvas({ format: TEST_FORMAT })

    await canvas.loadJson(singleRectJson as PageJsonV1)
    const result = exportJson(canvas)

    expect(result.page.layers).toHaveLength(1)
    expect(result.page.layers[0]?.id).toBe('rect-001')
    expect(result.page.layers[0]?.kind).toBe('decoration')

    canvas.dispose()
  })

  it('LayerTree 포함 시 layers 정보가 채워진다', async () => {
    const canvas = new StoryCanvas({ format: TEST_FORMAT })
    const tree = new LayerTree({ canvas })

    await canvas.loadJson(singleRectJson as PageJsonV1)
    const result = exportJson(canvas, tree)

    // LayerTree 가 object:added 이벤트를 구독해 자동으로 노드를 추가함
    expect(result.layers).toHaveLength(1)
    expect(result.layers[0]?.id).toBe('rect-001')
    expect(result.layers[0]?.v).toBe(1)

    canvas.dispose()
    tree.dispose()
  })

  it('객체 추가 후 exportJson round-trip: id, kind, fill 보존', async () => {
    const canvas = new StoryCanvas({ format: TEST_FORMAT })

    const rect = new Rect({
      left: 100,
      top: 100,
      width: 50,
      height: 50,
      fill: '#aabbcc',
    })
    const id = canvas.addObject({ kind: 'decoration' }, rect)

    const result = exportJson(canvas)

    expect(result.page.layers).toHaveLength(1)
    const layer = result.page.layers[0]
    expect(layer?.id).toBe(id)
    expect(layer?.kind).toBe('decoration')
    expect(layer?.fabric['fill']).toBe('#aabbcc')

    canvas.dispose()
  })

  it('load → modify → exportJson → loadJson round-trip: 객체 수 동일', async () => {
    const canvas = new StoryCanvas({ format: TEST_FORMAT })

    await canvas.loadJson(emptyPageJson as PageJsonV1)

    // 객체 추가
    const rect = new Rect({ left: 10, top: 10, width: 30, height: 30, fill: '#ff0000' })
    canvas.addObject({ kind: 'decoration' }, rect)

    const { page } = exportJson(canvas)

    // 새 캔버스에 reload
    const canvas2 = new StoryCanvas({ format: TEST_FORMAT })
    await canvas2.loadJson(page)

    const { page: page2 } = exportJson(canvas2)
    expect(page2.layers).toHaveLength(1)
    expect(page2.layers[0]?.kind).toBe('decoration')

    canvas.dispose()
    canvas2.dispose()
  })

  it('exportJson 결과의 PageJsonV1.v 는 항상 1이다', () => {
    const canvas = new StoryCanvas({ format: TEST_FORMAT })
    const result = exportJson(canvas)
    expect(result.page.v).toBe(1)
    canvas.dispose()
  })
})
