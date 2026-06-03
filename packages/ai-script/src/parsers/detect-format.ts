/**
 * detect-format.ts
 *
 * 입력 글의 형식을 규칙 기반으로 자동 감지한다.
 *
 * 감지 우선순위:
 *  1. screenplay — "화자:" 패턴이 전체 행의 20%+ 또는 "INT./EXT." 씬 헤더 존재
 *  2. diary     — 날짜 헤더 패턴 (YYYY년 M월 DD일 / 요일 등)
 *  3. essay     — 1인칭 독백 비율 높음 + 대화 없음
 *  4. light-novel — 짧은 문장 + 빈 행 분단 + 대화 비율 중간
 *  5. novel     — fallback
 */

import type { ScriptInputFormat } from '../types.js'

// ─────────────────────────────────────────────
// 패턴 상수
// ─────────────────────────────────────────────

/** 화자: 대사 패턴 — 한글/영문 2~20자 이름 + 콜론 + 공백 + 내용 */
const SPEAKER_COLON_RE = /^([가-힣a-zA-Z\s]{1,20})\s*:\s*.+/

/** 씬 헤더 패턴 (영문 스크린플레이) */
const SCENE_HEADER_EN_RE = /^(INT\.|EXT\.|INT\/EXT\.)/im

/** 날짜 헤더 패턴 */
const DATE_HEADER_RE = /^\d{4}[년/-]\s*\d{1,2}[월/-]\s*\d{1,2}[일]?/m

/** 1인칭 대명사 — 한국어는 \b 미지원, 공백/시작으로 경계 처리 */
const FIRST_PERSON_RE = /(^|[\s,.])(나는|나의|내가|나에게서?|난|저는|저의|제가)/gm

/** 따옴표 대화 패턴 (소설식) */
const QUOTE_DIALOGUE_RE = /[""「『](.+?)[""」』]/g

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

function countMatches(text: string, re: RegExp): number {
  const matches = text.match(re)
  return matches ? matches.length : 0
}

function getNonEmptyLines(text: string): string[] {
  return text.split('\n').filter((l) => l.trim().length > 0)
}

// ─────────────────────────────────────────────
// 메인 감지 함수
// ─────────────────────────────────────────────

export function detectFormat(text: string): Exclude<ScriptInputFormat, 'auto'> {
  const lines = getNonEmptyLines(text)
  if (lines.length === 0) return 'novel'

  // 1. 스크린플레이 감지
  const speakerLines = lines.filter((l) => SPEAKER_COLON_RE.test(l))
  const speakerRatio = speakerLines.length / lines.length
  if (speakerRatio >= 0.15 || SCENE_HEADER_EN_RE.test(text)) {
    return 'screenplay'
  }

  // 2. 다이어리 감지
  if (DATE_HEADER_RE.test(text)) {
    return 'diary'
  }

  // 3. 에세이 감지 — 1인칭 많고 대화 거의 없음
  const firstPersonCount = countMatches(text, FIRST_PERSON_RE)
  const quoteCount = countMatches(text, QUOTE_DIALOGUE_RE)
  const words = text.split(/\s+/).length
  const firstPersonRatio = firstPersonCount / Math.max(words / 100, 1)

  if (firstPersonRatio > 2 && quoteCount < 3) {
    return 'essay'
  }

  // 4. 라이트 노벨 감지 — 짧은 문장 + 중간 대화량
  const avgLineLen = text.length / lines.length
  if (avgLineLen < 40 && quoteCount > 2) {
    return 'light-novel'
  }

  // 5. 기본: 소설
  return 'novel'
}
