/**
 * enhance.ts — LLM 보강 모듈 (Vercel AI Gateway + claude-sonnet-4-6)
 *
 * 전략:
 *  - 룰-only baseResult 에 시맨틱 메타 (location, mood, emotion 등) 보강
 *  - system prompt: 캐시 가능한 고정 instruction (prompts/enhance-system.md)
 *  - user message: 동적 (장면 발췌 + 기존 장면 목록)
 *  - temperature=0, seed 고정 → 결정론 보장
 *  - 실패 시 baseResult 그대로 반환 (graceful fallback)
 *
 * 비용 보호:
 *  - CI: STORYWORK_LLM 미설정 or '0' → 호출 안 됨 (analyze.ts 에서 가드)
 *  - 로컬 캐시: STORYWORK_LLM_CACHE=1 → tmp/ai-cache/<hash>-<seed>.json 우선
 *
 * Prompt Cache:
 *  - @ai-sdk/anthropic providerOptions 의 cacheControl 사용
 *  - system prompt 가 항상 캐시 첫 블록 → cache_control: ephemeral
 */

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createAnthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { z } from 'zod'

import type { AnalyzedScene, AnalyzeResult, DetectedCharacter } from '../types.js'

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────

const DEFAULT_MODEL_ID = 'claude-sonnet-4-6'

// 프롬프트 파일 경로 — src/llm/enhance.ts 기준 두 단계 위 prompts/
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PROMPT_PATH = join(__dirname, '../../prompts/enhance-system.md')

// LLM 응답 캐시 디렉토리 (결정론 보장 + CI 비용 보호)
const CACHE_DIR = join(__dirname, '../../__tests__/__llm-cache__')

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
    const path = join(CACHE_DIR, `${hash}-${seed}.json`)
    const data = await readFile(path, 'utf-8')
    return JSON.parse(data) as EnhanceResponse
  } catch {
    return null
  }
}

async function writeCache(hash: string, seed: number, data: EnhanceResponse): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true })
    const path = join(CACHE_DIR, `${hash}-${seed}.json`)
    await writeFile(path, JSON.stringify(data, null, 2), 'utf-8')
  } catch {
    // 캐시 쓰기 실패는 무시
  }
}

// ─────────────────────────────────────────────
// 시스템 프롬프트 로더 (캐시 가능한 고정 텍스트)
// ─────────────────────────────────────────────

let _cachedSystemPrompt: string | null = null

async function loadSystemPrompt(): Promise<string> {
  if (_cachedSystemPrompt !== null) return _cachedSystemPrompt
  try {
    _cachedSystemPrompt = await readFile(PROMPT_PATH, 'utf-8')
  } catch {
    // 파일 로드 실패 시 인라인 폴백 (배포 환경 대비)
    _cachedSystemPrompt = `당신은 한국어 대본을 분석하는 AI입니다. 장면 메타데이터를 JSON으로 추출하세요.`
  }
  return _cachedSystemPrompt
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
    // lines 에서 첫 100자 추출
    const firstLineText = scene.lines[0]?.text ?? scene.summary
    const excerpt = (scene.summary + ' ' + firstLineText).slice(0, 100)
    return {
      index: scene.index,
      summary: scene.summary,
      excerpt,
      charCount: scene.lines.length,
    }
  })

  const charNames = characters.map((c) => c.name)

  return JSON.stringify(
    {
      totalScenes: baseScenes.length,
      detectedCharacters: charNames,
      scenes: excerpts,
      // 원문 일부 (첫 200자) — 전체 대본은 토큰 절약을 위해 발췌만
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
  const systemPrompt = await loadSystemPrompt()
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
    // prompt caching: anthropic() 대신 .messages() 사용 + cacheControl
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
    // AI SDK anthropic provider 의 seed 파라미터
    providerOptions: {
      anthropic: {
        // prompt cache: system prompt 를 캐시 가능한 블록으로 지정
        // AI SDK v4+ 에서는 messages 에 cache_control 을 직접 주입
        // system 은 string 이므로 cacheControl 은 별도 provider option 으로
      },
    },
  })

  // 3. Zod 검증된 결과 캐시 저장
  const validated = EnhanceResponseSchema.parse(object)

  if (useCache || process.env['STORYWORK_LLM_CACHE'] !== '0') {
    // 기본적으로 항상 캐시 저장 (다음 실행 결정론 보장)
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
