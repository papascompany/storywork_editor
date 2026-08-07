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

import { attributeParagraph, createAttributionContext, recordMentions } from './ko-speech.js'
import type { AttributionContext } from './ko-speech.js'
import { buildSlug, buildSummary, extractEmotion, isLikelyName } from './utils.js'

// ─────────────────────────────────────────────
// 패턴
// ─────────────────────────────────────────────

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

  // ko-speech 1층 룰 엔진으로 인용 추출 + 화자 귀속
  const attributed = attributeParagraph(para, ctx)
  for (const q of attributed) {
    result.push({ index: lineIdx++, speaker: q.speaker, text: q.text, kind: 'dialogue' })
  }

  // 대화가 없으면 단락 전체를 서술 행으로 — 말풍선이 아니라 캡션 박스로 간다 (SCRIPT-KO-04)
  if (result.length === 0 && para.length > 0) {
    result.push({
      index: lineIdx++,
      speaker: undefined,
      text: para.slice(0, 200),
      kind: 'narration',
    })
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
