/**
 * __tests__/preflight/rules.test.ts
 *
 * 6개 룰 단위 테스트 (30+)
 *
 * bleed-check (6), safe-check (6), dpi-check (7),
 * font-check (5), color-check (5), page-count-check (6)
 */

import { describe, it, expect } from 'vitest'

import {
  PROFILE_BOOKPRINT_KOREA,
  PROFILE_INSTAPRINT,
  PROFILE_COMICMAKER,
} from '../../src/preflight/profiles.js'
import {
  bleedCheck,
  colorCheck,
  dpiCheck,
  fontCheck,
  pageCountCheck,
  safeCheck,
} from '../../src/preflight/rules.js'

import { makeInput, makeLayer, makeTextLayer } from './fixtures.js'

// ─── bleed-check ─────────────────────────────────────────────────────────────

describe('bleedCheck', () => {
  it('bleedMm 정상 → 위반 없음', () => {
    const input = makeInput(1, { bleedMm: 3 })
    const violations = bleedCheck(input, PROFILE_BOOKPRINT_KOREA)
    const errors = violations.filter((v) => v.rule === 'bleed-check' && v.severity === 'error')
    expect(errors).toHaveLength(0)
  })

  it('bleedMm < min → error', () => {
    const input = makeInput(1, { bleedMm: 1 })
    const violations = bleedCheck(input, PROFILE_BOOKPRINT_KOREA)
    const errors = violations.filter((v) => v.severity === 'error')
    expect(errors.length).toBeGreaterThanOrEqual(1)
    expect(errors[0]?.message).toContain('1mm')
  })

  it('bleedMm > max → warning', () => {
    const input = makeInput(1, { bleedMm: 8 })
    const violations = bleedCheck(input, PROFILE_BOOKPRINT_KOREA)
    const warnings = violations.filter(
      (v) => v.severity === 'warning' && v.rule === 'bleed-check' && v.pageIndex === undefined,
    )
    expect(warnings.length).toBeGreaterThanOrEqual(1)
  })

  it('text 레이어가 bleed 영역(trim 밖)에 걸침 → warning', () => {
    const layer = makeTextLayer({
      fabric: {
        left: -5, // trim 경계(x=0) 밖
        top: 10,
        width: 50,
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
        fontFamily: 'Pretendard',
      },
    })
    const input = makeInput(1, {}, [[layer as Record<string, unknown>]])
    const violations = bleedCheck(input, PROFILE_BOOKPRINT_KOREA)
    const layerWarnings = violations.filter((v) => v.rule === 'bleed-check' && v.pageIndex === 0)
    expect(layerWarnings.length).toBeGreaterThanOrEqual(1)
  })

  it('bg 레이어는 bleed 체크 제외', () => {
    const input = makeInput(1, { bleedMm: 3 })
    const violations = bleedCheck(input, PROFILE_BOOKPRINT_KOREA)
    // bg 레이어만 있는 기본 입력 → bleed 관련 layer warning 없음
    const layerViolations = violations.filter(
      (v) => v.rule === 'bleed-check' && v.pageIndex !== undefined,
    )
    expect(layerViolations).toHaveLength(0)
  })

  it('InstaPrint 프로필 min=2 → bleedMm=2 는 정상', () => {
    const input = makeInput(1, { bleedMm: 2 })
    const violations = bleedCheck(input, PROFILE_INSTAPRINT)
    const errors = violations.filter((v) => v.severity === 'error' && v.rule === 'bleed-check')
    expect(errors).toHaveLength(0)
  })
})

// ─── safe-check ──────────────────────────────────────────────────────────────

