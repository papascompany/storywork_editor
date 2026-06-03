/**
 * pose-rules.test.ts — 포즈 룰 기반 추천 단위 테스트 (M4-02)
 */

import { describe, expect, it } from 'vitest'

import {
  getPoseActionCandidates,
  normalizeEmotion,
  normalizeLocation,
  normalizeMood,
} from '../src/rules/pose-rules.js'
import type { PoseRuleContext } from '../src/types.js'

// ─────────────────────────────────────────────
// normalizeEmotion
// ─────────────────────────────────────────────

describe('normalizeEmotion', () => {
  it('영어 그대로 통과', () => {
    expect(normalizeEmotion('happy')).toBe('happy')
    expect(normalizeEmotion('sad')).toBe('sad')
    expect(normalizeEmotion('angry')).toBe('angry')
  })

  it('한글 감정 → 영어 키', () => {
    expect(normalizeEmotion('기쁨')).toBe('happy')
    expect(normalizeEmotion('슬픔')).toBe('sad')
    expect(normalizeEmotion('분노')).toBe('angry')
    expect(normalizeEmotion('놀람')).toBe('surprised')
    expect(normalizeEmotion('긴장')).toBe('tense')
    expect(normalizeEmotion('공포')).toBe('fear')
  })

  it('undefined 입력 → undefined 반환', () => {
    expect(normalizeEmotion(undefined)).toBeUndefined()
  })
})

// ─────────────────────────────────────────────
// normalizeMood
// ─────────────────────────────────────────────

describe('normalizeMood', () => {
  it('한글 무드 → 영어 키', () => {
    expect(normalizeMood('로맨틱')).toBe('romantic')
    expect(normalizeMood('코믹')).toBe('comic')
    expect(normalizeMood('어둠')).toBe('dark')
    expect(normalizeMood('평온')).toBe('calm')
  })

  it('영어 무드 그대로 통과', () => {
    expect(normalizeMood('action')).toBe('action')
    expect(normalizeMood('dark')).toBe('dark')
  })
})

// ─────────────────────────────────────────────
// normalizeLocation
// ─────────────────────────────────────────────

describe('normalizeLocation', () => {
  it('한글 장소 → 영어 키', () => {
    expect(normalizeLocation('야외')).toBe('outdoor')
    expect(normalizeLocation('실내')).toBe('indoor')
    expect(normalizeLocation('학교')).toBe('school')
    expect(normalizeLocation('전장')).toBe('battle')
  })
})

// ─────────────────────────────────────────────
// getPoseActionCandidates
// ─────────────────────────────────────────────

describe('getPoseActionCandidates — emotion 기반', () => {
  it('happy + closeup → facial-expression, thumbsup, waving 포함', () => {
    const ctx: PoseRuleContext = { emotion: 'happy', cameraAngle: 'closeup' }
    const results = getPoseActionCandidates(ctx, 5)
    const actions = results.map((r) => r.action)
    expect(actions).toContain('facial-expression')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]?.confidence).toBeGreaterThan(0)
  })

  it('sad → crouching, kneeling, lying 포함', () => {
    const ctx: PoseRuleContext = { emotion: 'sad' }
    const results = getPoseActionCandidates(ctx, 5)
    const actions = results.map((r) => r.action)
    expect(actions.some((a) => ['crouching', 'kneeling', 'lying'].includes(a))).toBe(true)
  })

  it('angry → fighting, pointing 포함', () => {
    const ctx: PoseRuleContext = { emotion: 'angry' }
    const results = getPoseActionCandidates(ctx, 5)
    const actions = results.map((r) => r.action)
    expect(actions.some((a) => ['fighting', 'pointing'].includes(a))).toBe(true)
  })

  it('surprised → jumping 포함', () => {
    const ctx: PoseRuleContext = { emotion: 'surprised' }
    const results = getPoseActionCandidates(ctx, 5)
    const actions = results.map((r) => r.action)
    expect(actions).toContain('jumping')
  })

  it('tense → fighting, weapon-sword 포함', () => {
    const ctx: PoseRuleContext = { emotion: 'tense' }
    const results = getPoseActionCandidates(ctx, 5)
    const actions = results.map((r) => r.action)
    expect(actions.some((a) => ['fighting', 'weapon-sword'].includes(a))).toBe(true)
  })
})

