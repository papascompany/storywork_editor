/**
 * __tests__/cover-dims.test.ts
 *
 * FOLLOWUP-COVER-03 — 페이지별 치수 오버라이드(표지) 테스트
 *
 * - pages[0].dims → 해당 페이지만 표지 치수(MediaBox/TrimBox), 본문은 판형 치수
 * - y-flip 정합: 표지 페이지 높이 기준으로 ctx.pageHeightPt 동기화
 * - 결정론: 동일 입력 + seed → 동일 바이트
 * - preflight: 표지 페이지의 fabricJson 치수가 dims 와 일치하면 위반 없음
 */

import { createHash } from 'node:crypto'

import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'

import { buildPdf } from '../src/build.js'
import { preflight } from '../src/preflight/check.js'
import type { PdfBuildInput, PageInput } from '../src/types.js'
import { MM_TO_PT } from '../src/types.js'

// ─── 픽스처 ──────────────────────────────────────────────────────────────────

const FORMAT = { widthMm: 130, heightMm: 200, dpi: 300, bleedMm: 3, safeMm: 5 }
const COVER = { widthMm: 266, heightMm: 206 } // 표지 펼침 치수 예시

function page(
  index: number,
  widthMm: number,
  heightMm: number,
  dims?: PageInput['dims'],
): PageInput {
  return {
    pageIndex: index,
    fabricJson: {
      v: 1,
      format: { id: 'b5', widthMm, heightMm, dpi: 300 },
      layers: [
        {
          id: `bg-${index}`,
          kind: 'bg',
          data: {},
          fabric: {
            left: 0,
            top: 0,
            width: widthMm,
            height: heightMm,
            scaleX: 1,
            scaleY: 1,
            originX: 'left',
            originY: 'top',
            opacity: 1,
            angle: 0,
            fill: '#fffaf2',
          },
        },
      ],
    },
    ...(dims ? { dims } : {}),
  }
}

function makeCoverInput(): PdfBuildInput {
  return {
    formatId: 'b5-format',
    format: FORMAT,
    title: '표지 테스트',
    pages: [
      page(0, COVER.widthMm, COVER.heightMm, COVER), // 표지 — 독립 치수
      page(1, FORMAT.widthMm, FORMAT.heightMm), // 본문
      page(2, FORMAT.widthMm, FORMAT.heightMm),
    ],
    seed: 7,
  }
}

function sha256(buf: Uint8Array): string {
  return createHash('sha256').update(buf).digest('hex')
}

// ─── buildPdf ────────────────────────────────────────────────────────────────

describe('buildPdf — 표지 독립 치수 (pages[].dims)', () => {
  it('표지 페이지만 cover 치수, 본문은 판형 치수 (MediaBox)', async () => {
    const result = await buildPdf(makeCoverInput())
    expect(result.pageCount).toBe(3)

    const doc = await PDFDocument.load(result.pdfBuffer)

    const coverPage = doc.getPage(0)
    const bodyPage = doc.getPage(1)

    const expCoverW = (COVER.widthMm + 2 * FORMAT.bleedMm) * MM_TO_PT
    const expCoverH = (COVER.heightMm + 2 * FORMAT.bleedMm) * MM_TO_PT
    const expBodyW = (FORMAT.widthMm + 2 * FORMAT.bleedMm) * MM_TO_PT
    const expBodyH = (FORMAT.heightMm + 2 * FORMAT.bleedMm) * MM_TO_PT

    expect(coverPage.getWidth()).toBeCloseTo(expCoverW, 1)
    expect(coverPage.getHeight()).toBeCloseTo(expCoverH, 1)
    expect(bodyPage.getWidth()).toBeCloseTo(expBodyW, 1)
    expect(bodyPage.getHeight()).toBeCloseTo(expBodyH, 1)
  })

  it('dims 없으면 기존 동작과 동일 (전 페이지 판형 치수)', async () => {
    const input = makeCoverInput()
    input.pages = input.pages.map((p) => ({ ...p, dims: undefined }))
    const result = await buildPdf(input)
    const doc = await PDFDocument.load(result.pdfBuffer)
    const expW = (FORMAT.widthMm + 2 * FORMAT.bleedMm) * MM_TO_PT
    expect(doc.getPage(0).getWidth()).toBeCloseTo(expW, 1)
    expect(doc.getPage(1).getWidth()).toBeCloseTo(expW, 1)
  })

  it('결정론: 동일 입력 + seed → 동일 PDF 바이트', async () => {
    const a = await buildPdf(makeCoverInput())
    const b = await buildPdf(makeCoverInput())
    expect(sha256(a.pdfBuffer)).toBe(sha256(b.pdfBuffer))
  })

  it('표지 다음 본문 페이지의 y-flip 이 본문 높이로 복원된다 (순차 렌더 ctx 동기화)', async () => {
    // 표지(206mm 높이) 렌더 후 본문(200mm) 렌더 — 본문 bg 레이어가
    // 본문 페이지 전체를 덮는지 TrimBox 로 간접 검증 (좌표 오류 시 빌드 자체가 어긋남)
    const result = await buildPdf(makeCoverInput())
    const doc = await PDFDocument.load(result.pdfBuffer)
    const body = doc.getPage(1)
    const trim = body.getTrimBox()
    expect(trim.width).toBeCloseTo(FORMAT.widthMm * MM_TO_PT, 1)
    expect(trim.height).toBeCloseTo(FORMAT.heightMm * MM_TO_PT, 1)
  })
})

// ─── preflight ───────────────────────────────────────────────────────────────

describe('preflight — 표지 독립 치수', () => {
  it('표지 fabricJson 치수가 dims 와 일치하면 page-count-check 위반 없음', async () => {
    const reports = await preflight(makeCoverInput(), 'bookprint-korea')
    const violations = reports.flatMap((r) => [...r.errors, ...r.warnings])
    const mismatch = violations.filter((v) => v.rule === 'page-count-check')
    expect(mismatch).toHaveLength(0)
  })

  it('dims 없이 표지 치수 fabricJson 이면 page-count-check error (기존 무결성 유지)', async () => {
    const input = makeCoverInput()
    input.pages = input.pages.map((p) => ({ ...p, dims: undefined }))
    const reports = await preflight(input, 'bookprint-korea')
    const errors = reports.flatMap((r) => r.errors).filter((v) => v.rule === 'page-count-check')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]?.pageIndex).toBe(0)
  })
})
