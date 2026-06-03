/**
 * bubble-rules.ts — 대사 분석 → 말풍선 모양 결정 룰 (M4-02)
 *
 * 우선순위:
 *  1. 꿈/생각 키워드 → cloud
 *  2. 외침("!") → shout
 *  3. 질문("?") → rounded
 *  4. 긴 대사(>30자) → narration
 *  5. 기본 → oval
 */

import type { BubbleCandidate, BubbleShape } from '../types.js'

// ─────────────────────────────────────────────
// 꿈/생각 키워드
// ─────────────────────────────────────────────

const THOUGHT_KEYWORDS = [
  '생각해보면',
  '꿈에서',
  '상상',
  '떠오르는',
  '마음속에',
  '나만의 생각',
  '속으로',
  '생각했다',
  '생각한다',
  '생각이야',
  '생각인데',
  '기억이',
  '기억해',
  '상상해',
]

function isThought(text: string): boolean {
  const lower = text.toLowerCase()
  return THOUGHT_KEYWORDS.some((kw) => lower.includes(kw))
}

// ─────────────────────────────────────────────
// 외침 감지
// ─────────────────────────────────────────────

function isShout(text: string): boolean {
  // "!" 이 2개 이상이거나, 전부 대문자(영어) + 느낌표
  const exclamationCount = (text.match(/!/g) ?? []).length
  if (exclamationCount >= 2) return true
  // 단일 "!"도 짧은 문장이면 외침
  if (exclamationCount === 1 && text.length <= 15) return true
  return false
}

// ─────────────────────────────────────────────
// 질문 감지
// ─────────────────────────────────────────────

function isQuestion(text: string): boolean {
  return text.trimEnd().endsWith('?') || text.includes('？')
}

// ─────────────────────────────────────────────
// 나레이션 감지 (스피커 없는 긴 텍스트)
// ─────────────────────────────────────────────

function isNarration(text: string, hasSpeaker: boolean): boolean {
  if (!hasSpeaker && text.length > 30) return true
  // 스피커 유무 관계없이 50자 초과이면 나레이션 박스
  if (text.length > 50) return true
  return false
}

// 단, shout/thought 우선 — isNarration 을 3번째로 체크하는 구조 유지

// ─────────────────────────────────────────────
// 속삭임 감지
// ─────────────────────────────────────────────

const WHISPER_PATTERNS = ['...', '…', '흐흐', '히히', '쿡쿡']

function isWhisper(text: string): boolean {
  return WHISPER_PATTERNS.some((p) => text.includes(p)) && text.length < 20
}

// ─────────────────────────────────────────────
// 메인 함수
// ─────────────────────────────────────────────

/**
 * 대사 텍스트를 분석해 말풍선 모양을 결정한다.
 *
 * @param text      대사 내용
 * @param speaker   화자 (없으면 나레이션 가능성)
 * @returns         BubbleCandidate
 */
export function getBubbleCandidate(text: string, speaker?: string): BubbleCandidate {
  const hasSpeaker = Boolean(speaker && speaker.trim().length > 0)

  // 우선순위 1: 생각/꿈 → cloud
  if (isThought(text)) {
    return {
      shape: 'cloud',
      tailToSpeaker: hasSpeaker,
      reasoning: '생각/꿈 키워드 → cloud 말풍선',
    }
  }

  // 우선순위 2: 외침 → shout
  if (isShout(text)) {
    return {
      shape: 'shout',
      tailToSpeaker: hasSpeaker,
      reasoning: '느낌표 다수 / 짧은 외침 → shout 말풍선',
    }
  }

  // 우선순위 3: 나레이션 → narration
  if (isNarration(text, hasSpeaker)) {
    return {
      shape: 'narration',
      tailToSpeaker: false,
      reasoning: '나레이션 / 긴 텍스트 → narration 박스',
    }
  }

  // 우선순위 4: 질문 → rounded
  if (isQuestion(text)) {
    return {
      shape: 'rounded',
      tailToSpeaker: hasSpeaker,
      reasoning: '물음표 → rounded 말풍선',
    }
  }

  // 우선순위 5: 속삭임 → cloud (작은 크기)
  if (isWhisper(text)) {
    return {
      shape: 'cloud',
      tailToSpeaker: hasSpeaker,
      reasoning: '말줄임표 / 속삭임 → cloud 말풍선',
    }
  }

  // 기본 → oval
  return {
    shape: 'oval',
    tailToSpeaker: hasSpeaker,
    reasoning: '일반 대사 → oval 말풍선',
  }
}

/**
 * 여러 대사를 일괄 처리.
 */
export function getBubbleCandidates(
  lines: Array<{ text: string; speaker?: string }>,
): BubbleCandidate[] {
  return lines.map((line) => getBubbleCandidate(line.text, line.speaker))
}

/**
 * 말풍선 shape 별 기본 신뢰도.
 */
export const BUBBLE_SHAPE_CONFIDENCE: Record<BubbleShape, number> = {
  shout: 0.9,
  narration: 0.9,
  cloud: 0.85,
  rounded: 0.8,
  oval: 0.7,
}
