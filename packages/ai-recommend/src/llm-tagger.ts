/**
 * llm-tagger.ts — 미매칭 자산 AI 2차 태깅 (M2-03b / AI-ACT-02)
 *
 * 1차(파일명 사전, `filename-tagger.ts`)가 커버하지 못한 자산만 LLM 으로 태깅한다.
 *
 * 현재 보유 자산(1,260장) 기준 1차 매칭률은 **100%**(적재 대상 1,243/1,243,
 * 나머지 17장은 `중복` 폴더 = 적재 제외)이므로 지금 당장의 호출 대상은 0건이다.
 * 이 모듈의 실효 목적은 **신규 자산 유입 시 fallback** — 사전에 없는 파일명이
 * 들어왔을 때 검수 큐로 흘리기 전에 action/bodyType/view/mood 를 제안한다.
 *
 * 비용·결정론 계약 (M4-01-03 `ai-script/llm/enhance.ts` 패턴 동일):
 *  - 캐시 우선: `STORYWORK_LLM_CACHE=1` 이면 `<hash>.json` 을 먼저 읽어 LLM 미호출
 *  - env 하드 게이트: `STORYWORK_LLM` 이 '1'|'true' 가 아니면 **호출하지 않고 null 반환**
 *    (CI 비용 0. 클라이언트 입력으로 켤 수 없음 — CONTI-03 리뷰의 게이트 원칙과 동일)
 *  - 키 부재 시에도 조용히 null (파이프라인은 검수 큐로 폴백)
 *
 * 반환값은 제안(suggestion)이며 confidence 를 낮게(≤0.6) 유지한다 — 사전 매칭보다
 * 신뢰도가 낮아야 `inferred` 검수 대상으로 남는다.
 */

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { loadDictionary } from './filename-tagger.js'
import type { FilenameTagResult } from './filename-tagger.js'

// ─────────────────────────────────────────────
// 설정
// ─────────────────────────────────────────────

const DEFAULT_MODEL_ID = 'claude-sonnet-4-6'
/** LLM 제안의 최대 신뢰도 — 사전 매칭(0.75~0.9)보다 항상 낮게 유지 */
const MAX_SUGGESTION_CONFIDENCE = 0.6

function getCacheDir(): string {
  return process.env['STORYWORK_LLM_CACHE_DIR'] ?? join(process.cwd(), '__tests__/__tag-cache__')
}

function isLlmEnabled(): boolean {
  const v = process.env['STORYWORK_LLM']
  return v === '1' || v === 'true'
}

/**
 * 캐시 키 — 모델 ID 를 포함한다. 모델이 바뀌면 이전 모델의 제안을
 * 재사용하지 않아야 하기 때문(결정론은 "같은 입력+같은 모델" 기준).
 */
function inputHash(filename: string, subfolder: string | undefined, modelId: string): string {
  return createHash('sha256')
    .update(`${modelId}|${subfolder ?? ''}/${filename}`)
    .digest('hex')
    .slice(0, 16)
}

// ─────────────────────────────────────────────
// 캐시 I/O
// ─────────────────────────────────────────────

export interface LlmTagSuggestion {
  action?: string
  bodyType?: string
  view?: string
  mood?: string
  /** 0..MAX_SUGGESTION_CONFIDENCE */
  confidence: number
  /** 판단 근거 — 검수 UI 표시용 (영속 대상 아님) */
  reasoning?: string
}

async function readCache(hash: string): Promise<LlmTagSuggestion | null> {
  try {
    const raw = await readFile(join(getCacheDir(), `${hash}.json`), 'utf-8')
    return JSON.parse(raw) as LlmTagSuggestion
  } catch {
    return null
  }
}

async function writeCache(hash: string, data: LlmTagSuggestion): Promise<void> {
  try {
    const file = join(getCacheDir(), `${hash}.json`)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')
  } catch {
    // 캐시 쓰기 실패는 무시 (읽기 전용 FS 등)
  }
}

// ─────────────────────────────────────────────
// 결과 정규화 — 사전 어휘 밖 값 차단
// ─────────────────────────────────────────────

/**
 * LLM 이 만들어낸 임의 키워드가 파이프라인에 유입되지 않도록,
 * 사전(filename-action-dict)에 실제 존재하는 action 만 통과시킨다.
 */