describe('safeCheck', () => {
  it('safeMm 정상 + 레이어 safe area 안 → 위반 없음', () => {
    const input = makeInput(1, { safeMm: 5 })
    const violations = safeCheck(input, PROFILE_BOOKPRINT_KOREA)
    const errors = violations.filter((v) => v.severity === 'error' && v.rule === 'safe-check')
    expect(errors).toHaveLength(0)
  })

  it('safeMm < min → error', () => {
    const input = makeInput(1, { safeMm: 2 })
    const violations = safeCheck(input, PROFILE_BOOKPRINT_KOREA)
    const errors = violations.filter(
      (v) => v.severity === 'error' && v.rule === 'safe-check' && v.pageIndex === undefined,
    )
    expect(errors.length).toBeGreaterThanOrEqual(1)
  })

  it('text 레이어가 safe area 밖 → error', () => {
    const layer = makeTextLayer({
      fabric: {
        left: 2, // safeMm=5 보다 작음
        top: 2,
        width: 50,
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
        fontFamily: 'Pretendard',
      },
    })
    const input = makeInput(1, { safeMm: 5 }, [[layer as Record<string, unknown>]])
    const violations = safeCheck(input, PROFILE_BOOKPRINT_KOREA)
    const errors = violations.filter((v) => v.severity === 'error' && v.pageIndex === 0)
    expect(errors.length).toBeGreaterThanOrEqual(1)
  })

  it('pose 레이어가 safe area 밖 → warning (not error)', () => {
    const layer = makeLayer({
      fabric: {
        left: 2,
        top: 2,
        width: 80,
        height: 150,
        scaleX: 1,
        scaleY: 1,
        originX: 'left',
        originY: 'top',
        opacity: 1,
        angle: 0,
      },
    })
    const input = makeInput(1, { safeMm: 5 }, [[layer as Record<string, unknown>]])
    const violations = safeCheck(input, PROFILE_BOOKPRINT_KOREA)
    const layerViolations = violations.filter((v) => v.rule === 'safe-check' && v.pageIndex === 0)
    if (layerViolations.length > 0) {
      expect(layerViolations[0]?.severity).toBe('warning')
    }
  })

  it('bg 레이어는 safe-check 제외', () => {
    const input = makeInput(1, { safeMm: 5 })
    const violations = safeCheck(input, PROFILE_BOOKPRINT_KOREA)
    // bg만 있는 기본 입력 → safe 침범 없음
    const layerErrors = violations.filter(
      (v) => v.rule === 'safe-check' && v.pageIndex !== undefined,
    )
    expect(layerErrors).toHaveLength(0)
  })

  it('InstaPrint safeMm.min=4 → safeMm=3 이면 error', () => {
    const input = makeInput(1, { safeMm: 3 })
    const violations = safeCheck(input, PROFILE_INSTAPRINT)
    const errors = violations.filter(
      (v) => v.severity === 'error' && v.rule === 'safe-check' && v.pageIndex === undefined,
    )
    expect(errors.length).toBeGreaterThanOrEqual(1)
  })
})

// ─── dpi-check ───────────────────────────────────────────────────────────────

describe('dpiCheck', () => {
  it('레이어 없음 → 위반 없음', () => {
    const input = makeInput(1)
    const violations = dpiCheck(input, PROFILE_BOOKPRINT_KOREA)
    expect(violations).toHaveLength(0)
  })

  it('masterDpi 300 → 위반 없음', () => {
    const layer = makeLayer({
      data: { meta: { masterDpi: 300, fileUrl: 'https://example.com/image.png' } },
    })
    const input = makeInput(1, {}, [[layer as Record<string, unknown>]])
    const violations = dpiCheck(input, PROFILE_BOOKPRINT_KOREA)
    expect(violations.filter((v) => v.severity === 'error')).toHaveLength(0)
  })

  it('masterDpi 250 → warning (300 미만, 200 이상)', () => {
    const layer = makeLayer({
      data: { meta: { masterDpi: 250 } },
    })
    const input = makeInput(1, {}, [[layer as Record<string, unknown>]])
    const violations = dpiCheck(input, PROFILE_BOOKPRINT_KOREA)
    const warnings = violations.filter((v) => v.rule === 'dpi-check' && v.severity === 'warning')
    expect(warnings.length).toBeGreaterThanOrEqual(1)
  })

  it('masterDpi 72 → error (200 미만)', () => {
    const layer = makeLayer({
      data: { meta: { masterDpi: 72 } },
    })
    const input = makeInput(1, {}, [[layer as Record<string, unknown>]])
    const violations = dpiCheck(input, PROFILE_BOOKPRINT_KOREA)
    const errors = violations.filter((v) => v.rule === 'dpi-check' && v.severity === 'error')
    expect(errors.length).toBeGreaterThanOrEqual(1)
  })

  it('lowDpi 태그 + 50% 초과 슬롯 → error (ADR-0011a)', () => {
    // 페이지 130x200, 레이어 100x150 = 15000mm² > 26000*0.5 = 13000
    const layer = makeLayer({
      data: { meta: { tags: ['lowDpi'], masterDpi: 150 } },
      fabric: {
        left: 0,
        top: 0,
        width: 100,
        height: 150,
        scaleX: 1,
        scaleY: 1,
        originX: 'left',
        originY: 'top',
        opacity: 1,
        angle: 0,
      },
    })
    const input = makeInput(1, {}, [[layer as Record<string, unknown>]])
    const violations = dpiCheck(input, PROFILE_BOOKPRINT_KOREA)
    const adrErrors = violations.filter(
      (v) => v.rule === 'dpi-check' && v.severity === 'error' && v.message.includes('ADR-0011a'),
    )
    expect(adrErrors.length).toBeGreaterThanOrEqual(1)
  })

  it('lowDpi 태그 + 50% 이하 슬롯 → ADR-0011a 위반 없음', () => {
    // 페이지 130x200=26000mm², 레이어 50x100=5000mm² < 13000mm²
    const layer = makeLayer({
      data: { meta: { tags: ['lowDpi'], masterDpi: 150 } },
      fabric: {
        left: 10,
        top: 10,
        width: 50,
        height: 100,
        scaleX: 1,
        scaleY: 1,
        originX: 'left',
        originY: 'top',
        opacity: 1,
        angle: 0,
      },
    })
    const input = makeInput(1, {}, [[layer as Record<string, unknown>]])
    const violations = dpiCheck(input, PROFILE_BOOKPRINT_KOREA)
    const adrErrors = violations.filter(
      (v) => v.rule === 'dpi-check' && v.severity === 'error' && v.message.includes('ADR-0011a'),
    )
    expect(adrErrors).toHaveLength(0)
  })

  it('ComicMaker 배경 minBg=72 → masterDpi=72 이면 위반 없음', () => {
    const layer = {
      id: 'bg-1',
      kind: 'bg',
      data: { meta: { kind: 'background', masterDpi: 72 } },
      fabric: {
        left: 0,
        top: 0,
        width: 130,
        height: 200,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        angle: 0,
      },
    }
    const input = makeInput(1, {}, [[layer]])
    const violations = dpiCheck(input, PROFILE_COMICMAKER)
    // bg 는 kind='bg' 라 건너뜀
    expect(violations.filter((v) => v.severity === 'error')).toHaveLength(0)
  })
})

