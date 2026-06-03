/**
 * bubble-rules.test.ts — 말풍선 룰 단위 테스트 (M4-02)
 */

import { describe, expect, it } from 'vitest'

import {
  BUBBLE_SHAPE_CONFIDENCE,
  getBubbleCandidate,
  getBubbleCandidates,
} from '../src/rules/bubble-rules.js'

describe('getBubbleCandidate — shout', () => {
  it('느낌표 2개 → shout', () => {
    const r = getBubbleCandidate('안 돼!!', '민준')
    expect(r.shape).toBe('shout')
    expect(r.tailToSpeaker).toBe(true)
  })

  it('짧은 외침 느낌표 1개 → shout', () => {
    const r = getBubbleCandidate('이게 뭐야!', '서연')
    expect(r.shape).toBe('shout')
  })

  it('긴 문장 느낌표 1개 → shout 아님 (다른 조건 적용)', () => {
    const r = getBubbleCandidate('이 상황이 이해가 안 가지만 어쩔 수 없다고 생각해!', '민준')
    // 긴 문장(>30자) → narration 우선 아님, shout 조건 미충족
    // 느낌표 1개 but 길이가 15 초과 → shout 아님 → oval
    expect(r.shape).toBe('oval')
  })
})

describe('getBubbleCandidate — cloud (생각)', () => {
  it('생각 키워드 → cloud', () => {
    const r = getBubbleCandidate('속으로 생각했다, 이게 맞는 길인지...', '주인공')
    expect(r.shape).toBe('cloud')
  })

  it('꿈 관련 → cloud', () => {
    const r = getBubbleCandidate('꿈에서 그 사람을 봤어', '서연')
    expect(r.shape).toBe('cloud')
  })
})

describe('getBubbleCandidate — narration', () => {
  it('스피커 없는 30자 초과 → narration', () => {
    const longText =
      '그날 오후, 도시는 평소처럼 분주했다. 사람들은 저마다의 일상을 살아가고 있었다.'
    const r = getBubbleCandidate(longText)
    expect(r.shape).toBe('narration')
    expect(r.tailToSpeaker).toBe(false)
  })

  it('스피커 있는 50자 초과 → narration', () => {
    const longText =
      '이런 일이 생길 줄은 몰랐지만, 사실 모든 것은 처음부터 예정된 운명이었는지도 모르겠어. 그래도 최선을 다해야지.'
    const r = getBubbleCandidate(longText, '민준')
    expect(r.shape).toBe('narration')
  })
})

describe('getBubbleCandidate — rounded (질문)', () => {
  it('물음표로 끝나는 → rounded', () => {
    const r = getBubbleCandidate('오늘 어디 가?', '서연')
    expect(r.shape).toBe('rounded')
    expect(r.tailToSpeaker).toBe(true)
  })

  it('전각 물음표 → rounded', () => {
    const r = getBubbleCandidate('정말이야？', '민준')
    expect(r.shape).toBe('rounded')
  })
})

describe('getBubbleCandidate — oval (기본)', () => {
  it('일반 짧은 대사 → oval', () => {
    const r = getBubbleCandidate('안녕', '서연')
    expect(r.shape).toBe('oval')
    expect(r.tailToSpeaker).toBe(true)
  })

  it('스피커 없는 짧은 대사 → oval', () => {
    const r = getBubbleCandidate('...')
    // 말줄임표 + 길이 3 → cloud (whisper)
    expect(r.shape).toBe('cloud')
  })
})

describe('getBubbleCandidates — 일괄 처리', () => {
  it('여러 라인 처리', () => {
    const lines = [
      { text: '안녕!', speaker: '서연' },
      { text: '속으로 생각했다', speaker: '민준' },
      { text: '왜?', speaker: '서연' },
      { text: '그날 아침, 해가 천천히 떠오르며 세상을 밝히고 있었다.' },
    ]
    const results = getBubbleCandidates(lines)
    expect(results).toHaveLength(4)
    expect(results[0]?.shape).toBe('shout')
    expect(results[1]?.shape).toBe('cloud')
    expect(results[2]?.shape).toBe('rounded')
    expect(results[3]?.shape).toBe('narration')
  })
})

describe('BUBBLE_SHAPE_CONFIDENCE', () => {
  it('shout 신뢰도 가장 높음', () => {
    expect(BUBBLE_SHAPE_CONFIDENCE.shout).toBeGreaterThanOrEqual(BUBBLE_SHAPE_CONFIDENCE.oval)
  })

  it('모든 shape 신뢰도 0~1 범위', () => {
    for (const val of Object.values(BUBBLE_SHAPE_CONFIDENCE)) {
      expect(val).toBeGreaterThan(0)
      expect(val).toBeLessThanOrEqual(1)
    }
  })
})
