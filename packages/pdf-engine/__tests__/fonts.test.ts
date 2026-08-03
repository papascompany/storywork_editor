/**
 * __tests__/fonts.test.ts
 *
 * 폰트 로더 + fontkit 임베드 회귀 테스트
 *
 * - 번들 Pretendard-Regular.otf 자동 발견 (env 없이)
 * - env 경로 실패 시 번들 폴백
 * - createRenderContext: fontkit 등록으로 실제 임베드 성공 (침묵 폴백 결함 회귀 방지)
 * - 한글 텍스트 buildPdf: 렌더 실패 경고 0 + Pretendard 서브셋 임베드 확인
 */

import { PDFDocument } from 'pdf-lib'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { buildPdf } from '../src/build.js'
import { loadPretendardFont, resetFontCache } from '../src/fonts.js'
import { createRenderContext } from '../src/render/page-renderer.js'
import type { PdfBuildInput } from '../src/types.js'

const ORIGINAL_ENV = process.env['PRETENDARD_TTF_PATH']

beforeEach(() => {
  resetFontCache()
  delete process.env['PRETENDARD_TTF_PATH']
})

afterEach(() => {
  resetFontCache()
  if (ORIGINAL_ENV === undefined) {
    delete process.env['PRETENDARD_TTF_PATH']
  } else {
    process.env['PRETENDARD_TTF_PATH'] = ORIGINAL_ENV
  }
})

function makeKoreanTextInput(): PdfBuildInput {
  return {
    formatId: 'b5-format',
    format: { widthMm: 130, heightMm: 200, dpi: 300, bleedMm: 3, safeMm: 5 },
    title: '한글 폰트 스모크',
    author: '작가',
    seed: 0,
    pages: [
      {
        pageIndex: 0,
        fabricJson: {
          v: 1,
          format: { id: 'b5', widthMm: 130, heightMm: 200, dpi: 300 },
          layers: [
            {
              id: 'txt-0',
              kind: 'text',
              data: {},
              fabric: {
                left: 10,
                top: 20,
                width: 100,
                height: 12,
                scaleX: 1,
                scaleY: 1,
                originX: 'left',
                originY: 'top',
                opacity: 1,
                angle: 0,
                text: '안녕하세요 스토리워크',
                fontSize: 14,
                fill: '#222222',
                fontFamily: 'Pretendard',
              },
            },
          ],
        },
      },
    ],
  }
}

describe('loadPretendardFont', () => {
  it('env 없이 번들 폰트 자동 발견', async () => {
    const bytes = await loadPretendardFont()
    expect(bytes).not.toBeNull()
    expect(bytes?.byteLength ?? 0).toBeGreaterThan(100_000)
  })

  it('env 경로가 깨져도 번들 폰트로 폴백', async () => {
    process.env['PRETENDARD_TTF_PATH'] = '/nonexistent/path/font.ttf'
    const bytes = await loadPretendardFont()
    expect(bytes).not.toBeNull()
  })
})

describe('createRenderContext 폰트 임베드', () => {
  it('fontkit 등록으로 임베드 성공 — embedFont non-null, 경고 0', async () => {
    const bytes = await loadPretendardFont()
    expect(bytes).not.toBeNull()

    const doc = await PDFDocument.create()
    const ctx = await createRenderContext(doc, 3, 200, bytes)
    expect(ctx.embedFont).not.toBeNull()
    expect(ctx.warnings).toHaveLength(0)
  })

  it('깨진 폰트 바이트 → Helvetica 폴백 + 경고 1', async () => {
    const doc = await PDFDocument.create()
    const ctx = await createRenderContext(doc, 3, 200, new Uint8Array([0, 1, 2, 3]))
    expect(ctx.embedFont).toBeNull()
    expect(ctx.warnings).toHaveLength(1)
    expect(ctx.warnings[0]).toContain('폰트 임베드 실패')
  })
})

describe('buildPdf 한글 렌더', () => {
  it('한글 텍스트 렌더 실패 경고 없음 + Pretendard 서브셋 임베드', async () => {
    const result = await buildPdf(makeKoreanTextInput(), {
      metadataDate: '2024-01-01T00:00:00.000Z',
    })
    const renderFailures = result.warnings.filter((w) => w.includes('텍스트 렌더 실패'))
    expect(renderFailures).toHaveLength(0)

    const pdfText = new TextDecoder('latin1').decode(result.pdfBuffer)
    expect(pdfText).toContain('Pretendard')
  })
})