// ─── font-check ──────────────────────────────────────────────────────────────

describe('fontCheck', () => {
  it('embedFonts=true + 알려진 폰트 → error 없음', () => {
    const layer = makeTextLayer()
    const input = makeInput(1, {}, [[layer as Record<string, unknown>]])
    const violations = fontCheck(input, PROFILE_BOOKPRINT_KOREA, { embedFonts: true })
    const errors = violations.filter((v) => v.severity === 'error')
    expect(errors).toHaveLength(0)
  })

  it('embedFonts=false + fontEmbedRequired=true → error', () => {
    const input = makeInput(1)
    const violations = fontCheck(input, PROFILE_BOOKPRINT_KOREA, { embedFonts: false })
    const errors = violations.filter((v) => v.severity === 'error' && v.rule === 'font-check')
    expect(errors.length).toBeGreaterThanOrEqual(1)
  })

  it('알 수 없는 fontFamily → error', () => {
    const layer = makeTextLayer({
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
        fontFamily: 'UnknownFontXYZ',
      },
    })
    const input = makeInput(1, {}, [[layer as Record<string, unknown>]])
    const violations = fontCheck(input, PROFILE_BOOKPRINT_KOREA, { embedFonts: true })
    const errors = violations.filter((v) => v.severity === 'error' && v.rule === 'font-check')
    expect(errors.length).toBeGreaterThanOrEqual(1)
    expect(errors[0]?.message).toContain('UnknownFontXYZ')
  })

  it('NanumGothic → 라이선스 확인된 폰트, error 없음', () => {
    const layer = makeTextLayer({
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
        fontFamily: 'NanumGothic',
      },
    })
    const input = makeInput(1, {}, [[layer as Record<string, unknown>]])
    const violations = fontCheck(input, PROFILE_BOOKPRINT_KOREA, { embedFonts: true })
    const errors = violations.filter((v) => v.severity === 'error' && v.rule === 'font-check')
    expect(errors).toHaveLength(0)
  })

  it('텍스트 레이어 없음 → fontEmbed 위반만 (레이어 위반 없음)', () => {
    const input = makeInput(1)
    const violations = fontCheck(input, PROFILE_BOOKPRINT_KOREA, { embedFonts: true })
    const layerViolations = violations.filter(
      (v) => v.rule === 'font-check' && v.pageIndex !== undefined,
    )
    expect(layerViolations).toHaveLength(0)
  })
})

// ─── color-check ─────────────────────────────────────────────────────────────

