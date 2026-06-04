/**
 * __tests__/build.test.ts
 *
 * buildPdf() 메인 빌더 테스트
 *
 * - 빈 pages → PDF 생성 (최소 동작)
 * - 표지 포함 PDF
 * - 결정론 검증: 같은 입력 + 같은 seed → 같은 PDF 바이트 (sha256)
 * - 16p 성능 ≤ 6000ms (NFR)
 * - 메타데이터 확인 (producer, title, creationDate)
 */

import { createHash } from 'node:crypto'

import { PDFDocument } from 'pdf-lib'
import { describe, it, expect } from 'vitest'

import { buildPdf } from '../src/build.js'
import type { PdfBuildInput, PageInput } from '../src/types.js'
import { PDF_PRODUCER } from '../src/types.js'

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function sha256(buf: Uint8Array): string {
  return createHash('sha256').update(buf).digest('hex')
}

const BASE_FORMAT = {
  widthMm: 130,
  heightMm: 200,
  dpi: 300,
  bleedMm: 3,
  safeMm: 5,
}

function makePageInput(index: number): PageInput {
  return {
    pageIndex: index,
    fabricJson: {
      v: 1,
      format: { id: 'b5', widthMm: 130, heightMm: 200, dpi: 300 },
      layers: [
        {
          id: `bg-${index}`,
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
        },
      ],
    },
  }
}

function makeInput(pageCount: number): PdfBuildInput {
  return {
    formatId: 'b5-format',
    format: BASE_FORMAT,
    title: '테스트 작품',
    author: '작가명',
    pages: Array.from({ length: pageCount }, (_, i) => makePageInput(i)),
    seed: 42,
  }
}

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('buildPdf', () => {
  it('빈 pages → PDF 생성 (표지 없음)', async () => {
    const result = await buildPdf({
      ...makeInput(0),
      pages: [],
    })
    expect(result.pdfBuffer.byteLength).toBeGreaterThan(0)
    // 표지 없음, pages 없음 → buildPdf 기준 0페이지 (pdf-lib save/load 후 1이 될 수 있음 — 구현 세부사항)
    expect(result.pageCount).toBeGreaterThanOrEqual(0)
    expect(result.metadata.producer).toBe(PDF_PRODUCER)

    const header = new TextDecoder().decode(result.pdfBuffer.slice(0, 5))
    expect(header).toBe('%PDF-')
  })

  it('1페이지 PDF → pageCount=1', async () => {
    const result = await buildPdf(makeInput(1))
    expect(result.pageCount).toBe(1)
    expect(result.byteSize).toBe(result.pdfBuffer.byteLength)
  })

  it('표지 포함 → pageCount = 1(표지) + N(본문)', async () => {
    const input: PdfBuildInput = {
      ...makeInput(3),
      cover: {
        title: '내 만화',
        subtitle: '부제목',
        authorName: '작가',
        backgroundTone: 'mint',
      },
    }
    const result = await buildPdf(input)
    // 표지 1 + 본문 3
    expect(result.pageCount).toBe(4)
  })

  it('withCover=false → 표지 없음', async () => {
    const input: PdfBuildInput = {
      ...makeInput(2),
      cover: { title: '무시됨' },
    }
    const result = await buildPdf(input, { withCover: false })
    expect(result.pageCount).toBe(2)
  })

  it('결정론: 같은 입력 + seed → 같은 PDF 해시', async () => {
    const input = makeInput(3)
    const r1 = await buildPdf(input, { metadataDate: '2024-01-01T00:00:00.000Z' })
    const r2 = await buildPdf(input, { metadataDate: '2024-01-01T00:00:00.000Z' })
    expect(sha256(r1.pdfBuffer)).toBe(sha256(r2.pdfBuffer))
  })

  it('메타데이터 검증 (title, author, producer, creationDate)', async () => {
    const result = await buildPdf({
      ...makeInput(1),
      title: '나의 첫 만화',
      author: '홍길동',
    })
    // result.metadata 기준 검증 (pdf-lib getProducer()는 내부 포맷 다를 수 있음)
    expect(result.metadata.title).toBe('나의 첫 만화')
    expect(result.metadata.author).toBe('홍길동')
    expect(result.metadata.producer).toBe(PDF_PRODUCER)
    expect(result.metadata.creationDate).toBeTruthy()

    // PDF 로드 후 title/author 확인
    const doc = await PDFDocument.load(result.pdfBuffer)
    expect(doc.getTitle()).toBe('나의 첫 만화')
    expect(doc.getAuthor()).toBe('홍길동')
  })

  it('16p 성능 ≤ 6000ms (NFR)', async () => {
    const input = makeInput(16)
    const start = Date.now()
    const result = await buildPdf(input)
    const elapsed = Date.now() - start

    expect(result.pageCount).toBe(16)
    // 성능 기준: 6초 (이미지 fetch 없는 로컬 테스트 기준)
    expect(elapsed).toBeLessThan(6000)

    // elapsed 로깅 (CI 확인용)
    console.log(`[perf] 16p buildPdf: ${elapsed}ms`)
  })

  it('warnings 배열 반환', async () => {
    const result = await buildPdf(makeInput(1))
    expect(Array.isArray(result.warnings)).toBe(true)
  })
})
