/**
 * POST /api/script/recommend
 *
 * ai-script.analyze() 결과를 입력받아 각 장면의
 * 포즈/배경/말풍선/워드효과 추천을 반환한다.
 *
 * 요청:
 *   {
 *     analyzed: AnalyzeResult,
 *     characterMapping?: Record<string, string>,
 *     seed?: number,
 *     candidatesPerCharacter?: number
 *   }
 *
 * 응답:
 *   RecommendResult JSON (scenes, alternatives, seed, modelVersion)
 *
 * 인증:
 *   - Supabase 세션 확인 → 미인증 401
 *
 * 비용 보호:
 *   - 룰 기반 우선 (llmEnabled=false)
 *   - DB 임베딩 검색은 향후 VOYAGE/OPENAI 키 도입 후 자동 활성
 */

/* eslint-disable import/order */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createWebServerClient } from '@/lib/supabase/server'
import { recommend } from '@storywork/ai-recommend'
import type { RecommendResult } from '@storywork/ai-recommend'
import type { AnalyzeResult } from '@storywork/ai-script'
/* eslint-enable import/order */

// ─── 스키마 ───────────────────────────────────────────────────────────────────

const AnalyzedLineSchema = z.object({
  index: z.number(),
  speaker: z.string().optional(),
  text: z.string(),
  offset: z.number().optional(),
})

const SceneMetaSchema = z.object({
  location: z.string().optional(),
  timeOfDay: z.string().optional(),
  cameraAngle: z.string().optional(),
  pacing: z.string().optional(),
  mood: z.string().optional(),
  emotion: z.string().optional(),
  view: z.string().optional(),
  props: z.array(z.string()).optional(),
  pageBreak: z.boolean().optional(),
})

const AnalyzedSceneSchema = z.object({
  index: z.number(),
  slug: z.string(),
  summary: z.string(),
  meta: SceneMetaSchema,
  lines: z.array(AnalyzedLineSchema),
  characters: z.array(z.string()),
  confidence: z.number(),
})

const DetectedCharacterSchema = z.object({
  name: z.string(),
  mentionCount: z.number(),
  suggestedBodyType: z.enum(['M', 'F', 'child']).optional(),
})

// AnalyzeResult 의 핵심 필드만 검증 (재귀 alternatives 는 생략)
const AnalyzeResultSchema = z.object({
  format: z.enum(['auto', 'novel', 'screenplay', 'essay', 'diary', 'light-novel']),
  scenes: z.array(AnalyzedSceneSchema),
  characters: z.array(DetectedCharacterSchema),
  seed: z.number(),
  modelVersion: z.string(),
})

const RecommendRequestSchema = z.object({
  analyzed: AnalyzeResultSchema,
  characterMapping: z.record(z.string(), z.string()).optional(),
  seed: z.number().int().optional(),
  candidatesPerCharacter: z.number().int().min(1).max(20).optional(),
})

// ─── 에러 헬퍼 ───────────────────────────────────────────────────────────────

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

// ─── POST /api/script/recommend ──────────────────────────────────────────────

export async function POST(req: Request): Promise<NextResponse> {
  // 1. 인증 확인
  const supabase = await createWebServerClient()
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return jsonError('로그인이 필요합니다.', 401)
  }

  // 2. 요청 파싱 + 검증
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('요청 본문이 유효하지 않습니다.', 400)
  }

  const parsed = RecommendRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: '요청 파라미터가 유효하지 않습니다.', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { analyzed, characterMapping, seed, candidatesPerCharacter } = parsed.data

  // 3. 추천 실행
  console.warn(
    `[ai-recommend] start: userId=${authUser.id}, scenes=${analyzed.scenes.length}, seed=${seed ?? 0}`,
  )

  let result: RecommendResult
  try {
    result = await recommend(analyzed as AnalyzeResult, {
      seed: seed ?? 0,
      characterMapping: characterMapping ?? {},
      candidatesPerCharacter: candidatesPerCharacter ?? 5,
      llmEnabled: false, // M4-02: 룰 기반 우선
    })
  } catch (err) {
    console.error('[ai-recommend] 추천 실패:', err)
    return jsonError('추천 중 오류가 발생했습니다.', 500)
  }

  console.warn(
    `[ai-recommend] done: scenes=${result.scenes.length}, modelVersion=${result.modelVersion}`,
  )

  return NextResponse.json(result)
}

// GET 차단
export function GET(): NextResponse {
  return NextResponse.json({ error: 'Method Not Allowed. Use POST.' }, { status: 405 })
}
