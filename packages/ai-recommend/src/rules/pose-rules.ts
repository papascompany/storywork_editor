/**
 * pose-rules.ts — 장면 메타 → 포즈 action 키워드 매핑 룰 (M4-02)
 *
 * 우선순위: emotion > cameraAngle > mood > location > pacing
 * 각 룰은 actions[] (우선 순위 순) + confidence 를 반환한다.
 */

import type { PoseRuleContext } from '../types.js'

// ─────────────────────────────────────────────
// 룰 타입
// ─────────────────────────────────────────────

export interface PoseRule {
  id: string
  /** 매칭 조건 (모두 일치해야 함) */
  conditions: Partial<PoseRuleContext>
  /** 추천 action 키워드 목록 (우선 순위 순) */
  actions: string[]
  confidence: number
  reasoning: string
}

// ─────────────────────────────────────────────
// 룰 테이블 (결정론 — 순서 고정)
// ─────────────────────────────────────────────

export const POSE_RULES: PoseRule[] = [
  // ─── 감정 기반 룰 ───────────────────────────

  {
    id: 'emotion-happy-closeup',
    conditions: { emotion: 'happy', cameraAngle: 'closeup' },
    actions: ['facial-expression', 'thumbsup', 'waving'],
    confidence: 0.9,
    reasoning: 'happy + closeup → 얼굴 표정/손동작 강조',
  },
  {
    id: 'emotion-happy-wide',
    conditions: { emotion: 'happy', cameraAngle: 'wide' },
    actions: ['jumping', 'running', 'waving'],
    confidence: 0.85,
    reasoning: 'happy + wide → 역동적 동작',
  },
  {
    id: 'emotion-happy',
    conditions: { emotion: 'happy' },
    actions: ['waving', 'thumbsup', 'facial-expression'],
    confidence: 0.8,
    reasoning: 'happy → 긍정적 동작',
  },
  {
    id: 'emotion-sad-closeup',
    conditions: { emotion: 'sad', cameraAngle: 'closeup' },
    actions: ['facial-expression', 'crouching', 'kneeling'],
    confidence: 0.9,
    reasoning: 'sad + closeup → 슬픈 표정/웅크림',
  },
  {
    id: 'emotion-sad',
    conditions: { emotion: 'sad' },
    actions: ['crouching', 'kneeling', 'lying'],
    confidence: 0.8,
    reasoning: 'sad → 낮은 자세/침울',
  },
  {
    id: 'emotion-angry',
    conditions: { emotion: 'angry' },
    actions: ['fighting', 'pointing', 'weapon-sword'],
    confidence: 0.85,
    reasoning: 'angry → 공격적 동작',
  },
  {
    id: 'emotion-surprised-closeup',
    conditions: { emotion: 'surprised', cameraAngle: 'closeup' },
    actions: ['facial-expression', 'jumping'],
    confidence: 0.9,
    reasoning: 'surprised + closeup → 놀란 표정 클로즈업',
  },
  {
    id: 'emotion-surprised',
    conditions: { emotion: 'surprised' },
    actions: ['jumping', 'falling', 'pointing'],
    confidence: 0.8,
    reasoning: 'surprised → 놀람 동작',
  },
  {
    id: 'emotion-tense',
    conditions: { emotion: 'tense' },
    actions: ['fighting', 'weapon-sword', 'standing'],
    confidence: 0.8,
    reasoning: 'tense → 긴장/경계 자세',
  },
  {
    id: 'emotion-neutral',
    conditions: { emotion: 'neutral' },
    actions: ['standing', 'walking', 'sitting'],
    confidence: 0.7,
    reasoning: 'neutral → 평범한 자세',
  },
  {
    id: 'emotion-romantic',
    conditions: { emotion: 'romantic' },
    actions: ['affection', 'waving', 'standing'],
    confidence: 0.85,
    reasoning: 'romantic → 애정 표현',
  },
  {
    id: 'emotion-fear',
    conditions: { emotion: 'fear' },
    actions: ['crouching', 'falling', 'running'],
    confidence: 0.85,
    reasoning: 'fear → 공포/도망 자세',
  },

  // ─── 카메라 앵글 기반 룰 ──────────────────────

  {
    id: 'camera-closeup',
    conditions: { cameraAngle: 'closeup' },
    actions: ['facial-expression', 'standing', 'sitting'],
    confidence: 0.7,
    reasoning: 'closeup → 상반신/얼굴 중심',
  },
  {
    id: 'camera-wide',
    conditions: { cameraAngle: 'wide' },
    actions: ['walking', 'running', 'standing'],
    confidence: 0.7,
    reasoning: 'wide → 전신 동작',
  },
  {
    id: 'camera-bird-eye',
    conditions: { cameraAngle: 'bird-eye' },
    actions: ['lying', 'crouching', 'sitting'],
    confidence: 0.75,
    reasoning: 'bird-eye → 내려다보는 구도 적합 자세',
  },
  {
    id: 'camera-low-angle',
    conditions: { cameraAngle: 'low-angle' },
    actions: ['standing', 'jumping', 'fighting'],
    confidence: 0.75,
    reasoning: 'low-angle → 올려다보는 구도, 위압감',
  },

  // ─── 무드 기반 룰 ──────────────────────────

  {
    id: 'mood-action',
    conditions: { mood: 'action' },
    actions: ['fighting', 'running', 'jumping', 'weapon-sword'],
    confidence: 0.85,
    reasoning: 'action mood → 전투/이동 동작',
  },
  {
    id: 'mood-romantic',
    conditions: { mood: 'romantic' },
    actions: ['affection', 'waving', 'standing'],
    confidence: 0.85,
    reasoning: 'romantic mood → 애정 표현',
  },
  {
    id: 'mood-dark',
    conditions: { mood: 'dark' },
    actions: ['crouching', 'standing', 'weapon-sword'],
    confidence: 0.8,
    reasoning: 'dark mood → 어둡고 긴장된 자세',
  },
  {
    id: 'mood-comic',
    conditions: { mood: 'comic' },
    actions: ['falling', 'waving', 'jumping'],
    confidence: 0.8,
    reasoning: 'comic mood → 코믹한 동작',
  },
  {
    id: 'mood-tense',
    conditions: { mood: 'tense' },
    actions: ['fighting', 'standing', 'pointing'],
    confidence: 0.8,
    reasoning: 'tense mood → 긴장감 있는 자세',
  },
  {
    id: 'mood-calm',
    conditions: { mood: 'calm' },
    actions: ['sitting', 'standing', 'lying'],
    confidence: 0.75,
    reasoning: 'calm mood → 차분한 자세',
  },

  // ─── 장소 기반 룰 ──────────────────────────

  {
    id: 'location-outdoor-action',
    conditions: { location: 'outdoor', mood: 'action' },
    actions: ['running', 'jumping', 'fighting'],
    confidence: 0.85,
    reasoning: 'outdoor + action → 야외 전투/이동',
  },
  {
    id: 'location-outdoor',
    conditions: { location: 'outdoor' },
    actions: ['walking', 'running', 'standing'],
    confidence: 0.7,
    reasoning: 'outdoor → 야외 이동 동작',
  },
  {
    id: 'location-indoor',
    conditions: { location: 'indoor' },
    actions: ['sitting', 'standing', 'walking'],
    confidence: 0.7,
    reasoning: 'indoor → 실내 일상 동작',
  },
  {
    id: 'location-school',
    conditions: { location: 'school' },
    actions: ['sitting', 'standing', 'walking'],
    confidence: 0.75,
    reasoning: 'school → 학교 일상 동작',
  },
  {
    id: 'location-battle',
    conditions: { location: 'battle' },
    actions: ['fighting', 'weapon-sword', 'jumping'],
    confidence: 0.9,
    reasoning: 'battle location → 전투 동작',
  },

  // ─── 페이싱 기반 룰 ──────────────────────────

  {
    id: 'pacing-fast',
    conditions: { pacing: 'fast' },
    actions: ['running', 'jumping', 'fighting'],
    confidence: 0.75,
    reasoning: 'fast pacing → 역동적 동작',
  },
  {
    id: 'pacing-slow',
    conditions: { pacing: 'slow' },
    actions: ['sitting', 'standing', 'lying'],
    confidence: 0.7,
    reasoning: 'slow pacing → 정적인 동작',
  },

  // ─── 기본 폴백 룰 ──────────────────────────

  {
    id: 'default',
    conditions: {},
    actions: ['standing', 'walking', 'sitting'],
    confidence: 0.5,
    reasoning: '기본 폴백 → 자주 쓰이는 포즈',
  },
]

