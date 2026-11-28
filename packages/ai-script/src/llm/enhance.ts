/**
 * enhance.ts — LLM 보강 모듈 (Vercel AI Gateway + claude-sonnet-4-6)
 *
 * 전략:
 *  - 룰-only baseResult 에 시맨틱 메타 (location, mood, emotion 등) 보강
 *  - system prompt: 인라인 상수 (system-prompt.ts) — Next.js webpack 호환
 *  - user message: 동적 (장면 발췌 + 기존 장면 목록)
 *  - temperature=0, seed 고정 → 결정론 보장
 *  - 실패 시 baseResult 그대로 반환 (graceful fallback)
 *
 * CONTI-01 (2026-11-28):
 *  - 컨텍스트 확대 — 장면당 100자 발췌 → 장면 원문 라인(장면당 상한 SCENE_CONTEXT_CHARS)
 *  - 어휘 확장 — view(front/side/back/three-quarter) 추가. cameraAngle 의 closeup/medium/wide 가
 *    샷사이즈(CU/MS/WS)를 겸한다 → page-split R2~R4 · capacity 템플릿 힌트가 실제로 발화
 *  - 장면을 CHUNK_SIZE 단위로 나눠 병렬 호출 + 호출당 타임아웃 — 긴 대본도 라우트 제한 시간 안에 끝나게.
 *    실패한 묶음의 장면은 룰-only 메타 유지, 전 묶음 실패 시에만 throw(analyze.ts 가 rule-only 폴백)
 *
 * 비용 보호:
 *  - CI: STORYWORK_LLM 미설정 or '0' → 호출 안 됨 (analyze.ts 에서 가드)
 *  - 로컬 캐시: STORYWORK_LLM_CACHE=1 → __tests__/__llm-cache__/<hash>-<seed>.json 우선
 *
 * Prompt Cache:
 *  - Anthropic prompt caching: system prompt 고정 텍스트 캐시 히트 최적화
 *  - AI SDK v6 providerOptions.anthropic 에 cacheControl 적용
 *
 * Next.js/webpack 호환:
 *  - import.meta.url 기반 경로 계산 제거
 *  - 파일시스템 접근은 Node.js 환경에서만 (캐시 I/O)
 *  - 시스템 프롬프트는 TypeScript 인라인 상수 (system-prompt.ts)
 */

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { createAnthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { z } from 'zod'

import type { AnalyzedScene, AnalyzeResult, DetectedCharacter } from '../types.js'

import { ENHANCE_SYSTEM_PROMPT } from './system-prompt.js'

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────

const DEFAULT_MODEL_ID = 'claude-sonnet-4-6'

/**
 * 프롬프트·입력 형식 버전 — 캐시 키에 포함한다. 입력 형식을 바꾸면 올려서 옛 캐시가
 * 새 입력의 결과로 오인되지 않게 한다. (v1 = 장면당 100자 발췌, v2 = CONTI-01 원문 컨텍스트)
 */
const PROMPT_VERSION = 'v2'

/** 장면당 LLM 에 보내는 원문 상한(자) — 근거 확보 vs 토큰 비용 */
const SCENE_CONTEXT_CHARS = 600

/** 한 번의 LLM 호출에 담는 장면 수 — 출력 길이(지연)를 묶음 단위로 묶는다 */
const CHUNK_SIZE = 20

/** 동시 LLM 호출 상한 */
const MAX_CONCURRENCY = 4

/** LLM 호출 1건 타임아웃(ms) — full-pipeline maxDuration(60s) 안에서 폴백할 여유 */
const CALL_TIMEOUT_MS = 40_000

// LLM 응답 캐시 디렉토리
// STORYWORK_LLM_CACHE_DIR 환경변수로 명시 설정 가능 (배포/CI 대비)
// 미설정 시: process.cwd() + '__tests__/__llm-cache__'
//   - vitest 실행 cwd = packages/ai-script → 올바른 경로
//   - Next.js route handler 에서는 STORYWORK_LLM_CACHE_DIR 설정 권장
function getCacheDir(): string {
  if (process.env['STORYWORK_LLM_CACHE_DIR']) {
    return process.env['STORYWORK_LLM_CACHE_DIR']
  }
  return join(process.cwd(), '__tests__/__llm-cache__')
}

// ─────────────────────────────────────────────
// 출력 스키마
// ─────────────────────────────────────────────

const SceneEnhanceSchema = z.object({
  index: z.number(),
  location: z.string().optional(),
  timeOfDay: z.enum(['morning', 'noon', 'evening', 'night']).optional(),
  cameraAngle: z.enum(['closeup', 'medium', 'wide', 'bird-eye', 'low-angle']).optional(),
  view: z.enum(['front', 'side', 'back', 'three-quarter']).optional(),
  pacing: z.enum(['fast', 'normal', 'slow']).optional(),
  mood: z.string().optional(),
  emotion: z.string().optional(),
  props: z.array(z.string()).optional(),
  pageBreak: z.boolean().optional(),
})

const CharacterEnhanceSchema = z.object({
  name: z.string(),
  suggestedBodyType: z.enum(['M', 'F', 'child']).optional(),
})

const EnhanceResponseSchema = z.object({
  scenes: z.array(SceneEnhanceSchema),
  characters: z.array(CharacterEnhanceSchema),
  confidence: z.number().min(0).max(1),
})

type EnhanceResponse = z.infer<typeof EnhanceResponseSchema>

// ─────────────────────────────────────────────
// 캐시 헬퍼
// ─────────────────────────────────────────────

function inputHash(raw: string, seed: number): string {
  return createHash('sha256').update(`${PROMPT_VERSION}:${seed}:${raw}`).digest('hex').slice(0, 16)
}

async function readCache(hash: string, seed: number): Promise<EnhanceResponse | null> {
  try {
    const cacheFile = join(getCacheDir(), `${hash}-${seed}.json`)
    const data = await readFile(cacheFile, 'utf-8')
    return JSON.parse(data) as EnhanceResponse
  } catch {
    return null
  }
}

async function writeCache(hash: string, seed: number, data: EnhanceResponse): Promise<void> {
  try {
    const dir = getCacheDir()
    await mkdir(dir, { recursive: true })
    const cacheFile = join(dir, `${hash}-${seed}.json`)
    await writeFile(cacheFile, JSON.stringify(data, null, 2), 'utf-8')
  } catch {
    // 캐시 쓰기 실패는 무시
  }
}

// ─────────────────────────────────────────────
// user 메시지 생성 (동적 부분)
// ─────────────────────────────────────────────

/** 장면 원문 컨텍스트 — 라인을 `화자: 텍스트` 로 이어 붙이고 상한에서 자른다 */
export function sceneContext(scene: AnalyzedScene, maxChars = SCENE_CONTEXT_CHARS): string {
  const body = scene.lines.map((l) => (l.speaker ? `${l.speaker}: ${l.text}` : l.text)).join('\n')
  const text = body.length > 0 ? body : scene.summary
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text
}

export function buildUserMessage(
  raw: string,
  chunkScenes: AnalyzedScene[],
  characters: DetectedCharacter[],
  totalScenes: number,
): string {
  return JSON.stringify(
    {
      totalScenes,
      detectedCharacters: characters.map((c) => c.name),
      scenes: chunkScenes.map((scene) => ({
        index: scene.index,
        summary: scene.summary,
        speakers: scene.characters,
        lineCount: scene.lines.length,
        text: sceneContext(scene),
      })),
      // 대본 도입부 — 시대·장르 감 잡기용 (전체 대본은 토큰 절약을 위해 생략)
      scriptHead: raw.slice(0, 200),
    },
    null,
    2,
  )
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** 동시성 상한을 지키며 순서대로 결과를 모은다 (settled — 개별 실패 허용) */
async function mapSettled<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array<PromiseSettledResult<R>>(items.length)
  let next = 0
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++
      const item = items[i] as T
      try {
        results[i] = { status: 'fulfilled', value: await fn(item) }
      } catch (reason) {
        results[i] = { status: 'rejected', reason }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}

// ─────────────────────────────────────────────
// 메인 LLM 보강 함수
// ─────────────────────────────────────────────

export async function enhanceWithLLM(
  raw: string,
  baseResult: AnalyzeResult,
  opts: { seed: number; modelId?: string },
): Promise<AnalyzeResult> {
  const { seed, modelId = DEFAULT_MODEL_ID } = opts
  const useCache = process.env['STORYWORK_LLM_CACHE'] === '1'
  const hash = inputHash(raw, seed)

  // 1. 캐시 우선 (결정론 보장)
  if (useCache) {
    const cached = await readCache(hash, seed)
    if (cached !== null) {
      return mergeEnhancement(baseResult, cached)
    }
  }

  // 2. LLM 호출 — 장면 묶음별 병렬
  // AI_GATEWAY_API_KEY: Vercel AI Gateway, ANTHROPIC_API_KEY: 직접 연결 (빈 문자열은 미설정 취급)
  const apiKey = process.env['AI_GATEWAY_API_KEY'] || process.env['ANTHROPIC_API_KEY']
  const anthropic = createAnthropic({
    apiKey,
    // Vercel AI Gateway URL (설정 시 게이트웨이 경유)
    baseURL: process.env['AI_GATEWAY_BASE_URL'] || undefined,
  })

  const chunks = chunk(baseResult.scenes, CHUNK_SIZE)
  const settled = await mapSettled(chunks, MAX_CONCURRENCY, async (chunkScenes) => {
    const { object } = await generateObject({
      model: anthropic(modelId),
      schema: EnhanceResponseSchema,
      // 시스템 프롬프트: 인라인 상수 (Next.js webpack 호환, prompt cache 최적화)
      system: ENHANCE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: buildUserMessage(
                raw,
                chunkScenes,
                baseResult.characters,
                baseResult.scenes.length,
              ),
            },
          ],
        },
      ],
      temperature: 0,
      abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    })
    return EnhanceResponseSchema.parse(object)
  })

  const ok = settled.filter(
    (r): r is PromiseFulfilledResult<EnhanceResponse> => r.status === 'fulfilled',
  )
  if (ok.length === 0) {
    const first = settled.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    throw first?.reason instanceof Error ? first.reason : new Error('LLM enhance 전 묶음 실패')
  }
  const failed = settled.length - ok.length
  if (failed > 0) {
    console.warn(
      `[ai-script] LLM enhance 묶음 ${failed}/${settled.length} 실패 — 해당 장면은 룰-only 유지`,
    )
  }

  // 묶음 결과 병합 — 장면은 index 로 합치고, 캐릭터 체형은 먼저 나온 추정을 쓴다
  const seenChars = new Set<string>()
  const merged: EnhanceResponse = {
    scenes: ok.flatMap((r) => r.value.scenes),
    characters: ok
      .flatMap((r) => r.value.characters)
      .filter((c) => (seenChars.has(c.name) ? false : (seenChars.add(c.name), true))),
    confidence: Math.min(...ok.map((r) => r.value.confidence)),
  }

  // 3. 캐시 저장 — 전 묶음 성공 시에만 (부분 결과가 다음 실행의 정답으로 굳지 않게)
  if (failed === 0 && process.env['STORYWORK_LLM_CACHE'] !== '0') {
    await writeCache(hash, seed, merged)
  }

  return mergeEnhancement(baseResult, merged, modelId)
}

