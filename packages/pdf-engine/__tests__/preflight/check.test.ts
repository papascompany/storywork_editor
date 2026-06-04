/**
 * __tests__/preflight/check.test.ts
 *
 * preflight() API 통합 테스트
 * 골든 5 시나리오:
 *   G1: 완벽한 입력 → 모든 프로필 ok=true (에러 없음)
 *   G2: bleed 부족 → error 포함, ok=false
 *   G3: InstaPrint 2페이지 → maxPages 위반 error
 *   G4: lowDpi 자산 페이지 과점 → ADR-0011a error
 *   G5: 미임베드 폰트 + 알 수 없는 fontFamily → error
 */

import { describe, it, expect } from 'vitest'

import { preflight } from '../../src/preflight/check.js'

import { makeInput, makeLayer, makeTextLayer } from './fixtures.js'

// ─── G1: 완벽한 입력 ──────────────────────────────────────────────────────────

describe('preflight — G1 완벽한 입력', () => {
  it('모든 프로필 반환 (3개)', async () => {
    const input = makeInput(5)
    const reports = await preflight(input)
    expect(reports).toHaveLength(3)
  })

  it('BookPrint: color-check 외 error 없음', async () => {
    const input = makeInput(5)
    const reports = await preflight(input, 'bookprint-korea', { embedFonts: true })
    const report = reports[0]
    expect(report).toBeDefined()
    if (!report) return
    // CMYK 경고는 허용 (warning), error 는 없어야 함
    const nonCmykErrors = report.errors.filter((e) => e.rule !== 'color-check')
    expect(nonCmykErrors).toHaveLength(0)
  })

  it('단일 profileId 지정 → 1개 리포트 반환', async () => {
    const input = makeInput(3)
    const reports = await preflight(input, 'instaprint')
    // instaprint maxPages=1 위반이지만 리포트 수는 1개
    expect(reports).toHaveLength(1)
    expect(reports[0]?.profileId).toBe('instaprint')
  })

  it('알 수 없는 profileId → ok=false + error 메시지', async () => {
    const input = makeInput(1)
    const reports = await preflight(input, 'nonexistent-profile')
    expect(reports).toHaveLength(1)
    expect(reports[0]?.ok).toBe(false)
  })

  it('PreflightReport 구조 필드 완전성', async () => {
    const input = makeInput(2)
    const reports = await preflight(input, 'comicmaker')
    const report = reports[0]
    expect(report).toBeDefined()
    if (!report) return
    expect(typeof report.profileId).toBe('string')
    expect(typeof report.profileName).toBe('string')
    expect(typeof report.ok).toBe('boolean')
    expect(Array.isArray(report.errors)).toBe(true)
    expect(Array.isArray(report.warnings)).toBe(true)
    expect(Array.isArray(report.infos)).toBe(true)
    expect(typeof report.metadata.totalPages).toBe('number')
    expect(typeof report.metadata.checkedAt).toBe('string')
  })
})

// ─── G2: bleed 부족 ───────────────────────────────────────────────────────────

describe('preflight — G2 bleed 부족', () => {
  it('bleedMm=1 → BookPrint error 포함', async () => {
    const input = makeInput(3, { bleedMm: 1 })
    const reports = await preflight(input, 'bookprint-korea')
    const report = reports[0]
    expect(report?.ok).toBe(false)
    const bleedErrors = report?.errors.filter((e) => e.rule === 'bleed-check') ?? []
    expect(bleedErrors.length).toBeGreaterThanOrEqual(1)
  })

  it('bleedMm=1 → ComicMaker 도 error', async () => {
    const input = makeInput(3, { bleedMm: 1 })
    const reports = await preflight(input, 'comicmaker')
    expect(reports[0]?.ok).toBe(false)
  })

  it('모든 프로필 검증 시 모두 bleed error', async () => {
    const input = makeInput(2, { bleedMm: 0 })
    const reports = await preflight(input)
    for (const report of reports) {
      const bleedErrors = report.errors.filter((e) => e.rule === 'bleed-check')
      expect(bleedErrors.length).toBeGreaterThanOrEqual(1)
    }
  })
})

// ─── G3: InstaPrint 2페이지 ───────────────────────────────────────────────────

