/**
 * parse-novel.ts
 *
 * 소설/라이트노벨 형식 파싱 — 산문 → 장면 분리 + 화자 추론
 *
 * 장면 경계 규칙:
 *  1. 빈 행 2줄 이상
 *  2. 씬 구분자 키워드 (그날, 다음날, 한편, 그 후, 얼마 후...)
 *  3. 문장 수 임계값 초과 (기본: 8문장)
 *
 * 화자 추론:
 *  - 따옴표/꺾쇠 직전의 동사구 패턴: "xxx가/은/이 말했다/했다/외쳤다..."
 *  - "xxx: 내용" 형식 (스크린플레이 섞임 대응)
 */

import type { AnalyzedLine, AnalyzedScene, SceneMeta } from '../types.js'

import { buildSlug, buildSummary, extractEmotion, isLikelyName } from './utils.js'

// ─────────────────────────────────────────────
// 패턴
// ─────────────────────────────────────────────

/** 따옴표 대화 (한글식 + ASCII) */
const QUOTE_RE = /["""「『]([^"""」』\n]{1,200})["""」』]/g

/** 발화 동사 패턴 — "이름 + 이/가/은/은 + 동사" */
const SPEECH_VERB_RE =
  /([가-힣]{2,8})[이가은는]\s+(?:말했다|했다|외쳤다|소리쳤다|속삭였다|물었다|대답했다|대꾸했다|고함쳤다|투덜거렸다|중얼거렸다)/

/** 씬 구분자 키워드 */
const SCENE_BREAK_KEYWORDS = /^(그날|다음\s*날|한편|그\s*후|얼마\s*후|그로부터|\*\s*\*\s*\*|#|---)/m

/** 문장 구분 (한국어 마침표 + 물음표 + 느낌표) */
const SENTENCE_END_RE = /[.。?？!！]+\s*/g

/** 화자 직접 패턴 "이름: 대사" */
const DIRECT_SPEAKER_RE = /^([가-힣]{2,8})\s*:\s*(.+)/

// ─────────────────────────────────────────────
// 단락 분리
// ─────────────────────────────────────────────

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

// ─────────────────────────────────────────────
// 단락에서 대화 추출
// ─────────────────────────────────────────────

function extractLinesFromParagraph(para: string): AnalyzedLine[] {
  const result: AnalyzedLine[] = []
  let lineIdx = 0

  // 직접 화자 패턴 우선
  const directMatch = DIRECT_SPEAKER_RE.exec(para)
  if (directMatch) {
    result.push({
      index: lineIdx++,
      speaker: directMatch[1],
      text: directMatch[2]?.trim() ?? '',
    })
    return result
  }

  // 따옴표 대화 추출
  let quoteMatch: RegExpExecArray | null
  const localRe = new RegExp(QUOTE_RE.source, 'g')
  while ((quoteMatch = localRe.exec(para)) !== null) {
    const dialogueText = quoteMatch[1] ?? ''
    // 발화 동사에서 화자 추론
    const beforeQuote = para.slice(0, quoteMatch.index)
    const speechMatch = SPEECH_VERB_RE.exec(beforeQuote)
    const speaker = speechMatch && isLikelyName(speechMatch[1] ?? '') ? speechMatch[1] : undefined

    result.push({ index: lineIdx++, speaker, text: dialogueText })
  }

  // 대화가 없으면 단락 전체를 서술 행으로
  if (result.length === 0 && para.length > 0) {
    result.push({ index: lineIdx++, speaker: undefined, text: para.slice(0, 200) })
  }

  return result
}

// ─────────────────────────────────────────────
// 단락을 장면으로 묶기
// ─────────────────────────────────────────────

function groupParasIntoScenes(paragraphs: string[], sentenceThreshold = 8): string[][] {
  const groups: string[][] = []
  let current: string[] = []
  let sentenceCount = 0

  for (const para of paragraphs) {
    // 씬 구분자 키워드
    if (SCENE_BREAK_KEYWORDS.test(para)) {
      if (current.length > 0) groups.push(current)
      current = []
      sentenceCount = 0
      continue
    }

    const sentences = (para.match(SENTENCE_END_RE) ?? []).length
    sentenceCount += sentences

    current.push(para)

    // 문장 임계값 초과 시 새 장면 시작
    if (sentenceCount >= sentenceThreshold) {
      groups.push(current)
      current = []
      sentenceCount = 0
    }
  }

  if (current.length > 0) groups.push(current)
  return groups
}

// ─────────────────────────────────────────────
// 메인 파서
// ─────────────────────────────────────────────

export function parseNovel(text: string, sentenceThreshold = 8): AnalyzedScene[] {
  const paragraphs = splitParagraphs(text)
  if (paragraphs.length === 0) return []

  const sceneGroups = groupParasIntoScenes(paragraphs, sentenceThreshold)

  return sceneGroups.map((paras, idx): AnalyzedScene => {
    const allLines: AnalyzedLine[] = []
    let lineIdx = 0

    for (const para of paras) {
      const extracted = extractLinesFromParagraph(para)
      for (const l of extracted) {
        allLines.push({ ...l, index: lineIdx++ })
      }
    }

    const charSet = new Set<string>()
    for (const l of allLines) {
      if (l.speaker && isLikelyName(l.speaker)) charSet.add(l.speaker)
    }

    const fullText = paras.join(' ')
    const meta: SceneMeta = {
      emotion: extractEmotion(fullText),
    }

    return {
      index: idx,
      slug: buildSlug(idx),
      summary: buildSummary(allLines),
      meta,
      lines: allLines,
      characters: Array.from(charSet),
      confidence: 0.6,
    }
  })
}
