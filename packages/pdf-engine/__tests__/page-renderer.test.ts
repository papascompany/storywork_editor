/**
 * __tests__/page-renderer.test.ts
 *
 * renderPage() 단위 테스트
 * - 빈 페이지 fabricJson → PDF 1장 생성
 * - 단순 bg 레이어 → PDF 생성
 * - 결정론: 동일 입력 → 동일 PDF 바이트 (해시 비교)
 * - bleed 적용: 총 페이지 크기 검증
 * - text 레이어 → PDF 생성 (폰트 폴백 포함)
 */

import { createHash } from 'node:crypto'

import type { LayerJson } from '@storywork/schema/editor'
import { PDFDocument } from 'pdf-lib'
import { describe, it, expect } from 'vitest'

import { fabricLayersToCommands } from '../src/adapter/fabric-to-pdf.js'
import { renderPage, createRenderContext } from '../src/render/page-renderer.js'
import { MM_TO_PT } from '../src/types.js'

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

const BASE_DIMS = {
  widthMm: 130,
  heightMm: 200,
  bleedMm: 3,
  safeMm: 5,
  dpi: 300,
}

function sha256(buf: Uint8Array): string {
  return createHash('sha256').update(buf).digest('hex')
}

async function buildSinglePagePdf(layers: LayerJson[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const ctx = await createRenderContext(doc, BASE_DIMS.bleedMm, BASE_DIMS.heightMm, null)
  const { commands } = fabricLayersToCommands(layers)
  await renderPage({ dims: BASE_DIMS, commands, ctx })
  return doc.save()
}

function makeBgLayer(): LayerJson {
  return {
    id: 'bg-1',
    kind: 'bg',
    data: {},
    fabric: {
      left: 0,
      top: 0,
      width: 130,
      height: 200,
      scaleX: 1,
      scaleY: 1,
      originX: 'left',
      originY: 'top',
      opacity: 1,
      angle: 0,
      fill: '#f5f0e8',
    },
  }
}

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('renderPage', () => {
  it('빈 layers → PDF 1장 생성', async () => {
    const pdfBytes = await buildSinglePagePdf([])
    expect(pdfBytes.byteLength).toBeGreaterThan(0)

    // PDF 헤더 확인
    const header = new TextDecoder().decode(pdfBytes.slice(0, 5))
    expect(header).toBe('%PDF-')
  })

  it('bg 레이어 → PDF 생성, 페이지 크기 검증', async () => {
    const pdfBytes = await buildSinglePagePdf([makeBgLayer()])
    const doc = await PDFDocument.load(pdfBytes)

    expect(doc.getPageCount()).toBe(1)
    const page = doc.getPage(0)
    const { width, height } = page.getSize()

    // bleed 포함 총 크기 검증
    const expectedW = (BASE_DIMS.widthMm + 2 * BASE_DIMS.bleedMm) * MM_TO_PT
    const expectedH = (BASE_DIMS.heightMm + 2 * BASE_DIMS.bleedMm) * MM_TO_PT
    expect(width).toBeCloseTo(expectedW, 0)
    expect(height).toBeCloseTo(expectedH, 0)
  })

  it('text 레이어 → PDF 생성 (폰트 폴백)', async () => {
    const textLayer: LayerJson = {
      id: 'text-1',
      kind: 'text',
      data: {},
      fabric: {
        left: 10,
        top: 20,
        width: 100,
        height: 20,
        scaleX: 1,
        scaleY: 1,
        originX: 'left',
        originY: 'top',
        opacity: 1,
        angle: 0,
        text: 'Hello World',
        fontSize: 14,
        fill: '#000000',
        fontFamily: 'Pretendard',
      },
    }
    const pdfBytes = await buildSinglePagePdf([textLayer])
    expect(pdfBytes.byteLength).toBeGreaterThan(100)
  })

  it('bubble 레이어 → PDF 생성', async () => {
    const bubbleLayer: LayerJson = {
      id: 'bubble-1',
      kind: 'bubble',
      data: { meta: { bubbleType: 'rounded' } },
      fabric: {
        left: 20,
        top: 30,
        width: 60,
        height: 30,
        scaleX: 1,
        scaleY: 1,
        originX: 'left',
        originY: 'top',
        opacity: 1,
        angle: 0,
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 1,
      },
    }
    const pdfBytes = await buildSinglePagePdf([bubbleLayer])
    expect(pdfBytes.byteLength).toBeGreaterThan(100)
  })

  it('결정론: 동일 입력 → 동일 PDF 해시', async () => {
    const layers = [makeBgLayer()]

    // 동일 입력으로 2회 생성 후 해시 비교
    // pdf-lib 내부 CreationDate 등을 고정하기 위해 동일 doc 생성 흐름 사용
    const doc1 = await PDFDocument.create()
    const ctx1 = await createRenderContext(doc1, BASE_DIMS.bleedMm, BASE_DIMS.heightMm, null)
    const { commands: cmds1 } = fabricLayersToCommands(layers)
    await renderPage({ dims: BASE_DIMS, commands: cmds1, ctx: ctx1 })
    doc1.setCreationDate(new Date(0)) // 고정
    doc1.setModificationDate(new Date(0))
    const bytes1 = await doc1.save({ useObjectStreams: false })

    const doc2 = await PDFDocument.create()
    const ctx2 = await createRenderContext(doc2, BASE_DIMS.bleedMm, BASE_DIMS.heightMm, null)
    const { commands: cmds2 } = fabricLayersToCommands(layers)
    await renderPage({ dims: BASE_DIMS, commands: cmds2, ctx: ctx2 })
    doc2.setCreationDate(new Date(0))
    doc2.setModificationDate(new Date(0))
    const bytes2 = await doc2.save({ useObjectStreams: false })

    expect(sha256(bytes1)).toBe(sha256(bytes2))
  })

  it('가이드 라인 포함 → PDF 생성', async () => {
    const doc = await PDFDocument.create()
    const ctx = await createRenderContext(doc, BASE_DIMS.bleedMm, BASE_DIMS.heightMm, null)
    const { commands } = fabricLayersToCommands([makeBgLayer()])
    await renderPage({ dims: BASE_DIMS, commands, ctx, showGuides: true })
    const bytes = await doc.save()
    expect(bytes.byteLength).toBeGreaterThan(0)
  })
})
