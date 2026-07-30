/**
 * keypoint-normalize.test.ts — KP 규약 통일 회귀 테스트 (2026-07-30)
 *
 * admin 구 규약(10종 하이픈 + waist)으로 저장된 레거시 keypoints 가
 * shared-schema 25종 언더스코어 규약으로 정규화되어 검증을 통과하는지 확인.
 */
import { describe, expect, it } from 'vitest'

import { KP_NAMES, keypointSchema, normalizeKpName } from '../../src/lib/schemas/resource'

describe('KP 규약 통일 — 레거시 정규화', () => {
  it('KP_NAMES 는 shared-schema 25종 언더스코어 규약', () => {
    expect(KP_NAMES).toHaveLength(25)
    expect(KP_NAMES).toContain('left_shoulder')
    expect(KP_NAMES).not.toContain('left-shoulder')
    expect(KP_NAMES).not.toContain('waist')
  })

  it('하이픈 레거시 이름은 언더스코어로 정규화되어 파싱 통과', () => {
    const parsed = keypointSchema.parse({ name: 'left-shoulder', x: 0.3, y: 0.4 })
    expect(parsed.name).toBe('left_shoulder')
  })

  it('waist 는 hip 으로 정규화', () => {
    expect(normalizeKpName('waist')).toBe('hip')
    const parsed = keypointSchema.parse({ name: 'waist', x: 0.5, y: 0.6 })
    expect(parsed.name).toBe('hip')
  })

  it('신규 규약 이름은 그대로 통과', () => {
    const parsed = keypointSchema.parse({ name: 'left_elbow', x: 0.1, y: 0.2, weight: 0.5 })
    expect(parsed.name).toBe('left_elbow')
  })

  it('규약 밖 이름은 거부', () => {
    expect(() => keypointSchema.parse({ name: 'unknown-point', x: 0, y: 0 })).toThrow()
  })
})
