/**
 * wordfx-rules.test.ts — 워드 효과 룰 단위 테스트 (M4-02)
 */

import { describe, expect, it } from 'vitest'

import { getWordFxCandidate, getWordFxCandidates } from '../src/rules/wordfx-rules.js'

describe('getWordFxCandidate — shout', () => {
  it('느낌표 2개 → shout scope + outline-bold', () => {
    const r = getWordFxCandidate('안 돼!!', '민준')
    expect(r).toBeDefined()
    expect(r?.scope).toBe('shout')
    expect(r?.effectName).toBe('outline-bold')
  })

  it('짧은 외침(느낌표 1개, 15자 이하) → shout', () => {
    const r = getWordFxCandidate('이게 뭐야!', '서연')
    expect(r).toBeDefined()
    expect(r?.scope).toBe('shout')
  })
})

describe('getWordFxCandidate — whisper', () => {
  it('말줄임표 + 짧은 텍스트 → whisper + blur-light', () => {
    const r = getWordFxCandidate('아...', '민준')
    expect(r).toBeDefined()
    expect(r?.scope).toBe('whisper')
    expect(r?.effectName).toBe('blur-light')
  })
})

describe('getWordFxCandidate — narration', () => {
  it('스피커 없는 30자 초과 → narration + shadow-soft', () => {
    const text = '그날 오후, 도시는 평소처럼 분주했다. 사람들은 저마다 다른 이야기를 품고 있었다.'
    const r = getWordFxCandidate(text)
    expect(r).toBeDefined()
    expect(r?.scope).toBe('narration')
    expect(r?.effectName).toBe('shadow-soft')
  })
})

describe('getWordFxCandidate — 효과 없음', () => {
  it('일반 짧은 대사 → undefined', () => {
    const r = getWordFxCandidate('안녕', '서연')
    expect(r).toBeUndefined()
  })

  it('중간 길이 일반 대사 → undefined', () => {
    const r = getWordFxCandidate('오늘 날씨가 참 좋다', '민준')
    expect(r).toBeUndefined()
  })
})

describe('getWordFxCandidates — 일괄 처리', () => {
  it('효과 필요한 라인만 포함', () => {
    const lines = [
      { text: '안녕', speaker: '서연' },
      { text: '안 돼!!', speaker: '민준' },
      { text: '그날 오후, 하늘은 붉게 물들었고 바람은 차갑게 불어왔다.' },
      { text: '별거 아냐', speaker: '서연' },
    ]
    const results = getWordFxCandidates(lines)
    expect(results.length).toBeGreaterThanOrEqual(1)
    // 외침 포함 확인
    const hasShout = results.some((r) => r.scope === 'shout')
    expect(hasShout).toBe(true)
  })

  it('모든 일반 대사 → 빈 배열', () => {
    const lines = [
      { text: '안녕', speaker: '서연' },
      { text: '잘 지냈어?', speaker: '민준' },
    ]
    const results = getWordFxCandidates(lines)
    // "잘 지냈어?" 는 질문이지만 wordfx 대상 아님
    expect(results).toHaveLength(0)
  })

  it('reasoning 항상 존재', () => {
    const r = getWordFxCandidate('조심해!!', '민준')
    expect(r).toBeDefined()
    expect(r?.reasoning.length).toBeGreaterThan(0)
  })
})
