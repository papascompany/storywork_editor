/**
 * parse-screenplay.ts
 *
 * 스크린플레이 형식 파싱 — "화자: 대사" 패턴 정규식 기반.
 * 씬 구분: 빈 행 2개 이상 또는 씬 헤딩(INT./EXT. 또는 `S#1.` · `씬 2:`).
 *
 * 규칙:
 * - 화자행: [이름]: [내용] → speaker + text 분리, `kind='dialogue'`
 * - 지문행: 대괄호/괄호로 감싼 행 → `kind='direction'`
 * - 서술행: 화자 없는 행 → `kind='narration'`
 * - 씬 경계: 연속 빈 행 2+ 또는 씬 헤딩
 *
 * ## 씬 헤딩 처리 (SCRIPT-KO-04)
 * 헤딩은 **라인이 아니라 장면의 속성**이다. 종전 정규식은 `씬`/`장면` 접두만 알아
 * 실무에서 가장 흔한 `S#1.` 형식을 놓쳤고, 그 결과 헤딩이 화자 없는 라인으로 흘러들어
 * 말풍선 슬롯을 차지했다(코퍼스 screenplay 5편 중 4편 = 헤딩 40줄).
 * 이제 헤딩은 `SceneMeta.location/timeOfDay` 로 흡수하고 라인에서 제외한다.
 */

import type { AnalyzedLine, AnalyzedScene, SceneMeta, TimeOfDay } from '../types.js'

import { buildSlug, extractEmotion } from './utils.js'

// ─────────────────────────────────────────────
// 패턴
// ─────────────────────────────────────────────

const SPEAKER_COLON_RE = /^([가-힣a-zA-Z\s]{1,20})\s*:\s*(.+)/

/**
 * 씬 헤딩 — `S#1.` `S 1:` `#3.` `씬 2:` `장면 4.`
 * 구분자(`.` 또는 `:`)를 필수로 둬서 "장면이 바뀌었다" 같은 서술문을 헤딩으로 오인하지 않는다.
 */
const SCENE_HEADER_KO_RE = /^(?:S\s*#?\s*\d+|#\s*\d+|#?\s*(?:씬|장면)\s*\d*)\s*[.:]\s*(.*)$/i
const SCENE_HEADER_EN_RE = /^(?:INT\.|EXT\.|INT\/EXT\.)\s*(.*)$/i
const STAGE_DIRECTION_RE = /^\[.+\]$|^\(.+\)$/

/**
 * 헤딩 꼬리의 시간 표기 → TimeOfDay.
 * 새벽은 별도 값이 없어 `night` 로 접는다 — 배경 톤(navy) 관점에서 밤과 같은 어두운 시간대다.
 * 검사 순서가 곧 우선순위: 좁은 표기(새벽·해질녘)를 넓은 표기(밤·낮)보다 먼저 본다.
 */
const TIME_OF_DAY_PATTERNS: Array<[RegExp, TimeOfDay]> = [
  [/새벽|dawn/i, 'night'],
  [/아침|오전|morning/i, 'morning'],
  [/저녁|해질|해 질|노을|dusk|sunset|evening/i, 'evening'],
  [/밤|심야|자정|night/i, 'night'],
  [/낮|정오|오후|noon|afternoon|day/i, 'noon'],
]

/** 헤딩 꼬리로 인정할 시간 표기의 최대 길이 — "한밤중 골목길" 같은 장소를 시간으로 오인하지 않게 */
const TIME_TOKEN_MAX_LEN = 6

// ─────────────────────────────────────────────
// 씬 헤딩 → 장면 속성
// ─────────────────────────────────────────────

function matchTimeOfDay(token: string): TimeOfDay | undefined {
  if (token.length > TIME_TOKEN_MAX_LEN) return undefined
  for (const [re, value] of TIME_OF_DAY_PATTERNS) {
    if (re.test(token)) return value
  }
  return undefined
}

/** `대학병원 응급실 입구 / 밤` → { location: '대학병원 응급실 입구', timeOfDay: 'night' } */
export function parseSceneHeading(body: string): Pick<SceneMeta, 'location' | 'timeOfDay'> {
  const parts = body
    .split(/\s*[/\-–—]\s*/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  if (parts.length === 0) return {}

  const last = parts[parts.length - 1]
  const timeOfDay = last ? matchTimeOfDay(last) : undefined
  const locationParts = timeOfDay ? parts.slice(0, -1) : parts
  const location = locationParts.join(' ').trim()

  return {
    ...(location ? { location } : {}),
    ...(timeOfDay ? { timeOfDay } : {}),
  }
}

/** 헤딩이면 장면 속성을, 아니면 null 을 반환한다 */
function readHeading(line: string): Pick<SceneMeta, 'location' | 'timeOfDay'> | null {
  const ko = SCENE_HEADER_KO_RE.exec(line)
  if (ko) return parseSceneHeading(ko[1] ?? '')
  const en = SCENE_HEADER_EN_RE.exec(line)
  if (en) return parseSceneHeading(en[1] ?? '')
  return null
}

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
  /**
   * 직전에 만난 헤딩의 장면 속성.
   * 빈 행으로 장면이 더 쪼개져도 장소는 바뀌지 않으므로, 다음 헤딩을 만날 때까지 유지한다.
   */
  let currentHeading: Pick<SceneMeta, 'location' | 'timeOfDay'> = {}

  const flushScene = () => {
    if (currentLines.length === 0) return
    const allText = currentLines.map((l) => l.text).join(' ')
    const meta: SceneMeta = {
      emotion: extractEmotion(allText),
      ...currentHeading,
    }
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

    // 씬 헤딩 → 새 장면 시작 + 장소/시간대를 장면 속성으로 흡수
    const heading = readHeading(line)
    if (heading) {
      flushScene()
      currentHeading = heading
      continue
    }

    // 지문 — 대사가 아니라 캡션 박스로 배치된다 (SCRIPT-KO-04)
    if (STAGE_DIRECTION_RE.test(line)) {
      currentLines.push({ index: lineIndex++, speaker: undefined, text: line, kind: 'direction' })
      continue
    }

    const speakerMatch = SPEAKER_COLON_RE.exec(line)
    if (speakerMatch) {
      const speaker = speakerMatch[1]?.trim() ?? ''
      const text = speakerMatch[2]?.trim() ?? ''
      if (speaker && text) {
        currentChars.add(speaker)
        currentLines.push({ index: lineIndex++, speaker, text, kind: 'dialogue' })
      }
    } else {
      // 화자 없는 행 (내레이션 / 상황 서술)
      currentLines.push({ index: lineIndex++, speaker: undefined, text: line, kind: 'narration' })
    }
  }

  flushScene()
  return scenes
}
