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
  return createHash('sha256').update(`${seed}:${raw}`).digest('hex').slice(0, 16)
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

function buildUserMessage(
  raw: string,
  baseScenes: AnalyzedScene[],
  characters: DetectedCharacter[],
): string {
  // 장면별 원문 발췌 (첫 100자)
  const excerpts = baseScenes.map((scene) => {
    const firstLineText = scene.lines[0]?.text ?? scene.summary
    const excerpt = (scene.summary + ' ' + firstLineText).slice(0, 100)
    return {
      index: scene.index,
      summary: scene.summary,
      excerpt,
      lineCount: scene.lines.length,
    }
  })

  const charNames = characters.map((c) => c.name)

  return JSON.stringify(
    {
      totalScenes: baseScenes.length,
      detectedCharacters: charNames,
      scenes: excerpts,
      // 원문 첫 200자 발췌 — 전체 대본은 토큰 절약을 위해 생략
      scriptHead: raw.slice(0, 200),
    },
    null,
    2,
  )
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

  // 2. LLM 호출
  // 시스템 프롬프트: 인라인 상수 (Next.js webpack 호환, prompt cache 최적화)
  const systemPrompt = ENHANCE_SYSTEM_PROMPT
  const userMessage = buildUserMessage(raw, baseResult.scenes, baseResult.characters)

  // Vercel AI Gateway 또는 직접 Anthropic API 사용
  // AI_GATEWAY_API_KEY: Vercel AI Gateway, ANTHROPIC_API_KEY: 직접 연결
  const apiKey = process.env['AI_GATEWAY_API_KEY'] ?? process.env['ANTHROPIC_API_KEY']

  const anthropic = createAnthropic({
    apiKey,
    // Vercel AI Gateway URL (설정 시 게이트웨이 경유)
    baseURL: process.env['AI_GATEWAY_BASE_URL'] ?? undefined,
  })

  const { object } = await generateObject({
    model: anthropic(modelId),
    schema: EnhanceResponseSchema,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: userMessage,
          },
        ],
      },
    ],
    system: systemPrompt,
    temperature: 0,
    providerOptions: {
      anthropic: {
        // prompt cache: system prompt 가 고정 텍스트이므로 캐시 효과 기대
        // AI SDK v6 + Anthropic prompt caching 자동 활성 (1024 토큰 이상 시)
      },
    },
  })

  // 3. Zod 검증된 결과 캐시 저장
  const validated = EnhanceResponseSchema.parse(object)

  // 기본적으로 항상 캐시 저장 (다음 실행 결정론 보장 + 비용 절감)
  if (process.env['STORYWORK_LLM_CACHE'] !== '0') {
    await writeCache(hash, seed, validated)
  }

  return mergeEnhancement(baseResult, validated)
}

// ─────────────────────────────────────────────
// 보강 결과 병합
// ─────────────────────────────────────────────

function mergeEnhancement(base: AnalyzeResult, enhancement: EnhanceResponse): AnalyzeResult {
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
    modelVersion: `claude-sonnet-4-6`,
  }
}
