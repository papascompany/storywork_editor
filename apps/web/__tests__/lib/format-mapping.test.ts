/**
 * __tests__/lib/format-mapping.test.ts
 *
 * resolveFormatId 단위 테스트.
 */

import { describe, expect, it } from 'vitest'

import { KNOWN_PRESET_DB_IDS, resolveFormatId } from '../../lib/format-mapping'

describe('resolveFormatId', () => {
  it('preset:b5-novel → preset-b5-novel', () => {
    expect(resolveFormatId('preset:b5-novel')).toBe('preset-b5-novel')
  })

  it('preset:a5-artbook → preset-a5-artbook', () => {
    expect(resolveFormatId('preset:a5-artbook')).toBe('preset-a5-artbook')
  })

  it('preset:square → preset-square', () => {
    expect(resolveFormatId('preset:square')).toBe('preset-square')
  })

  it('preset:mobile-story → preset-mobile-story', () => {
    expect(resolveFormatId('preset:mobile-story')).toBe('preset-mobile-story')
  })

  it('cuid 형태는 그대로 통과', () => {
    const cuid = 'cma1234abcde5678fghij'
    expect(resolveFormatId(cuid)).toBe(cuid)
  })

  it('이미 하이픈 형태 (DB ID) 는 그대로 통과', () => {
    expect(resolveFormatId('preset-b5-novel')).toBe('preset-b5-novel')
  })

  it('알 수 없는 preset: 폴백 — 콜론 → 하이픈', () => {
    // 매핑 테이블 미등록 preset 이면 콜론 → 하이픈 폴백 적용
    expect(resolveFormatId('preset:unknown-new')).toBe('preset-unknown-new')
  })

  it('빈 문자열은 그대로 반환', () => {
    expect(resolveFormatId('')).toBe('')
  })
})

describe('KNOWN_PRESET_DB_IDS', () => {
  it('4종 preset ID 포함', () => {
    expect(KNOWN_PRESET_DB_IDS).toContain('preset-b5-novel')
    expect(KNOWN_PRESET_DB_IDS).toContain('preset-a5-artbook')
    expect(KNOWN_PRESET_DB_IDS).toContain('preset-square')
    expect(KNOWN_PRESET_DB_IDS).toContain('preset-mobile-story')
    expect(KNOWN_PRESET_DB_IDS).toHaveLength(4)
  })
})
