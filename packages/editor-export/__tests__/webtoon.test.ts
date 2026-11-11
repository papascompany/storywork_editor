// ─────────────────────────────────────────────
// webtoon.test.ts — 웹툰 이미지 내보내기 (MODE-05)
//
// 1. planWebtoonSlices — 경계 우선 분할 계획(순수 산술)
// 2. createStoreZip   — 무압축 ZIP 바이트 구조
// 3. exportWebtoon    — 실제 렌더(node-canvas)로 1:1 좌표·크기·분할을 픽셀로 확인
// ─────────────────────────────────────────────

import type { Format } from '@storywork/editor-core'
import type { PageJsonV1 } from '@storywork/schema/editor'
import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'

import { crc32, createStoreZip, exportWebtoon, planWebtoonSlices } from '../src/index.js'

// ─── 1. 분할 계획 ────────────────────────────

describe('planWebtoonSlices', () => {
  it('상한이 없으면 전체를 조각 하나로 잇는다(간격 포함)', () => {
    const slices = planWebtoonSlices([100, 100, 100], { gapPx: 10 })
    expect(slices).toHaveLength(1)
    expect(slices[0]).toEqual({
      top: 0,
      height: 320,
      parts: [
        { segmentIndex: 0, srcY: 0, dstY: 0, height: 100 },
        { segmentIndex: 1, srcY: 0, dstY: 110, height: 100 },
        { segmentIndex: 2, srcY: 0, dstY: 220, height: 100 },
      ],
    })
  })

  it('넘치면 세그먼트 경계에서 자르고, 조각 끝에 간격을 붙이지 않는다', () => {
    const slices = planWebtoonSlices([100, 100, 100], { gapPx: 10, maxSliceHeightPx: 250 })
    expect(slices.map((s) => s.height)).toEqual([210, 100])
    expect(slices[1]).toMatchObject({ top: 220, parts: [{ segmentIndex: 2, dstY: 0 }] })
  })

  it('상한보다 큰 세그먼트만 상한 단위로 강제 분할한다', () => {
    const slices = planWebtoonSlices([50, 250, 50], { maxSliceHeightPx: 100 })
    expect(slices.map((s) => s.height)).toEqual([50, 100, 100, 50, 50])
    // 강제 분할 조각은 같은 세그먼트의 연속 구간이다
    expect(slices.slice(1, 4).map((s) => s.parts[0])).toEqual([
      { segmentIndex: 1, srcY: 0, dstY: 0, height: 100 },
      { segmentIndex: 1, srcY: 100, dstY: 0, height: 100 },
      { segmentIndex: 1, srcY: 200, dstY: 0, height: 50 },
    ])
  })

  it('모든 조각은 상한 이하이고, 세그먼트 픽셀을 빠짐없이 한 번씩 담는다', () => {
    const heights = [1280, 1280, 900, 1280, 3000, 1280]
    const slices = planWebtoonSlices(heights, { gapPx: 40, maxSliceHeightPx: 2000 })
    for (const s of slices) expect(s.height).toBeLessThanOrEqual(2000)
    const covered = heights.map(() => 0)
    for (const s of slices) {
      for (const p of s.parts) covered[p.segmentIndex] += p.height
    }
    expect(covered).toEqual(heights)
  })

  it('잘못된 입력은 거부한다', () => {
    expect(() => planWebtoonSlices([])).toThrow('세그먼트가 없습니다')
    expect(() => planWebtoonSlices([100, 0])).toThrow('양수')
    expect(() => planWebtoonSlices([100], { gapPx: -1 })).toThrow('gapPx')
    expect(() => planWebtoonSlices([100], { maxSliceHeightPx: 0 })).toThrow('maxSliceHeightPx')
  })
})

// ─── 2. ZIP ──────────────────────────────────

function readZipEntries(zip: Uint8Array): { name: string; data: Uint8Array; crc: number }[] {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
  const eocd = zip.byteLength - 22
  expect(view.getUint32(eocd, true)).toBe(0x06054b50)
  const count = view.getUint16(eocd + 10, true)
  let p = view.getUint32(eocd + 16, true)
  const decoder = new TextDecoder()
  const out: { name: string; data: Uint8Array; crc: number }[] = []
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(p, true)).toBe(0x02014b50)
    expect(view.getUint16(p + 8, true) & 0x0800).toBe(0x0800) // UTF-8 플래그
    expect(view.getUint16(p + 10, true)).toBe(0) // STORE
    const crc = view.getUint32(p + 16, true)
    const size = view.getUint32(p + 20, true)
    const nameLen = view.getUint16(p + 28, true)
    const local = view.getUint32(p + 42, true)
    const name = decoder.decode(zip.subarray(p + 46, p + 46 + nameLen))
    expect(view.getUint32(local, true)).toBe(0x04034b50)
    const localNameLen = view.getUint16(local + 26, true)
    const dataStart = local + 30 + localNameLen
    out.push({ name, data: zip.subarray(dataStart, dataStart + size), crc })
    p += 46 + nameLen
  }
  return out
}