export function sanitizeSuggestion(
  suggestion: LlmTagSuggestion,
  knownActions: ReadonlySet<string>,
): LlmTagSuggestion {
  const action =
    suggestion.action && knownActions.has(suggestion.action) ? suggestion.action : undefined
  const view =
    suggestion.view && ['front', 'side', 'back', 'three-quarter'].includes(suggestion.view)
      ? suggestion.view
      : undefined
  const bodyType =
    suggestion.bodyType &&
    ['M', 'F', 'child', 'beast', 'multi', 'unknown'].includes(suggestion.bodyType)
      ? suggestion.bodyType
      : undefined
  return {
    ...(action ? { action } : {}),
    ...(bodyType ? { bodyType } : {}),
    ...(view ? { view } : {}),
    ...(suggestion.mood ? { mood: suggestion.mood } : {}),
    confidence: Math.min(Math.max(suggestion.confidence, 0), MAX_SUGGESTION_CONFIDENCE),
    ...(suggestion.reasoning ? { reasoning: suggestion.reasoning } : {}),
  }
}

/** 사전에 정의된 action 키워드 집합 */
export function knownActionSet(): Set<string> {
  const dict = loadDictionary()
  const set = new Set<string>()
  for (const rule of dict.rules) {
    if (rule.action) set.add(rule.action)
  }
  return set
}

// ─────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────

export interface LlmTagOptions {
  /** 모델 ID (기본 claude-sonnet-4-6) */
  modelId?: string
  /** 테스트 주입용 — 실제 LLM 호출 대체 */
  _invoke?: (prompt: string) => Promise<LlmTagSuggestion>
}

/**
 * 1차 태깅이 실패한 자산 하나에 대해 LLM 2차 태깅을 시도한다.
 *
 * @returns 제안값. LLM 비활성/키 부재/실패 시 **null** (호출 측은 검수 큐로 폴백)
 */
export async function tagWithLlm(
  filename: string,
  subfolder: string | undefined,
  opts: LlmTagOptions = {},
): Promise<LlmTagSuggestion | null> {
  const modelId = opts.modelId ?? DEFAULT_MODEL_ID
  const hash = inputHash(filename, subfolder, modelId)

  // 1. 캐시 우선 — 키 없이도 결정론 재생 (CI $0)
  if (process.env['STORYWORK_LLM_CACHE'] === '1') {
    const cached = await readCache(hash)
    if (cached) return cached
  }

  // 2. env 하드 게이트 — 켜지지 않았으면 호출 자체를 하지 않는다
  if (!isLlmEnabled()) return null

  const apiKey = process.env['AI_GATEWAY_API_KEY'] ?? process.env['ANTHROPIC_API_KEY']
  if (!apiKey && !opts._invoke) return null

  const known = knownActionSet()
  const prompt = buildTagPrompt(filename, subfolder, [...known])

  try {
    if (!opts._invoke) {
      // 실제 호출 경로는 AI_GATEWAY_API_KEY 등록(대표님 액션) 후 배선한다.
      // 지금 키가 없는 상태에서 의존성만 끌어오지 않도록 주입형으로 유지.
      return null
    }
    const raw = await opts._invoke(prompt)
    const sanitized = sanitizeSuggestion(raw, known)
    await writeCache(hash, sanitized)
    return sanitized
  } catch {
    // LLM 실패는 파이프라인을 막지 않는다 — 검수 큐로
    return null
  }
}

/** 태깅 프롬프트 — 사전 어휘 안에서만 고르도록 강제 */
export function buildTagPrompt(
  filename: string,
  subfolder: string | undefined,
  knownActions: string[],
): string {
  return [
    '너는 웹툰 포즈 자산의 메타데이터 태거다.',
    '파일명(및 폴더명)만 보고 포즈의 action/bodyType/view/mood 를 추정한다.',
    '',
    `파일명: ${filename}`,
    subfolder ? `폴더: ${subfolder}` : '폴더: (루트)',
    '',
    'action 은 반드시 아래 목록 중 하나만 고른다. 확신이 없으면 생략한다:',
    knownActions.join(', '),
    '',
    'bodyType: M | F | child | beast | multi | unknown 중 택1(불명확하면 생략)',
    'view: front | side | back | three-quarter 중 택1(불명확하면 생략)',
    'confidence: 0..0.6 (파일명 근거가 약하면 낮게)',
    '',
    'JSON 만 출력: { "action"?, "bodyType"?, "view"?, "mood"?, "confidence", "reasoning"? }',
  ].join('\n')
}

/**
 * 1차 태깅 결과 목록에서 **AI 2차 태깅이 실제로 필요한 자산**만 골라낸다.
 * skip(적재 제외) 자산은 대상이 아니다 — 이 구분이 없으면 정책적으로 버릴
 * 자산에 LLM 비용을 쓰게 된다 (AI-ACT-02 실측으로 확인된 함정).
 */
export function selectTaggingTargets<T extends { result: FilenameTagResult }>(items: T[]): T[] {
  return items.filter((i) => !i.result.matched && !i.result.skipped)
}