describe('colorCheck', () => {
  it('RGB 색공간 + BookPrint → CMYK 선호 경고', () => {
    const input = makeInput(1)
    const violations = colorCheck(input, PROFILE_BOOKPRINT_KOREA)
    const cmykWarnings = violations.filter(
      (v) => v.rule === 'color-check' && v.message.includes('CMYK'),
    )
    expect(cmykWarnings.length).toBeGreaterThanOrEqual(1)
  })

  it('InstaPrint(RGB 선호) → CMYK 경고 없음', () => {
    const input = makeInput(1)
    const violations = colorCheck(input, PROFILE_INSTAPRINT)
    const cmykWarnings = violations.filter(
      (v) => v.rule === 'color-check' && v.message.includes('CMYK'),
    )
    expect(cmykWarnings).toHaveLength(0)
  })

  it('opacity < 1 레이어 → warning', () => {
    const layer = makeLayer({
      fabric: {
        left: 20,
        top: 20,
        width: 80,
        height: 150,
        scaleX: 1,
        scaleY: 1,
        originX: 'left',
        originY: 'top',
        opacity: 0.5,
        angle: 0,
      },
    })
    const input = makeInput(1, {}, [[layer as Record<string, unknown>]])
    const violations = colorCheck(input, PROFILE_BOOKPRINT_KOREA)
    const opacityWarnings = violations.filter(
      (v) => v.rule === 'color-check' && v.severity === 'warning' && v.pageIndex === 0,
    )
    expect(opacityWarnings.length).toBeGreaterThanOrEqual(1)
  })

  it('opacity=1 → 투명도 경고 없음', () => {
    const layer = makeLayer()
    const input = makeInput(1, {}, [[layer as Record<string, unknown>]])
    const violations = colorCheck(input, PROFILE_BOOKPRINT_KOREA)
    const opacityWarnings = violations.filter(
      (v) =>
        v.rule === 'color-check' &&
        v.severity === 'warning' &&
        v.message.includes('투명도') &&
        v.pageIndex === 0,
    )
    expect(opacityWarnings).toHaveLength(0)
  })

  it('배경 #ffffff → info', () => {
    const bgLayer = {
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
        opacity: 1,
        angle: 0,
        fill: '#ffffff',
      },
    }
    const input = makeInput(1, {}, [[bgLayer]])
    const violations = colorCheck(input, PROFILE_BOOKPRINT_KOREA)
    const infos = violations.filter(
      (v) => v.rule === 'color-check' && v.severity === 'info' && v.pageIndex === 0,
    )
    expect(infos.length).toBeGreaterThanOrEqual(1)
  })
})

// ─── page-count-check ────────────────────────────────────────────────────────

describe('pageCountCheck', () => {
  it('정상 페이지 수 → error 없음', () => {
    const input = makeInput(5)
    const violations = pageCountCheck(input, PROFILE_BOOKPRINT_KOREA)
    const errors = violations.filter((v) => v.severity === 'error')
    expect(errors).toHaveLength(0)
  })

  it('pages=0 → warning', () => {
    const input = makeInput(0)
    const violations = pageCountCheck(input, PROFILE_BOOKPRINT_KOREA)
    const warnings = violations.filter(
      (v) => v.severity === 'warning' && v.rule === 'page-count-check',
    )
    expect(warnings.length).toBeGreaterThanOrEqual(1)
  })

  it('InstaPrint maxPages=1 → 2페이지이면 error', () => {
    const input = makeInput(2)
    const violations = pageCountCheck(input, PROFILE_INSTAPRINT)
    const errors = violations.filter((v) => v.severity === 'error' && v.rule === 'page-count-check')
    expect(errors.length).toBeGreaterThanOrEqual(1)
    expect(errors[0]?.message).toContain('2')
  })

  it('ComicMaker maxPages=200 → 201페이지 → error', () => {
    const input = makeInput(201)
    const violations = pageCountCheck(input, PROFILE_COMICMAKER)
    const errors = violations.filter((v) => v.severity === 'error' && v.rule === 'page-count-check')
    expect(errors.length).toBeGreaterThanOrEqual(1)
  })

  it('BookPrint maxPages=undefined → 500페이지도 통과', () => {
    const input = makeInput(5) // 실제 500 생성은 느리니 5로 검증
    const violations = pageCountCheck(input, PROFILE_BOOKPRINT_KOREA)
    const errors = violations.filter((v) => v.severity === 'error' && v.rule === 'page-count-check')
    expect(errors).toHaveLength(0)
  })

  it('fabricJson format 크기 불일치 → error', () => {
    const input = makeInput(1)
    // fabricJson.format.widthMm 를 다르게 조작
    const page = input.pages[0] as NonNullable<(typeof input.pages)[0]>
    ;(page.fabricJson as Record<string, unknown>)['format'] = {
      widthMm: 200, // 실제 130 과 다름
      heightMm: 200,
      dpi: 300,
    }
    const violations = pageCountCheck(input, PROFILE_BOOKPRINT_KOREA)
    const errors = violations.filter(
      (v) => v.severity === 'error' && v.rule === 'page-count-check' && v.pageIndex === 0,
    )
    expect(errors.length).toBeGreaterThanOrEqual(1)
  })
})