// ─────────────────────────────────────────────
// 보강 결과 병합
// ─────────────────────────────────────────────

function mergeEnhancement(
  base: AnalyzeResult,
  enhancement: EnhanceResponse,
  modelId: string = DEFAULT_MODEL_ID,
): AnalyzeResult {
  const sceneMap = new Map(enhancement.scenes.map((s) => [s.index, s]))
  const charMap = new Map(enhancement.characters.map((c) => [c.name, c]))

  const enhancedScenes = base.scenes.map((scene) => {
    const enh = sceneMap.get(scene.index)
    if (!enh) return scene

    return {
      ...scene,
      meta: {
        ...scene.meta,
        ...(enh.location !== undefined && { location: enh.location }),
        ...(enh.timeOfDay !== undefined && { timeOfDay: enh.timeOfDay }),
        ...(enh.cameraAngle !== undefined && { cameraAngle: enh.cameraAngle }),
        ...(enh.view !== undefined && { view: enh.view }),
        ...(enh.pacing !== undefined && { pacing: enh.pacing }),
        ...(enh.mood !== undefined && { mood: enh.mood }),
        ...(enh.emotion !== undefined && { emotion: enh.emotion }),
        ...(enh.props !== undefined && { props: enh.props }),
        ...(enh.pageBreak !== undefined && { pageBreak: enh.pageBreak }),
      },
      confidence: Math.max(scene.confidence, enhancement.confidence * 0.9),
    }
  })

  const enhancedCharacters = base.characters.map((char) => {
    const enh = charMap.get(char.name)
    if (!enh?.suggestedBodyType) return char
    return { ...char, suggestedBodyType: enh.suggestedBodyType }
  })

  return {
    ...base,
    scenes: enhancedScenes,
    characters: enhancedCharacters,
    modelVersion: modelId,
  }
}
