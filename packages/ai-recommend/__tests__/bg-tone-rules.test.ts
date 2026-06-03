/**
 * bg-tone-rules.test.ts — 배경 색상 톤 룰 단위 테스트 (M4-02)
 */

import { describe, expect, it } from 'vitest'

import { getBgToneCandidate } from '../src/rules/bg-tone-rules.js'

describe('getBgToneCandidate — mood 우선', () => {
  it('romantic mood → pink', () => {
    const r = getBgToneCandidate({ mood: 'romantic' })
    expect(r.suggestedTone).toBe('pink')
  })

  it('dark mood → navy', () => {
    const r = getBgToneCandidate({ mood: 'dark' })
    expect(r.suggestedTone).toBe('navy')
  })

  it('action mood → navy', () => {
    const r = getBgToneCandidate({ mood: 'action' })
    expect(r.suggestedTone).toBe('navy')
  })

  it('calm mood → mint', () => {
    const r = getBgToneCandidate({ mood: 'calm' })
    expect(r.suggestedTone).toBe('mint')
  })

  it('comic mood → cream', () => {
    const r = getBgToneCandidate({ mood: 'comic' })
    expect(r.suggestedTone).toBe('cream')
  })

  it('한글 무드 → 매핑 동작', () => {
    const r = getBgToneCandidate({ mood: '로맨틱' })
    expect(r.suggestedTone).toBe('pink')
  })
})

describe('getBgToneCandidate — location fallback', () => {
  it('outdoor location → mint', () => {
    const r = getBgToneCandidate({ location: 'outdoor' })
    expect(r.suggestedTone).toBe('mint')
  })

  it('indoor location → cream', () => {
    const r = getBgToneCandidate({ location: 'indoor' })
    expect(r.suggestedTone).toBe('cream')
  })

  it('school location → lilac', () => {
    const r = getBgToneCandidate({ location: 'school' })
    expect(r.suggestedTone).toBe('lilac')
  })

  it('battle location → navy', () => {
    const r = getBgToneCandidate({ location: 'battle' })
    expect(r.suggestedTone).toBe('navy')
  })

  it('한글 장소 → 매핑 동작', () => {
    const r = getBgToneCandidate({ location: '야외' })
    expect(r.suggestedTone).toBe('mint')
  })

  it('mood 있으면 location 무시', () => {
    const r = getBgToneCandidate({ mood: 'dark', location: 'outdoor' })
    expect(r.suggestedTone).toBe('navy') // mood 우선
  })
})

describe('getBgToneCandidate — timeOfDay fallback', () => {
  it('night → navy', () => {
    const r = getBgToneCandidate({ timeOfDay: 'night' })
    expect(r.suggestedTone).toBe('navy')
  })

  it('morning → cream', () => {
    const r = getBgToneCandidate({ timeOfDay: 'morning' })
    expect(r.suggestedTone).toBe('cream')
  })

  it('evening → pink', () => {
    const r = getBgToneCandidate({ timeOfDay: 'evening' })
    expect(r.suggestedTone).toBe('pink')
  })

  it('noon → white', () => {
    const r = getBgToneCandidate({ timeOfDay: 'noon' })
    expect(r.suggestedTone).toBe('white')
  })

  it('mood 있으면 timeOfDay 무시', () => {
    const r = getBgToneCandidate({ mood: 'romantic', timeOfDay: 'night' })
    expect(r.suggestedTone).toBe('pink') // mood 우선
  })
})

describe('getBgToneCandidate — 기본 폴백', () => {
  it('모든 컨텍스트 없음 → white', () => {
    const r = getBgToneCandidate({})
    expect(r.suggestedTone).toBe('white')
    expect(r.reasoning).toContain('폴백')
  })

  it('알 수 없는 mood → white 폴백', () => {
    const r = getBgToneCandidate({ mood: 'unknown-mood-xyz' })
    expect(r.suggestedTone).toBe('white')
  })

  it('reasoning 항상 존재', () => {
    const r = getBgToneCandidate({ mood: 'romantic', location: 'outdoor', timeOfDay: 'night' })
    expect(r.reasoning.length).toBeGreaterThan(0)
  })
})