// ─────────────────────────────────────────────
// 룰 매칭 함수
// ─────────────────────────────────────────────

/**
 * 장면 컨텍스트에서 포즈 action 키워드 후보를 추출한다.
 * 여러 룰이 매칭될 수 있으며, confidence 가중 집계 후 상위 K 개 반환.
 */
export function getPoseActionCandidates(
  ctx: PoseRuleContext,
  topK = 5,
): Array<{ action: string; confidence: number; reasoning: string }> {
  // 1. 조건 매칭
  const matched: Array<{ rule: PoseRule; score: number }> = []

  for (const rule of POSE_RULES) {
    const conds = rule.conditions
    let score = 0
    let condCount = 0

    if (conds.emotion !== undefined) {
      condCount++
      if (normalizeEmotion(ctx.emotion) === conds.emotion) score++
    }
    if (conds.cameraAngle !== undefined) {
      condCount++
      if (ctx.cameraAngle === conds.cameraAngle) score++
    }
    if (conds.mood !== undefined) {
      condCount++
      if (normalizeMood(ctx.mood) === conds.mood) score++
    }
    if (conds.location !== undefined) {
      condCount++
      if (normalizeLocation(ctx.location) === conds.location) score++
    }
    if (conds.pacing !== undefined) {
      condCount++
      if (ctx.pacing === conds.pacing) score++
    }

    // 조건 없는 룰 (default) 은 항상 매칭
    if (condCount === 0 || score === condCount) {
      matched.push({ rule, score: condCount === 0 ? 0.3 : score / condCount })
    }
  }

  // 2. action 별 점수 집계
  const actionScores = new Map<string, { totalConf: number; reasoning: string }>()

  for (const { rule, score } of matched) {
    const effectiveConf = rule.confidence * score
    for (let i = 0; i < rule.actions.length; i++) {
      const action = rule.actions[i]
      if (!action) continue
      // 순서 가중 (첫 번째 action 이 가장 강함)
      const orderWeight = 1 - i * 0.1
      const weighted = effectiveConf * Math.max(orderWeight, 0.1)
      const existing = actionScores.get(action)
      if (!existing || weighted > existing.totalConf) {
        actionScores.set(action, { totalConf: weighted, reasoning: rule.reasoning })
      }
    }
  }

  // 3. 상위 K 개 정렬 반환 (결정론: confidence 동점 시 action 알파벳 순)
  return Array.from(actionScores.entries())
    .sort((a, b) => {
      const diff = b[1].totalConf - a[1].totalConf
      if (Math.abs(diff) < 0.001) return a[0].localeCompare(b[0])
      return diff
    })
    .slice(0, topK)
    .map(([action, { totalConf, reasoning }]) => ({
      action,
      confidence: Math.min(totalConf, 1),
      reasoning,
    }))
}

