/**
 * wordfx-rules.ts — 대사 강도/감정 → 워드 효과 결정 룰 (M4-02)
 *
 * 외침/강조 대사에 워드 효과를 추천한다.
 * 조용한 대사 / 나레이션에는 효과 없음 (undefined 반환).
 */

import type { WordFxCandidate, WordFxScope } from '../types.js'

// ─────────────────────────────────────────────
// 효과 이름 타입 (editor-effects 45종 중 추천용)
// ─────────────────────────────────────────────

type WordFxName =
  | 'outline-bold'
  | 'neon-glow'
  | 'shadow-soft'
  | 'blur-light'
  | 'glow-warm'
  | 'script-soft'

// ─────────────────────────────────────────────
// 감지 헬퍼
// ─────────────────────────────────────────────

function detectScope(text: string, speaker?: string): WordFxScope | null {
  const exclamations = (text.match(/!/g) ?? []).length
  const hasEllipsis = text.includes('...') || text.includes('…')
  const hasSpeaker = Boolean(speaker?.trim())

  // 외침 조건
  if (exclamations >= 2 || (exclamations >= 1 && text.length <= 15)) {
    return 'shout'
  }

  // 속삭임 조건
  if (hasEllipsis && text.length < 20) {
    return 'whisper'
  }

  // 나레이션 조건 (스피커 없는 긴 텍스트)
  if (!hasSpeaker && text.length > 30) {
    return 'narration'
  }

  return null
}

// ─────────────────────────────────────────────
// scope → 추천 효과 목록
// ─────────────────────────────────────────────

const SCOPE_FX_MAP: Record<WordFxScope, WordFxName[]> = {
  shout: ['outline-bold', 'neon-glow', 'glow-warm'],
  narration: ['shadow-soft', 'script-soft'],
  whisper: ['blur-light'],
}

// ─────────────────────────────────────────────
// 메인 함수
// ─────────────────────────────────────────────

/**
 * 대사 텍스트를 분석해 워드 효과를 추천한다.
 * 특별한 강조가 불필요한 대사는 undefined 반환.
 */
export function getWordFxCandidate(text: string, speaker?: string): WordFxCandidate | undefined {
  const scope = detectScope(text, speaker)
  if (!scope) return undefined

  const fxNames = SCOPE_FX_MAP[scope]
  const effectName = fxNames[0]
  if (!effectName) return undefined

  return {
    effectName,
    scope,
    reasoning: `${scope} 대사 → ${effectName} 효과`,
  }
}

/**
 * 여러 대사를 일괄 처리. 효과 불필요한 대사는 결과에서 제외.
 */
export function getWordFxCandidates(
  lines: Array<{ text: string; speaker?: string }>,
): WordFxCandidate[] {
  const results: WordFxCandidate[] = []
  for (const line of lines) {
    const fx = getWordFxCandidate(line.text, line.speaker)
    if (fx) results.push(fx)
  }
  return results
}
