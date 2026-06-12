/**
 * cover-config — 표지 해석 규칙 단위 테스트 (FOLLOWUP-COVER-02)
 *
 * 해석 규칙: set.override ?? format.default ?? 판형 치수
 */
import { describe, expect, it } from 'vitest'

import { effectivePageFormat, resolveCoverConfig } from '@/lib/cover-config'

const BASE = { widthMm: 130, heightMm: 200 }

describe('resolveCoverConfig — Format 단독', () => {
  it('coverEnabled=false → null', () => {
    expect(resolveCoverConfig({ ...BASE, coverEnabled: false })).toBeNull()
  })

  it('coverEnabled 미지정(undefined/null) → null', () => {
    expect(resolveCoverConfig({ ...BASE })).toBeNull()
    expect(resolveCoverConfig({ ...BASE, coverEnabled: null })).toBeNull()
  })

  it('coverEnabled=true + 독립 치수 → 독립 치수 반환', () => {
    expect(
      resolveCoverConfig({ ...BASE, coverEnabled: true, coverWidthMm: 420, coverHeightMm: 210 }),
    ).toEqual({ widthMm: 420, heightMm: 210 })
  })

  it('coverEnabled=true + 치수 null → 판형 치수 상속', () => {
    expect(
      resolveCoverConfig({ ...BASE, coverEnabled: true, coverWidthMm: null, coverHeightMm: null }),
    ).toEqual({ widthMm: 130, heightMm: 200 })
  })

  it('폭만 독립, 높이는 상속 (부분 지정)', () => {
    expect(resolveCoverConfig({ ...BASE, coverEnabled: true, coverWidthMm: 408 })).toEqual({
      widthMm: 408,
      heightMm: 200,
    })
  })
})

describe('resolveCoverConfig — TemplateSet 오버라이드 (tri-state)', () => {
  const FMT = { ...BASE, coverEnabled: true, coverWidthMm: 420, coverHeightMm: 210 }

  it('set.coverEnabled=null(상속) → format 값 사용', () => {
    expect(resolveCoverConfig(FMT, { coverEnabled: null })).toEqual({
      widthMm: 420,
      heightMm: 210,
    })
  })

  it('set.coverEnabled=false → format 이 true 여도 미사용', () => {
    expect(resolveCoverConfig(FMT, { coverEnabled: false })).toBeNull()
  })

  it('set.coverEnabled=true → format 이 false 여도 사용 (치수는 format→판형 상속)', () => {
    expect(resolveCoverConfig({ ...BASE, coverEnabled: false }, { coverEnabled: true })).toEqual({
      widthMm: 130,
      heightMm: 200,
    })
  })

  it('set 치수 오버라이드 우선', () => {
    expect(resolveCoverConfig(FMT, { coverWidthMm: 500 })).toEqual({
      widthMm: 500,
      heightMm: 210,
    })
  })
})

describe('effectivePageFormat — 페이지별 유효 판형', () => {
  const FORMAT = { name: 'B5', widthMm: 130, heightMm: 200, dpi: 300 }
  const COVER = { widthMm: 420, heightMm: 210 }

  it('cover 설정 + index 0 → 표지 치수 (dpi 등 나머지 유지)', () => {
    const eff = effectivePageFormat(FORMAT, COVER, 0)
    expect(eff.widthMm).toBe(420)
    expect(eff.heightMm).toBe(210)
    expect(eff.dpi).toBe(300)
    expect(eff.name).toBe('B5')
  })

  it('cover 설정 + index 1(본문) → 판형 치수', () => {
    expect(effectivePageFormat(FORMAT, COVER, 1)).toEqual(FORMAT)
  })

  it('cover null/undefined → 항상 판형 치수', () => {
    expect(effectivePageFormat(FORMAT, null, 0)).toEqual(FORMAT)
    expect(effectivePageFormat(FORMAT, undefined, 0)).toEqual(FORMAT)
  })
})
