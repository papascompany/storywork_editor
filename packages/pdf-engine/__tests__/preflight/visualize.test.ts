/**
 * __tests__/preflight/visualize.test.ts
 *
 * buildPreflightPdf() 시각화 PDF 생성 테스트 (3+)
 */

import { describe, it, expect } from 'vitest'

import { preflight } from '../../src/preflight/check.js'
import { buildPreflightPdf } from '../../src/preflight/visualize.js'

import { makeInput, makeLayer, makeTextLayer } from './fixtures.js'

describe('buildPreflightPdf', () => {
  it('정상 입력 → PDF 바이트 생성', async () => {
    const input = makeInput(3)
    const reports = await preflight(input, 'bookprint-korea')
    const report = reports[0]
    if (!report) throw new Error('report is undefined')

    const pdfBytes = await buildPreflightPdf(input, report)
    expect(pdfBytes.byteLength).toBeGreaterThan(0)
    // PDF 헤더 확인
    const header = new TextDecoder().decode(pdfBytes.slice(0, 5))
    expect(header).toBe('%PDF-')
  })

  it('위반 있는 입력 → 시각화 PDF (에러 박스 포함)', async () => {
    const lowDpiLayer = makeLayer({
      data: { meta: { tags: ['lowDpi'], masterDpi: 72 } },
      fabric: {
        left: 0,
        top: 0,
        width: 110,
        height: 170,
        scaleX: 1,
        scaleY: 1,
        originX: 'left',
        originY: 'top',
        opacity: 0.5,
        angle: 0,
      },
    })
    const unknownFontLayer = makeTextLayer({
      fabric: {
        left: 2,
        top: 2,
        width: 100,
        height: 20,
        scaleX: 1,
        scaleY: 1,
        originX: 'left',
        originY: 'top',
        opacity: 1,
        angle: 0,
        text: '위반 텍스트',
        fontSize: 14,
        fill: '#000',
        fontFamily: 'IllegalFont',
      },
    })
    const input = makeInput(2, { bleedMm: 1, safeMm: 2 }, [
      [lowDpiLayer as Record<string, unknown>],
      [unknownFontLayer as Record<string, unknown>],
    ])
    const reports = await preflight(input, 'bookprint-korea', { embedFonts: true })
    const report = reports[0]
    if (!report) throw new Error('report is undefined')

    expect(report.ok).toBe(false)
    expect(report.errors.length).toBeGreaterThan(0)

    const pdfBytes = await buildPreflightPdf(input, report)
    expect(pdfBytes.byteLength).toBeGreaterThan(0)
    // 위반이 있으므로 report cover + overlay pages + violation list → 최소 2000 바이트
    expect(pdfBytes.byteLength).toBeGreaterThan(2000)
  })

  it('ok=true 리포트 → PASS 표지 포함 PDF', async () => {
    // BookPrint 정상 입력 — color-check warning 은 허용
    const input = makeInput(2)
    const reports = await preflight(input, 'bookprint-korea', { embedFonts: true })
    const report = reports[0]
    if (!report) throw new Error('report is undefined')

    const pdfBytes = await buildPreflightPdf(input, report)
    expect(pdfBytes.byteLength).toBeGreaterThan(0)
  })
})
