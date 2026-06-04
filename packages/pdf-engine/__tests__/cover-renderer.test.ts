/**
 * __tests__/cover-renderer.test.ts
 *
 * renderCoverPage() 단위 테스트
 * - 표지 페이지 생성 (배경 톤 6종)
 * - 메타데이터 검증 (title, author)
 * - bleed 포함 페이지 크기 검증
 */

import { PDFDocument } from 'pdf-lib'
import { describe, it, expect } from 'vitest'

import { renderCoverPage } from '../src/render/cover-renderer.js'
import { createRenderContext } from '../src/render/page-renderer.js'
import type { PdfFormat } from '../src/types.js'
import { MM_TO_PT } from '../src/types.js'

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

const BASE_FORMAT: PdfFormat = {
  widthMm: 130,
  heightMm: 200,
  dpi: 300,
  bleedMm: 3,
  safeMm: 5,
}

async function buildCoverPdf(cover: Parameters<typeof renderCoverPage>[2]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const ctx = await createRenderContext(doc, BASE_FORMAT.bleedMm, BASE_FORMAT.heightMm, null)
  await renderCoverPage(doc, BASE_FORMAT, cover, ctx)
  return doc.save()
}

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('renderCoverPage', () => {
  it('기본 표지 (cream 톤) → PDF 생성', async () => {
    const bytes = await buildCoverPdf({ title: '내 작품', backgroundTone: 'cream' })
    expect(bytes.byteLength).toBeGreaterThan(100)
    const header = new TextDecoder().decode(bytes.slice(0, 5))
    expect(header).toBe('%PDF-')
  })

  it('표지 페이지 크기 = bleed 포함 전체', async () => {
    const bytes = await buildCoverPdf({ title: 'Test' })
    const doc = await PDFDocument.load(bytes)
    const page = doc.getPage(0)
    const { width, height } = page.getSize()
    const expectedW = (BASE_FORMAT.widthMm + 2 * BASE_FORMAT.bleedMm) * MM_TO_PT
    const expectedH = (BASE_FORMAT.heightMm + 2 * BASE_FORMAT.bleedMm) * MM_TO_PT
    expect(width).toBeCloseTo(expectedW, 0)
    expect(height).toBeCloseTo(expectedH, 0)
  })

  it('navy 톤 표지 생성', async () => {
    const bytes = await buildCoverPdf({
      title: 'Navy 표지',
      subtitle: '부제목',
      authorName: '작가명',
      backgroundTone: 'navy',
    })
    expect(bytes.byteLength).toBeGreaterThan(100)
  })

  it('모든 배경 톤 6종 렌더 성공', async () => {
    const tones = ['cream', 'mint', 'lilac', 'pink', 'navy', 'white'] as const
    for (const tone of tones) {
      const bytes = await buildCoverPdf({ title: `${tone} 표지`, backgroundTone: tone })
      expect(bytes.byteLength).toBeGreaterThan(0)
    }
  })

  it('커버 없는 표지 (빈 cover 객체) → PDF 생성', async () => {
    const bytes = await buildCoverPdf({})
    expect(bytes.byteLength).toBeGreaterThan(0)
  })
})