// ─────────────────────────────────────────────
// 정규화 헬퍼 (한글 감정 → 영어 키, 유사어 처리)
// ─────────────────────────────────────────────

const EMOTION_MAP: Record<string, string> = {
  happy: 'happy',
  기쁨: 'happy',
  행복: 'happy',
  즐거움: 'happy',
  환희: 'happy',
  sad: 'sad',
  슬픔: 'sad',
  우울: 'sad',
  비통: 'sad',
  angry: 'angry',
  분노: 'angry',
  화남: 'angry',
  격노: 'angry',
  surprised: 'surprised',
  놀람: 'surprised',
  충격: 'surprised',
  tense: 'tense',
  긴장: 'tense',
  불안: 'tense',
  fear: 'fear',
  공포: 'fear',
  두려움: 'fear',
  neutral: 'neutral',
  평온: 'neutral',
  normal: 'neutral',
  romantic: 'romantic',
  로맨틱: 'romantic',
  사랑: 'romantic',
}

const MOOD_MAP: Record<string, string> = {
  action: 'action',
  액션: 'action',
  전투: 'action',
  romantic: 'romantic',
  로맨틱: 'romantic',
  dark: 'dark',
  어둠: 'dark',
  공포: 'dark',
  comic: 'comic',
  코믹: 'comic',
  tense: 'tense',
  긴장: 'tense',
  calm: 'calm',
  평온: 'calm',
  잔잔: 'calm',
}

const LOCATION_MAP: Record<string, string> = {
  outdoor: 'outdoor',
  야외: 'outdoor',
  공원: 'outdoor',
  거리: 'outdoor',
  indoor: 'indoor',
  실내: 'indoor',
  집: 'indoor',
  school: 'school',
  학교: 'school',
  교실: 'school',
  battle: 'battle',
  전장: 'battle',
  전투: 'battle',
}

export function normalizeEmotion(v?: string): string | undefined {
  if (!v) return undefined
  const lower = v.toLowerCase()
  return EMOTION_MAP[lower] ?? EMOTION_MAP[v] ?? lower
}

export function normalizeMood(v?: string): string | undefined {
  if (!v) return undefined
  const lower = v.toLowerCase()
  return MOOD_MAP[lower] ?? MOOD_MAP[v] ?? lower
}

export function normalizeLocation(v?: string): string | undefined {
  if (!v) return undefined
  const lower = v.toLowerCase()
  return LOCATION_MAP[lower] ?? LOCATION_MAP[v] ?? lower
}
