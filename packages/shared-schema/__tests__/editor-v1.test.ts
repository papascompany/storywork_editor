import { describe, expect, it } from 'vitest'

import {
  PageJsonV1Schema,
  emptyPageJson,
  migratePageJson,
  parsePageJson,
} from '../src/editor/v1.js'

// ─────────────────────────────────────────────
// PageJsonV1 라운드트립 sanity
// ─────────────────────────────────────────────

const sampleFormat = {
  id: 'fmt-b5',
  widthMm: 130,
  heightMm: 200,
  dpi: 300,
}

describe('PageJsonV1', () => {
  it('emptyPageJson 생성 → 파싱 라운드트립', () => {
    const page = emptyPageJson(sampleFormat)
    const parsed = PageJsonV1Schema.parse(page)
    expect(parsed.v).toBe(1)
    expect(parsed.layers).toHaveLength(0)
    expect(parsed.format.id).toBe('fmt-b5')
  })

  it('JSON 직렬화 후 재파싱 라운드트립', () => {
    const page = emptyPageJson(sampleFormat)
    const serialized = JSON.stringify(page)
    const parsed = parsePageJson(JSON.parse(serialized))
    expect(parsed.v).toBe(1)
    expect(parsed.format.widthMm).toBe(130)
  })

  it('레이어 포함 PageJsonV1 파싱', () => {
    const pageWithLayers = {
      v: 1,
      format: sampleFormat,
      layers: [
        {
          id: 'layer-1',
          kind: 'pose',
          data: { resourceId: 'res-pose-1', locked: false },
          fabric: { type: 'Image', left: 100, top: 100, scaleX: 1, scaleY: 1 },
        },
        {
          id: 'layer-2',
          kind: 'bg',
          data: { resourceId: 'res-bg-1' },
          fabric: { type: 'Image', left: 0, top: 0 },
        },
      ],
    }
    const result = PageJsonV1Schema.safeParse(pageWithLayers)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.layers).toHaveLength(2)
      expect(result.data.layers[0]?.kind).toBe('pose')
    }
  })

  it('그룹 레이어 (children) 재귀 파싱', () => {
    const pageWithGroup = {
      v: 1,
      format: sampleFormat,
      layers: [
        {
          id: 'group-1',
          kind: 'group',
          data: {},
          fabric: { type: 'Group' },
          children: [
            {
              id: 'child-1',
              kind: 'pose',
              data: { resourceId: 'res-1' },
              fabric: { type: 'Image' },
            },
          ],
        },
      ],
    }
    const result = PageJsonV1Schema.safeParse(pageWithGroup)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.layers[0]?.children?.[0]?.id).toBe('child-1')
    }
  })

  it('v=1 이 아니면 파싱 실패', () => {
    const result = PageJsonV1Schema.safeParse({ v: 2, format: sampleFormat, layers: [] })
    expect(result.success).toBe(false)
  })

  it('format.widthMm 0 이하면 파싱 실패', () => {
    const result = PageJsonV1Schema.safeParse({
      v: 1,
      format: { ...sampleFormat, widthMm: 0 },
      layers: [],
    })
    expect(result.success).toBe(false)
  })

  it('알 수 없는 LayerKind 거부', () => {
    const result = PageJsonV1Schema.safeParse({
      v: 1,
      format: sampleFormat,
      layers: [
        {
          id: 'layer-x',
          kind: 'unknown-kind',
          data: {},
          fabric: {},
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('migratePageJson v1 정상 처리', () => {
    const page = emptyPageJson(sampleFormat)
    const migrated = migratePageJson(page)
    expect(migrated.v).toBe(1)
  })

  it('migratePageJson 지원하지 않는 버전 에러', () => {
    expect(() => migratePageJson({ v: 99, format: sampleFormat, layers: [] })).toThrow(
      'Unsupported PageJson version',
    )
  })
})
