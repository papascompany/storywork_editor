/**
 * 표지(Cover) 설정 Zod 스키마 검증 테스트
 *
 * Format 기본값(coverEnabled/coverWidthMm/coverHeightMm/isActive) +
 * TemplateSet 오버라이드(상속=null tri-state) 검증.
 */
import { describe, expect, it } from 'vitest'

import { formatInputSchema } from '../../src/lib/schemas/format'
import { templateSetUpsertSchema } from '../../src/lib/schemas/template'

const BASE_FORMAT = {
  name: 'B5 단행본',
  widthMm: 130,
  heightMm: 200,
  dpi: 300 as const,
  bleedMm: 3,
  safeMm: 5,
  gridDef: {},
}

describe('formatInputSchema — 표지 설정', () => {
  it('coverEnabled 생략 시 기본값 false', () => {
    const parsed = formatInputSchema.parse(BASE_FORMAT)
    expect(parsed.coverEnabled).toBe(false)
  })

  it('isActive 생략 시 기본값 true', () => {
    const parsed = formatInputSchema.parse(BASE_FORMAT)
    expect(parsed.isActive).toBe(true)
  })

  it('coverEnabled true / isActive false 를 받는다', () => {
    const parsed = formatInputSchema.parse({
      ...BASE_FORMAT,
      coverEnabled: true,
      isActive: false,
    })
    expect(parsed.coverEnabled).toBe(true)
    expect(parsed.isActive).toBe(false)
  })

  it('coverWidthMm 빈 문자열("") → null 로 정규화', () => {
    const parsed = formatInputSchema.parse({ ...BASE_FORMAT, coverWidthMm: '' })
    expect(parsed.coverWidthMm).toBeNull()
  })

  it('coverWidthMm 생략 → undefined (상속)', () => {
    const parsed = formatInputSchema.parse(BASE_FORMAT)
    expect(parsed.coverWidthMm).toBeUndefined()
  })

  it('coverWidthMm 유효 숫자(420) 통과', () => {
    const parsed = formatInputSchema.parse({ ...BASE_FORMAT, coverWidthMm: 420 })
    expect(parsed.coverWidthMm).toBe(420)
  })

  it('coverWidthMm 하한 미만(5) → 실패', () => {
    const r = formatInputSchema.safeParse({ ...BASE_FORMAT, coverWidthMm: 5 })
    expect(r.success).toBe(false)
  })

  it('coverHeightMm 상한 초과(2000) → 실패', () => {
    const r = formatInputSchema.safeParse({ ...BASE_FORMAT, coverHeightMm: 2000 })
    expect(r.success).toBe(false)
  })
})

describe('templateSetUpsertSchema — 표지 오버라이드', () => {
  const BASE_SET = { name: '24p 책 세트', templateIds: ['t1', 't2'], coverIdx: 0 }

  it('coverEnabled 생략 → undefined (상속)', () => {
    const parsed = templateSetUpsertSchema.parse(BASE_SET)
    expect(parsed.coverEnabled).toBeUndefined()
  })

  it('coverEnabled = null (명시적 상속) 허용', () => {
    const parsed = templateSetUpsertSchema.parse({ ...BASE_SET, coverEnabled: null })
    expect(parsed.coverEnabled).toBeNull()
  })

  it('coverEnabled tri-state: true / false 허용', () => {
    expect(templateSetUpsertSchema.parse({ ...BASE_SET, coverEnabled: true }).coverEnabled).toBe(
      true,
    )
    expect(templateSetUpsertSchema.parse({ ...BASE_SET, coverEnabled: false }).coverEnabled).toBe(
      false,
    )
  })

  it('coverWidthMm "" → null', () => {
    const parsed = templateSetUpsertSchema.parse({ ...BASE_SET, coverWidthMm: '' })
    expect(parsed.coverWidthMm).toBeNull()
  })

  it('coverWidthMm 오버라이드 숫자(408) 통과', () => {
    const parsed = templateSetUpsertSchema.parse({ ...BASE_SET, coverWidthMm: 408 })
    expect(parsed.coverWidthMm).toBe(408)
  })

  it('coverWidthMm 범위 밖(9) → 실패', () => {
    const r = templateSetUpsertSchema.safeParse({ ...BASE_SET, coverWidthMm: 9 })
    expect(r.success).toBe(false)
  })

  it('isActive 생략 시 기본값 true', () => {
    const parsed = templateSetUpsertSchema.parse(BASE_SET)
    expect(parsed.isActive).toBe(true)
  })
})
