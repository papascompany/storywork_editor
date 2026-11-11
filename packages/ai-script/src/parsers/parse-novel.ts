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
 * 화자 추론 (SCRIPT-KO-01 — ko-speech.ts 1층 룰 엔진):
 *  - 발화동사 어간 패턴(활용형 커버) 선행/후행 귀속 + 행동 귀속 + 대명사 + 교대 보정
 *  - 캐릭터 ID 레지스트리로 별칭(호격·애칭 '이'·성+이름) canonical 병합
 *  - "xxx: 내용" 형식 (스크린플레이 섞임 대응)
 */

import type { AnalyzedLine, AnalyzedScene, SceneMeta } from '../types.js'

import {
  SPEECH_VERB_RE,
  attributeParagraph,
  createAttributionContext,
  recordMentions,
} from './ko-speech.js'
import type { AttributionContext } from './ko-speech.js'
import { buildSlug, buildSummary, extractEmotion, isLikelyName } from './utils.js'

// ─────────────────────────────────────────────
// 패턴
// ─────────────────────────────────────────────

/** 씬 구분자 키워드 */
const SCENE_BREAK_KEYWORDS = /^(그날|다음\s*날|한편|그\s*후|얼마\s*후|그로부터|\*\s*\*\s*\*|#|---)/m

/** 문장 구분 (한국어 마침표 + 물음표 + 느낌표) */
const SENTENCE_END_RE = /[.。?？!！]+\s*/g

/**
 * 서술 한 줄의 최대 길이 — 넘는 단락은 문장 경계에서 나눈다 (종전에는 여기서 잘라 버렸다).
 * 캡션 박스 하나가 담는 양(ai-layout CAPTION_CHARS_PER_BOX 180자)과 비슷한 크기로 둬서,
 * 나뉜 줄들이 박스에 자연스럽게 묶이게 한다.
 */
export const NARRATION_LINE_MAX_CHARS = 200

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
// 서술 단락 분할
// ─────────────────────────────────────────────

/** 문장 하나가 상한을 넘으면 공백에서, 공백도 없으면 글자 수로 나눈다 */
function splitLongSentence(sentence: string, max: number): string[] {
  const out: string[] = []
  let current = ''
  for (const word of sentence.split(/\s+/).filter((w) => w.length > 0)) {
    if (word.length > max) {
      if (current) out.push(current)
      current = ''
      for (let i = 0; i < word.length; i += max) out.push(word.slice(i, i + max))
      continue
    }
    const next = current ? `${current} ${word}` : word
    if (next.length > max) {
      out.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) out.push(current)
  return out
}

/** 문장 끝(마침표·물음표·느낌표 + 뒤따르는 공백)까지를 한 문장으로 나눈다 */
function sentencesOf(text: string): string[] {
  const sentences: string[] = []
  let start = 0
  for (const m of text.matchAll(SENTENCE_END_RE)) {
    const end = (m.index ?? 0) + m[0].length
    const sentence = text.slice(start, end).trim()
    if (sentence) sentences.push(sentence)
    start = end
  }
  const tail = text.slice(start).trim()
  if (tail) sentences.push(tail)
  return sentences
}

/** 화자 표시 문장으로 볼 최대 길이 — 이보다 길면 행동 묘사가 섞였다고 보고 남긴다 */
const SPEECH_TAG_MAX_CHARS = 25

/**
 * 인용을 받쳐 주기만 하는 **화자 표시 문장**인가 ("민수가 낮게 말했다.").
 * 마지막 어절이 발화동사로 끝나는 짧은 문장만 해당한다. "리안이 외치며 검을 뽑았다."처럼
 * 행동으로 끝나는 문장은 장면 정보라 서술로 남긴다. 화자 정보는 이미 대사 행에 귀속돼 있다.
 */
export function isSpeechTagSentence(sentence: string): boolean {
  const s = sentence.trim()
  if (s.length === 0 || s.length > SPEECH_TAG_MAX_CHARS) return false
  const lastWord = s.split(/\s+/).at(-1) ?? ''
  return SPEECH_VERB_RE.test(lastWord)
}

/**
 * 인용 사이 글 조각에서 서술만 남긴다 — 화자 표시 문장과 문장부호 찌꺼기는 버린다.
 * 줄바꿈은 공백으로 펴서 한 흐름으로 만든 뒤 `splitNarration` 으로 길이를 맞춘다.
 */
export function narrationOfGap(gap: string): string[] {
  const flat = gap.replace(/\s+/g, ' ').trim()
  if (flat.replace(/[\s.!?…,~\-—―]/g, '').length === 0) return []
  const kept = sentencesOf(flat).filter((sentence) => !isSpeechTagSentence(sentence))
  return kept.length === 0 ? [] : splitNarration(kept.join(' '))
}

/**
 * 서술 단락을 `max` 자 이하 덩어리로 나눈다 — **글을 버리지 않는다.**
 *
 * 종전 동작은 `para.slice(0, 200)` 이라 긴 서술 단락의 뒷부분이 조용히 사라졌다. 대사 보존
 * 지표는 대사만 세므로 이 손실은 어떤 지표에도 잡히지 않았다. 이제 문장 경계에서 이어 담고,
 * 문장 하나가 상한보다 길 때만 공백에서 나눈다. 상한 이하 단락은 그대로 한 줄이다(종전과 동일).
 */
export function splitNarration(para: string, max = NARRATION_LINE_MAX_CHARS): string[] {
  const text = para.trim()
  if (text.length <= max) return text ? [text] : []

  const sentences = sentencesOf(text)
  const out: string[] = []
  let current = ''
  for (const sentence of sentences) {
    if (sentence.length > max) {
      if (current) out.push(current)
      current = ''
      out.push(...splitLongSentence(sentence, max))
      continue
    }
    const next = current ? `${current} ${sentence}` : sentence
    if (next.length > max) {
      out.push(current)
      current = sentence
    } else {
      current = next
    }
  }
  if (current) out.push(current)
  return out
}

// ─────────────────────────────────────────────
// 단락에서 대화 추출
// ─────────────────────────────────────────────

function extractLinesFromParagraph(para: string, ctx: AttributionContext): AnalyzedLine[] {
  const result: AnalyzedLine[] = []
  let lineIdx = 0

  // 직접 화자 패턴 우선 ("이름: 대사")
  const directMatch = DIRECT_SPEAKER_RE.exec(para)
  if (directMatch) {
    const raw = directMatch[1] ?? ''
    const speaker = isLikelyName(raw) ? ctx.registry.confirmPerson(raw) : raw
    if (speaker && speaker !== ctx.lastSpeaker) {
      ctx.prevSpeaker = ctx.lastSpeaker
      ctx.lastSpeaker = speaker
    }
    result.push({
      index: lineIdx++,
      speaker,
      text: directMatch[2]?.trim() ?? '',
      kind: 'dialogue',
    })
    return result
  }

  // ko-speech 1층 룰 엔진으로 인용 추출 + 화자 귀속.
  // 인용 사이의 서술(행동 묘사)도 원래 순서대로 남긴다 — 종전에는 인용만 뽑고 나머지를
  // 버려, 대사가 섞인 단락의 행동 묘사가 통째로 사라졌다(코퍼스 실측: 서술 5,770자, 전체의 18.5%)
  const attributed = attributeParagraph(para, ctx)
  let cursor = 0
  for (const q of attributed) {
    for (const text of narrationOfGap(para.slice(cursor, q.start))) {
      result.push({ index: lineIdx++, speaker: undefined, text, kind: 'narration' })
    }
    result.push({ index: lineIdx++, speaker: q.speaker, text: q.text, kind: 'dialogue' })
    cursor = q.end
  }
  if (attributed.length > 0) {
    for (const text of narrationOfGap(para.slice(cursor))) {
      result.push({ index: lineIdx++, speaker: undefined, text, kind: 'narration' })
    }
  }

  // 대화가 없으면 단락 전체를 서술 행으로 — 말풍선이 아니라 캡션 박스로 간다 (SCRIPT-KO-04).
  // 긴 단락은 문장 경계에서 여러 서술 행으로 나눈다(잘라 버리지 않는다)
  if (result.length === 0 && para.length > 0) {
    for (const text of splitNarration(para)) {
      result.push({ index: lineIdx++, speaker: undefined, text, kind: 'narration' })
    }
  }

  return result
}

// ─────────────────────────────────────────────
// 단락을 장면으로 묶기
// ─────────────────────────────────────────────

interface SceneGroup {
  /** 이 그룹 직전의 씬 구분자 단락들 — 장면 라인에서는 제외되지만
   *  화자귀속 레지스트리에는 언급을 공급한다 ("그날 저녁, 민수가…") */
  breakParas: string[]
  paras: string[]
}

function groupParasIntoScenes(paragraphs: string[], sentenceThreshold = 8): SceneGroup[] {
  const groups: SceneGroup[] = []
  let current: string[] = []
  let pendingBreaks: string[] = []
  let sentenceCount = 0

  for (const para of paragraphs) {
    // 씬 구분자 키워드 (장면 수 계약 유지 — 단락은 그룹에 넣지 않는다)
    if (SCENE_BREAK_KEYWORDS.test(para)) {
      if (current.length > 0) {
        groups.push({ breakParas: pendingBreaks, paras: current })
        pendingBreaks = []
      }
      current = []
      sentenceCount = 0
      pendingBreaks.push(para)
      continue
    }

    const sentences = (para.match(SENTENCE_END_RE) ?? []).length
    sentenceCount += sentences

    current.push(para)

    // 문장 임계값 초과 시 새 장면 시작
    if (sentenceCount >= sentenceThreshold) {
      groups.push({ breakParas: pendingBreaks, paras: current })
      pendingBreaks = []
      current = []
      sentenceCount = 0
    }
  }

  if (current.length > 0) groups.push({ breakParas: pendingBreaks, paras: current })
  return groups
}

// ─────────────────────────────────────────────
// 메인 파서
// ─────────────────────────────────────────────

export function parseNovel(text: string, sentenceThreshold = 8): AnalyzedScene[] {
  const paragraphs = splitParagraphs(text)
  if (paragraphs.length === 0) return []

  const sceneGroups = groupParasIntoScenes(paragraphs, sentenceThreshold)

  // 귀속 컨텍스트는 작품 전체에서 공유 (레지스트리·교대 상태가 장면 경계를 넘어 유지)
  const ctx = createAttributionContext()

  return sceneGroups.map((group, idx): AnalyzedScene => {
    const { paras } = group
    const allLines: AnalyzedLine[] = []
    let lineIdx = 0

    // 씬 구분자 단락의 인물 언급을 레지스트리에 공급 (서사 순서 유지)
    for (const breakPara of group.breakParas) {
      recordMentions(breakPara, ctx.registry)
    }

    for (const para of paras) {
      const extracted = extractLinesFromParagraph(para, ctx)
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