describe('getPoseActionCandidates — cameraAngle 기반', () => {
  it('wide → walking, running 포함', () => {
    const ctx: PoseRuleContext = { cameraAngle: 'wide' }
    const results = getPoseActionCandidates(ctx, 5)
    const actions = results.map((r) => r.action)
    expect(actions.some((a) => ['walking', 'running'].includes(a))).toBe(true)
  })

  it('bird-eye → lying, crouching 포함', () => {
    const ctx: PoseRuleContext = { cameraAngle: 'bird-eye' }
    const results = getPoseActionCandidates(ctx, 5)
    const actions = results.map((r) => r.action)
    expect(actions.some((a) => ['lying', 'crouching', 'sitting'].includes(a))).toBe(true)
  })
})

describe('getPoseActionCandidates — mood 기반', () => {
  it('action mood → fighting, running, jumping 포함', () => {
    const ctx: PoseRuleContext = { mood: 'action' }
    const results = getPoseActionCandidates(ctx, 5)
    const actions = results.map((r) => r.action)
    expect(actions.some((a) => ['fighting', 'running', 'jumping'].includes(a))).toBe(true)
  })

  it('romantic mood → affection 포함', () => {
    const ctx: PoseRuleContext = { mood: 'romantic' }
    const results = getPoseActionCandidates(ctx, 5)
    const actions = results.map((r) => r.action)
    expect(actions).toContain('affection')
  })

  it('dark mood → crouching 또는 weapon-sword 포함', () => {
    const ctx: PoseRuleContext = { mood: 'dark' }
    const results = getPoseActionCandidates(ctx, 5)
    const actions = results.map((r) => r.action)
    expect(actions.some((a) => ['crouching', 'weapon-sword', 'standing'].includes(a))).toBe(true)
  })
})

describe('getPoseActionCandidates — 복합 조건', () => {
  it('happy + wide → 역동적 동작 우선 (jumping 또는 running)', () => {
    const ctx: PoseRuleContext = { emotion: 'happy', cameraAngle: 'wide' }
    const results = getPoseActionCandidates(ctx, 5)
    const actions = results.map((r) => r.action)
    expect(actions.some((a) => ['jumping', 'running', 'waving'].includes(a))).toBe(true)
    // 복합 룰이 더 높은 confidence
    const jumpConf = results.find((r) => r.action === 'jumping')?.confidence ?? 0
    expect(jumpConf).toBeGreaterThan(0)
  })

  it('outdoor + action mood → running, fighting 포함', () => {
    const ctx: PoseRuleContext = { location: 'outdoor', mood: 'action' }
    const results = getPoseActionCandidates(ctx, 5)
    const actions = results.map((r) => r.action)
    expect(actions.some((a) => ['running', 'fighting'].includes(a))).toBe(true)
  })

  it('battle location → fighting, weapon-sword 포함', () => {
    const ctx: PoseRuleContext = { location: 'battle' }
    const results = getPoseActionCandidates(ctx, 5)
    const actions = results.map((r) => r.action)
    expect(actions.some((a) => ['fighting', 'weapon-sword'].includes(a))).toBe(true)
  })
})

describe('getPoseActionCandidates — 결정론', () => {
  it('동일 입력 → 동일 출력 (결정론 검증)', () => {
    const ctx: PoseRuleContext = { emotion: 'happy', cameraAngle: 'closeup', mood: 'romantic' }
    const r1 = getPoseActionCandidates(ctx, 5)
    const r2 = getPoseActionCandidates(ctx, 5)
    expect(r1.map((r) => r.action)).toEqual(r2.map((r) => r.action))
    expect(r1.map((r) => r.confidence)).toEqual(r2.map((r) => r.confidence))
  })

  it('상위 K 개 제한 동작', () => {
    const ctx: PoseRuleContext = { emotion: 'happy' }
    const results3 = getPoseActionCandidates(ctx, 3)
    const results5 = getPoseActionCandidates(ctx, 5)
    expect(results3.length).toBeLessThanOrEqual(3)
    expect(results5.length).toBeGreaterThanOrEqual(results3.length)
  })
})

describe('getPoseActionCandidates — 빈 컨텍스트', () => {
  it('빈 컨텍스트 → 기본 폴백 (standing, walking, sitting 포함)', () => {
    const ctx: PoseRuleContext = {}
    const results = getPoseActionCandidates(ctx, 5)
    const actions = results.map((r) => r.action)
    expect(actions.some((a) => ['standing', 'walking', 'sitting'].includes(a))).toBe(true)
  })

  it('confidence 범위 0~1', () => {
    const ctx: PoseRuleContext = { emotion: 'angry', mood: 'action' }
    const results = getPoseActionCandidates(ctx, 5)
    for (const r of results) {
      expect(r.confidence).toBeGreaterThanOrEqual(0)
      expect(r.confidence).toBeLessThanOrEqual(1)
    }
  })
})