describe('createStoreZip', () => {
  it('crc32 는 표준 검사값과 일치한다', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('항목을 순서·이름(한글)·내용 그대로 담는다', () => {
    const entries = [
      { name: '웹툰_001.png', data: new Uint8Array([1, 2, 3]) },
      { name: 'b/2.png', data: new Uint8Array([]) },
    ]
    const parsed = readZipEntries(createStoreZip(entries, new Date(2026, 10, 11, 9, 30)))
    expect(parsed.map((e) => e.name)).toEqual(['웹툰_001.png', 'b/2.png'])
    expect(Array.from(parsed[0]?.data ?? [])).toEqual([1, 2, 3])
    expect(parsed[0]?.crc).toBe(crc32(new Uint8Array([1, 2, 3])))
    expect(parsed[1]?.data.byteLength).toBe(0)
  })

  it('빈 이름·중복 이름은 거부한다', () => {
    expect(() => createStoreZip([{ name: '', data: new Uint8Array() }])).toThrow('빈 파일명')
    expect(() =>
      createStoreZip([
        { name: 'a.png', data: new Uint8Array() },
        { name: 'a.png', data: new Uint8Array() },
      ]),
    ).toThrow('중복')
  })
})

// ─── 3. 실제 렌더 ────────────────────────────

const PX_FORMAT: Format = { id: 'webtoon-test', unit: 'px', widthMm: 100, heightMm: 200, dpi: 72 }

/** px 판형 위에 단색 사각형 하나 — 좌표는 픽셀 1:1 */
function segment(fill: string, rect = { left: 20, top: 40, width: 60, height: 80 }): PageJsonV1 {
  return {
    v: 1,
    format: { id: PX_FORMAT.id, unit: 'px', widthMm: 100, heightMm: 200, dpi: 72 },
    layers: [
      {
        id: `rect-${fill}`,
        kind: 'decoration',
        data: { locked: false, visible: true },
        fabric: {
          type: 'Rect',
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          leftMm: rect.left,
          topMm: rect.top,
          widthMm: rect.width,
          heightMm: rect.height,
          fill,
          stroke: '',
          strokeWidth: 0,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          opacity: 1,
          flipX: false,
          flipY: false,
          visible: true,
          data: { id: `rect-${fill}`, kind: 'decoration' },
        },
      },
    ],
  } as unknown as PageJsonV1
}

/** 배열 원소 — 없으면 테스트 실패로 드러낸다(non-null 단언 대신) */
function at<T>(items: readonly T[], index: number): T {
  const item = items[index]
  if (item === undefined) throw new Error(`index ${index} 없음 (길이 ${items.length})`)
  return item
}

async function decode(blob: Blob): Promise<PNG> {
  return PNG.sync.read(Buffer.from(await blob.arrayBuffer()))
}

function rgbAt(png: PNG, x: number, y: number): [number, number, number] {
  const i = (png.width * y + x) * 4
  return [png.data[i] ?? -1, png.data[i + 1] ?? -1, png.data[i + 2] ?? -1]
}

const RED: [number, number, number] = [255, 0, 0]
const GREEN: [number, number, number] = [0, 255, 0]
const BLUE: [number, number, number] = [0, 0, 255]
const WHITE: [number, number, number] = [255, 255, 255]

describe('exportWebtoon', () => {
  const pages = [segment('#ff0000'), segment('#00ff00'), segment('#0000ff')]

  it('mm 판형은 거부한다 — 인쇄물은 PDF 경로', async () => {
    const mm: Format = { id: 'a5', unit: 'mm', widthMm: 148, heightMm: 210, dpi: 300 }
    await expect(exportWebtoon(pages, mm, { layout: 'sequence' })).rejects.toThrow('px(웹툰)')
    const legacy: Format = { id: 'a5', widthMm: 148, heightMm: 210, dpi: 300 }
    await expect(exportWebtoon(pages, legacy, { layout: 'long' })).rejects.toThrow('px(웹툰)')
  })

  it('세그먼트가 없으면 거부한다', async () => {
    await expect(exportWebtoon([], PX_FORMAT, { layout: 'long' })).rejects.toThrow('세그먼트')
  })

  it('sequence — 세그먼트마다 판형 실물 크기 1장, 좌표 1:1', async () => {
    const progress: number[] = []
    const result = await exportWebtoon(pages, PX_FORMAT, {
      layout: 'sequence',
      fileBaseName: '1화',
      onProgress: (done) => progress.push(done),
    })
    expect(result.files.map((f) => f.name)).toEqual(['1화_001.png', '1화_002.png', '1화_003.png'])
    expect(progress).toEqual([1, 2, 3])

    const colors = [RED, GREEN, BLUE]
    for (const [i, file] of result.files.entries()) {
      expect([file.width, file.height]).toEqual([100, 200])
      const png = await decode(file.blob)
      expect([png.width, png.height]).toEqual([100, 200])
      expect(rgbAt(png, 50, 80)).toEqual(colors[i]) // 사각형 안
      expect(rgbAt(png, 10, 10)).toEqual(WHITE) // 사각형 밖 = 배경
      expect(rgbAt(png, 85, 80)).toEqual(WHITE) // 오른쪽 경계(20+60=80) 밖
    }
  })

  it('long — 상한이 없으면 한 장으로 잇는다', async () => {
    const result = await exportWebtoon(pages, PX_FORMAT, { layout: 'long', fileBaseName: 'ep' })
    expect(result.files).toHaveLength(1)
    const file = at(result.files, 0)
    expect(file.name).toBe('ep.png')
    const png = await decode(file.blob)
    expect([png.width, png.height]).toEqual([100, 600])
    expect(rgbAt(png, 50, 80)).toEqual(RED)
    expect(rgbAt(png, 50, 280)).toEqual(GREEN)
    expect(rgbAt(png, 50, 480)).toEqual(BLUE)
  })

  it('long — 간격은 배경색, 상한을 넘으면 경계에서 나눈다', async () => {
    const result = await exportWebtoon(pages, PX_FORMAT, {
      layout: 'long',
      gapPx: 10,
      maxSliceHeightPx: 450,
    })
    expect(result.files.map((f) => [f.name, f.width, f.height])).toEqual([
      ['webtoon_001.png', 100, 410],
      ['webtoon_002.png', 100, 200],
    ])
    const first = await decode(at(result.files, 0).blob)
    expect(rgbAt(first, 50, 80)).toEqual(RED)
    expect(rgbAt(first, 50, 205)).toEqual(WHITE) // 간격 200~210
    expect(rgbAt(first, 50, 290)).toEqual(GREEN) // 210 + 80
    const second = await decode(at(result.files, 1).blob)
    expect(rgbAt(second, 50, 80)).toEqual(BLUE)
  })

  it('long — 세그먼트보다 작은 상한은 세그먼트를 잘라 이어지게 나눈다', async () => {
    const result = await exportWebtoon([segment('#ff0000')], PX_FORMAT, {
      layout: 'long',
      maxSliceHeightPx: 100,
    })
    expect(result.files.map((f) => f.height)).toEqual([100, 100])
    const top = await decode(at(result.files, 0).blob)
    const bottom = await decode(at(result.files, 1).blob)
    // 사각형은 y 40~120 — 위 조각 40~99, 아래 조각 0~19 에 걸친다
    expect(rgbAt(top, 50, 50)).toEqual(RED)
    expect(rgbAt(bottom, 50, 10)).toEqual(RED)
    expect(rgbAt(bottom, 50, 30)).toEqual(WHITE)
  })

  it('scale 2 는 폭·높이와 좌표를 함께 2배로 그린다', async () => {
    const result = await exportWebtoon([segment('#ff0000')], PX_FORMAT, {
      layout: 'sequence',
      scale: 2,
    })
    const png = await decode(at(result.files, 0).blob)
    expect([png.width, png.height]).toEqual([200, 400])
    expect(rgbAt(png, 100, 160)).toEqual(RED)
    expect(rgbAt(png, 170, 160)).toEqual(WHITE) // 원본 85px → 170px, 사각형(≤160) 밖
  })

  it('빈 세그먼트(신규·미편집)는 배경만 그린다', async () => {
    const result = await exportWebtoon([null, {}], PX_FORMAT, { layout: 'long' })
    const png = await decode(at(result.files, 0).blob)
    expect([png.width, png.height]).toEqual([100, 400])
    expect(rgbAt(png, 50, 80)).toEqual(WHITE)
    expect(rgbAt(png, 50, 300)).toEqual(WHITE)
  })
})
