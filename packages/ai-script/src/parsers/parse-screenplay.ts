/**
 * parse-screenplay.ts
 *
 * 스크린플레이 형식 파싱 — "화자: 대사" 패턴 정규식 기반.
 * 씬 구분: 빈 행 2개 이상 또는 씬 헤더(INT./EXT. 또는 #씬N:).
 *
 * 규칙:
 * - 화자행: [이름]: [내용] → speaker + text 분리
 * - 지문행: 대괄호 감싸진 행 또는 화자 없는 행 → speaker=undefined
 * - 씬 경계: 연속 빈 행 2+ 또는 씬 헤더
 */

import type { AnalyzedLine, AnalyzedScene, SceneMeta } from '../types.js'

import { buildSlug, extractEmotion } from './utils.js'

// ─────────────────────────────────────────────
// 패턴
// ─────────────────────────────────────────────

const SPEAKER_COLON_RE = /^([가-힣a-zA-Z\s]{1,20})\s*:\s*(.+)/
const SCENE_HEADER_KO_RE = /^(씬|장면|#씬|씬\s*\d+)/i
const SCENE_HEADER_EN_RE = /^(INT\.|EXT\.|INT\/EXT\.)/i
const STAGE_DIRECTION_RE = /^\[.+\]$|^\(.+\)$/

// ─────────────────────────────────────────────
// 스크린플레이 파서
// ─────────────────────────────────────────────

export function parseScreenplay(text: string): AnalyzedScene[] {
  const rawLines = text.split('\n')
  const scenes: AnalyzedScene[] = []

  let currentLines: AnalyzedLine[] = []
  let currentChars = new Set<string>()
  let sceneIndex = 0
  let lineIndex = 0
  let consecutiveEmpty = 0

  const flushScene = () => {
    if (currentLines.length === 0) return
    const allText = currentLines.map((l) => l.text).join(' ')
    const meta: SceneMeta = { emotion: extractEmotion(allText) }
    scenes.push({
      index: sceneIndex,
      slug: buildSlug(sceneIndex),
      summary: allText.slice(0, 80).replace(/\s+/g, ' '),
      meta,
      lines: currentLines,
      characters: Array.from(currentChars),
      confidence: 0.75,
    })
    sceneIndex++
    currentLines = []
    currentChars = new Set()
    lineIndex = 0
    consecutiveEmpty = 0
  }

  for (const raw of rawLines) {
    const line = raw.trim()

    if (line === '') {
      consecutiveEmpty++
      if (consecutiveEmpty >= 2) {
        flushScene()
      }
      continue
    }
    consecutiveEmpty = 0

    // 씬 헤더 → 새 장면 시작
    if (SCENE_HEADER_KO_RE.test(line) || SCENE_HEADER_EN_RE.test(line)) {
      flushScene()
      continue
    }

    // 지문 (무시하거나 배경 지문으로 처리)
    if (STAGE_DIRECTION_RE.test(line)) {
      continue
    }

    const speakerMatch = SPEAKER_COLON_RE.exec(line)
    if (speakerMatch) {
      const speaker = speakerMatch[1]?.trim() ?? ''
      const text = speakerMatch[2]?.trim() ?? ''
      if (speaker && text) {
        currentChars.add(speaker)
        currentLines.push({ index: lineIndex++, speaker, text })
      }
    } else {
      // 화자 없는 행 (내레이션 / 지문)
      currentLines.push({ index: lineIndex++, speaker: undefined, text: line })
    }
  }

  flushScene()
  return scenes
}
