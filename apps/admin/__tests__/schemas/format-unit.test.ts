/**
 * format-unit.test.ts — 판형 단위계 검증 (MODE-02 / ADR-0017)
 *
 * 검증 항목:
 *  - unit 기본값 mm (기존 입력 하위호환)
 *  - 단위별 치수 범위: mm 50~500 · px 200~8192
 *  - px 판형은 bleed/safe 0 강제 (인쇄 개념 — 값이 있으면 인쇄 경로 오용의 씨앗)
 *  - PATCH 스키마는 unit 을 받지 않는다 (단위계는 생성 시 확정)
 */
import { describe, expect, it } from 'vitest'

import { formatInputSchemaWithUnitCheck, formatPatchSchema } from '../../src/lib/schemas/format'

const BASE_MM = {
  name: 'B5 단행본',
  widthMm: 130,
  heightMm: 200,
  dpi: 300 as const,
}

const BASE_PX = {
  name: '웹툰 표준 690px',
  unit: 'px' as const,
  widthMm: 690,
  heightMm: 1280,
  dpi: 72 as const,
  bleedMm: 0,
  safeMm: 0,
}

describe('formatInputSchemaWithUnitCheck — 단위계 (MODE-02)', () => {
  it('unit 미지정은 mm 기본값 (기존 입력 하위호환)', () => {
    const parsed = formatInputSchemaWithUnitCheck.parse(BASE_MM)
    expect(parsed.unit).toBe('mm')
  })

  it('mm 판형은 50~500 범위를 지킨다', () => {
    expect(formatInputSchemaWithUnitCheck.safeParse({ ...BASE_MM, widthMm: 40 }).success).toBe(
      false,
    )
    expect(formatInputSchemaWithUnitCheck.safeParse({ ...BASE_MM, heightMm: 600 }).success).toBe(
      false,
    )
  })

  it('px 판형은 200~8192 범위 — mm 상한(500)을 넘는 690px 이 유효하다', () => {
    expect(formatInputSchemaWithUnitCheck.safeParse(BASE_PX).success).toBe(true)
    expect(formatInputSchemaWithUnitCheck.safeParse({ ...BASE_PX, widthMm: 100 }).success).toBe(
      false,
    )
    expect(formatInputSchemaWithUnitCheck.safeParse({ ...BASE_PX, heightMm: 9000 }).success).toBe(
      false,
    )
  })

  it('px 판형에 재단/안전 여백이 있으면 거부한다 (인쇄 개념)', () => {
    const r = formatInputSchemaWithUnitCheck.safeParse({ ...BASE_PX, bleedMm: 3 })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.bleedMm?.[0]).toContain('px(웹툰)')
    }
  })
})

describe('formatPatchSchema — unit 불변 (MODE-02)', () => {
  it('unit 을 보내도 무시된다 — 단위계는 생성 시 확정', () => {
    // 단위계를 바꾸면 이 판형을 참조하는 기존 프로젝트의 치수 해석이 통째로 바뀐다
    const parsed = formatPatchSchema.parse({ unit: 'px', widthMm: 200 })
    expect('unit' in parsed).toBe(false)
    expect(parsed.widthMm).toBe(200)
  })
})
