/**
 * filename-tagger.ts
 *
 * 파일명 기반 1차 태깅 — Claude API 비용 0으로 action/view/bodyType/mood 추출.
 * M2-03a 산출물. 사전: packages/ai-recommend/data/filename-action-dict.ko.json
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ─────────────────────────────────────────────
// 사전 스키마 타입 정의
// ─────────────────────────────────────────────

export type MatchType = 'contains' | 'prefix' | 'suffix' | 'regex'

export interface DictRule {
  id: string
  patterns: string[]
  matchType: MatchType
  action: string | null
  bodyType: string | null
  view: string | null
  mood: string | null
  confidence: number
}

export interface SubfolderTagEntry {
  bodyType?: string
  action?: string
  tags?: string[]
  skip?: boolean
}

export interface ViewHint {
  patterns: string[]
  view: string
  confidence: number
}

export interface FilenameDictionary {
  v: number
  version: string
  description: string
  rules: DictRule[]
  subfolderTags: Record<string, SubfolderTagEntry>
  viewHints: ViewHint[]
  styleVariantHints?: {
    pattern: string
    description: string
  }
}

// ─────────────────────────────────────────────
// 결과 타입
// ─────────────────────────────────────────────

export interface FilenameTagResult {
  action: string | undefined
  bodyType: string | undefined
  view: string | undefined
  mood: string | undefined
  styleVariants: string[]
  /** 매칭된 룰 id 목록 */
  tags: string[]
  /** 0..1 신뢰도. 매칭 없으면 0 */
  confidence: number
  /** 하나라도 매칭되면 true */
  matched: boolean
}

// ─────────────────────────────────────────────
// 사전 로드 (싱글턴 캐시)
// ─────────────────────────────────────────────

let _cachedDict: FilenameDictionary | null = null

function resolveDictPath(): string {
  // __dirname 대체 (ESM 환경 / tsx 환경 모두 호환)
  // 1) 환경변수 오버라이드 (테스트 용도)
  const envOverride = process.env['FILENAME_DICT_PATH']
  if (envOverride) return envOverride

  // 2) import.meta.url 이 있으면 (ESM)
  try {
    const metaUrl = import.meta.url
    if (metaUrl) {
      const thisDir = path.dirname(fileURLToPath(metaUrl))
      // src/ → data/ 경로
      return path.resolve(thisDir, '../data/filename-action-dict.ko.json')
    }
  } catch {
    // fallback
  }

  // 3) CWD 기준 (tsx 스크립트에서 직접 호출 시)
  return path.resolve(process.cwd(), 'packages/ai-recommend/data/filename-action-dict.ko.json')
}

export function loadDictionary(dictPath?: string): FilenameDictionary {
  if (_cachedDict && !dictPath) return _cachedDict

  const resolvedPath = dictPath ?? resolveDictPath()

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`filename-action-dict not found: ${resolvedPath}`)
  }

  const parsed = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8')) as FilenameDictionary
  if (!dictPath) _cachedDict = parsed
  return parsed
}

/** 테스트에서 캐시 초기화용 */
export function clearDictCache(): void {
  _cachedDict = null
}

// ─────────────────────────────────────────────
// 매칭 헬퍼
// ─────────────────────────────────────────────

function matchPattern(normalized: string, pattern: string, matchType: MatchType): boolean {
  const p = pattern.toLowerCase()
  switch (matchType) {
    case 'contains':
      return normalized.includes(p)
    case 'prefix':
      return normalized.startsWith(p)
    case 'suffix':
      return normalized.endsWith(p)
    case 'regex': {
      try {
        return new RegExp(pattern, 'i').test(normalized)
      } catch {
        return false
      }
    }
  }
}

function ruleMatches(normalized: string, rule: DictRule): boolean {
  return rule.patterns.some((pat) => matchPattern(normalized, pat, rule.matchType))
}

// ─────────────────────────────────────────────
// 스타일 변형 번호 추출
// ─────────────────────────────────────────────

function extractStyleVariants(filenameWithoutExt: string): string[] {
  // 파일명 끝의 단일 자릿수 suffix: _1, _2, _3 등
  // 예: Fight-bow_03_1 → _1 → variant "1"
  const match = /_([1-9])$/.exec(filenameWithoutExt)
  if (match?.[1]) return [match[1]]
  return []
}

// ─────────────────────────────────────────────
// 뷰 힌트 적용
// ─────────────────────────────────────────────

function applyViewHints(
  normalized: string,
  hints: ViewHint[],
): { view: string; confidence: number } | null {
  // 명시적 한글 힌트를 우선 (confidence 높은 순)
  const sorted = [...hints].sort((a, b) => b.confidence - a.confidence)
  for (const hint of sorted) {
    for (const pat of hint.patterns) {
      if (normalized.includes(pat.toLowerCase())) {
        return { view: hint.view, confidence: hint.confidence }
      }
    }
  }
  return null
}