describe('preflight — G3 InstaPrint maxPages 위반', () => {
  it('2페이지 → InstaPrint maxPages=1 error', async () => {
    const input = makeInput(2, { bleedMm: 2, safeMm: 4 })
    const reports = await preflight(input, 'instaprint')
    const report = reports[0]
    expect(report?.ok).toBe(false)
    const countErrors = report?.errors.filter((e) => e.rule === 'page-count-check') ?? []
    expect(countErrors.length).toBeGreaterThanOrEqual(1)
    expect(countErrors[0]?.message).toContain('2')
  })

  it('1페이지 → InstaPrint 비치명 에러 없음', async () => {
    const input = makeInput(1, { bleedMm: 2, safeMm: 4 })
    const reports = await preflight(input, 'instaprint', { embedFonts: true })
    const report = reports[0]
    // InstaPrint RGB 선호 → CMYK 경고 없음, page-count 정상
    const criticalErrors = report?.errors.filter((e) => e.rule !== 'color-check') ?? []
    expect(criticalErrors).toHaveLength(0)
  })
})

// ─── G4: lowDpi 자산 페이지 과점 ─────────────────────────────────────────────

describe('preflight — G4 ADR-0011a lowDpi 슬롯 위반', () => {
  it('lowDpi + 페이지 60% → error', async () => {
    // 130*200=26000mm², 레이어 110*170=18700 > 13000 (50%)
    const lowDpiLayer = makeLayer({
      data: { meta: { tags: ['lowDpi'], masterDpi: 150 } },
      fabric: {
        left: 0,
        top: 0,
        width: 110,
        height: 170,
        scaleX: 1,
        scaleY: 1,
        originX: 'left',
        originY: 'top',
        opacity: 1,
        angle: 0,
      },
    })
    const input = makeInput(1, {}, [[lowDpiLayer as Record<string, unknown>]])
    const reports = await preflight(input, 'bookprint-korea')
    const report = reports[0]
    const adrErrors =
      report?.errors.filter((e) => e.rule === 'dpi-check' && e.message.includes('ADR-0011a')) ?? []
    expect(adrErrors.length).toBeGreaterThanOrEqual(1)
  })

  it('lowDpi + 페이지 30% → ADR-0011a 위반 없음', async () => {
    // 50*80=4000 < 13000
    const lowDpiLayer = makeLayer({
      data: { meta: { tags: ['lowDpi'], masterDpi: 150 } },
      fabric: {
        left: 10,
        top: 10,
        width: 50,
        height: 80,
        scaleX: 1,
        scaleY: 1,
        originX: 'left',
        originY: 'top',
        opacity: 1,
        angle: 0,
      },
    })
    const input = makeInput(1, {}, [[lowDpiLayer as Record<string, unknown>]])
    const reports = await preflight(input, 'bookprint-korea')
    const report = reports[0]
    const adrErrors =
      report?.errors.filter((e) => e.rule === 'dpi-check' && e.message.includes('ADR-0011a')) ?? []
    expect(adrErrors).toHaveLength(0)
  })
})

// ─── G5: 폰트 위반 ────────────────────────────────────────────────────────────

describe('preflight — G5 폰트 위반', () => {
  it('미임베드 폰트 (embedFonts=false) → error', async () => {
    const input = makeInput(1)
    const reports = await preflight(input, 'bookprint-korea', { embedFonts: false })
    const report = reports[0]
    const fontErrors = report?.errors.filter((e) => e.rule === 'font-check') ?? []
    expect(fontErrors.length).toBeGreaterThanOrEqual(1)
  })

  it('알 수 없는 fontFamily → error', async () => {
    const unknownFontLayer = makeTextLayer({
      fabric: {
        left: 10,
        top: 10,
        width: 100,
        height: 20,
        scaleX: 1,
        scaleY: 1,
        originX: 'left',
        originY: 'top',
        opacity: 1,
        angle: 0,
        text: '안녕',
        fontSize: 14,
        fill: '#000',
        fontFamily: 'MySecretFont',
      },
    })
    const input = makeInput(1, {}, [[unknownFontLayer as Record<string, unknown>]])
    const reports = await preflight(input, 'bookprint-korea', { embedFonts: true })
    const report = reports[0]
    const fontErrors = report?.errors.filter((e) => e.rule === 'font-check') ?? []
    expect(fontErrors.length).toBeGreaterThanOrEqual(1)
  })

  it('ok=false 이면 errors 배열이 비어있지 않음', async () => {
    const unknownFontLayer = makeTextLayer({
      fabric: {
        left: 10,
        top: 10,
        width: 100,
        height: 20,
        scaleX: 1,
        scaleY: 1,
        originX: 'left',
        originY: 'top',
        opacity: 1,
        angle: 0,
        text: '안녕',
        fontSize: 14,
        fill: '#000',
        fontFamily: 'IllegalFont',
      },
    })
    const input = makeInput(1, {}, [[unknownFontLayer as Record<string, unknown>]])
    const reports = await preflight(input, 'bookprint-korea', { embedFonts: true })
    const report = reports[0]
    if (report && !report.ok) {
      expect(report.errors.length).toBeGreaterThan(0)
    }
  })
})