// ─────────────────────────────────────────────
// 메인 함수
// ─────────────────────────────────────────────

export function tagFromFilename(
  filename: string,
  subfolder?: string,
  dict?: FilenameDictionary,
): FilenameTagResult {
  const dictionary = dict ?? loadDictionary()

  // 확장자 제거 + NFC 정규화 + 소문자
  const withoutExt = filename.replace(/\.[^.]+$/, '')
  const normalized = withoutExt.normalize('NFC').toLowerCase()

  const matchedRuleIds: string[] = []
  let action: string | undefined
  let bodyType: string | undefined
  let view: string | undefined
  let mood: string | undefined
  let maxConfidence = 0
  let matchCount = 0
  // 서브폴더 태그로만 매칭된 경우도 추적
  let subfolderMatched = false

  // (1) 룰 순회 — 모든 매칭 수집, action/bodyType/view/mood 는 첫 매칭(confidence 최대) 우선
  for (const rule of dictionary.rules) {
    if (!ruleMatches(normalized, rule)) continue

    matchedRuleIds.push(rule.id)
    matchCount++

    if (rule.confidence >= maxConfidence) {
      maxConfidence = rule.confidence
      // action: 더 구체적인 룰이 우선
      if (
        rule.action !== null &&
        (action === undefined || rule.confidence > maxConfidence - 0.01)
      ) {
        action = rule.action
      }
      if (rule.bodyType !== null && bodyType === undefined) {
        bodyType = rule.bodyType
      }
      if (rule.view !== null && view === undefined) {
        view = rule.view
      }
      if (rule.mood !== null && mood === undefined) {
        mood = rule.mood
      }
    }
  }

  // (2) 서브폴더 룰 적용 (파일명 룰보다 우선하지 않음 — 보완 역할)
  // macOS 파일시스템은 NFD로 저장 → NFC 정규화 후 사전 조회
  if (subfolder) {
    const subEntry = dictionary.subfolderTags[subfolder.normalize('NFC')]
    if (subEntry) {
      if (subEntry.skip) {
        // skip 폴더 — 매칭 없음으로 처리
        return {
          action: undefined,
          bodyType: undefined,
          view: undefined,
          mood: undefined,
          styleVariants: [],
          tags: [],
          confidence: 0,
          matched: false,
        }
      }
      if (subEntry.bodyType && !bodyType) {
        bodyType = subEntry.bodyType
        subfolderMatched = true
      }
      if (subEntry.action && !action) {
        action = subEntry.action
        subfolderMatched = true
      }
      if (subEntry.tags) {
        matchedRuleIds.push(...subEntry.tags)
        subfolderMatched = true
      }
    }
  }

  // (3) 뷰 힌트 적용 (뷰가 아직 결정되지 않은 경우)
  if (!view) {
    const viewHint = applyViewHints(normalized, dictionary.viewHints)
    if (viewHint) view = viewHint.view
  }

  // (4) 스타일 변형 추출
  const styleVariants = extractStyleVariants(withoutExt.normalize('NFC'))

  // (5) 신뢰도 계산
  // 파일명 룰 매칭이 없으면 서브폴더 기본 confidence(0.65), 둘 다 없으면 0
  const confidence = matchCount > 0 ? maxConfidence : subfolderMatched ? 0.65 : 0

  // (6) 태그 목록 (중복 제거)
  const tags = [...new Set(matchedRuleIds)]

  return {
    action,
    bodyType,
    view,
    mood,
    styleVariants,
    tags,
    confidence,
    matched: matchCount > 0 || subfolderMatched,
  }
}

/**
 * 서브폴더 내 animal-XX.png 처럼 파일명 자체에 정보가 없는 경우
 * 서브폴더 태그만으로 처리.
 */
export function tagFromSubfolder(subfolder: string, dict?: FilenameDictionary): FilenameTagResult {
  const dictionary = dict ?? loadDictionary()
  // macOS NFD → NFC 정규화
  const subEntry = dictionary.subfolderTags[subfolder.normalize('NFC')]
  if (!subEntry || subEntry.skip) {
    return {
      action: undefined,
      bodyType: undefined,
      view: undefined,
      mood: undefined,
      styleVariants: [],
      tags: [],
      confidence: 0,
      matched: false,
    }
  }
  return {
    action: subEntry.action,
    bodyType: subEntry.bodyType,
    view: undefined,
    mood: undefined,
    styleVariants: [],
    tags: subEntry.tags ?? [],
    confidence: 0.65,
    matched: true,
  }
}
