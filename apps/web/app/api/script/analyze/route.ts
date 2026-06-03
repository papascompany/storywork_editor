/**
 * POST /api/script/analyze
 *
 * 대본 텍스트를 분석해 SceneDoc + Scene[] 를 DB 에 저장하고
 * AnalyzeResult JSON 을 반환한다.
 *
 * 요청:
 *   { projectId: string, scriptRaw: string, seed?: number, format?: ScriptInputFormat, llmEnabled?: boolean }
 *
 * 응답:
 *   AnalyzeResult JSON (scenes, characters, alternatives, seed, modelVersion)
 *
 * 인증:
 *   - Supabase 세션 확인 → 미인증 401
 *   - 본인 Project 소유권 확인 → 403
 *
 * Rate limit (placeholder):
 *   - 분당 N=10회 제한 (추후 plan 별 차등)
 *   - 현재는 콘솔 로그만 남기는 placeholder
 *
 * LLM 비용 보호:
 *   - STORYWORK_LLM=0 (기본) → 룰-only 분석
 *   - 요청 body llmEnabled=false 로 명시 오버라이드 가능
 */

/* eslint-disable import/order */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createWebServerClient } from '@/lib/supabase/server'
import { analyze } from '@storywork/ai-script'
import type { AnalyzeResult, ScriptInputFormat } from '@storywork/ai-script'
import { getPrismaClient } from '../../_lib/prisma'
/* eslint-enable import/order */

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const RATE_LIMIT_PER_MIN = 10 // placeholder — 추후 plan 별 차등

// ─── 요청 스키마 ──────────────────────────────────────────────────────────────

const AnalyzeRequestSchema = z.object({
  projectId: z.string().min(1),
  scriptRaw: z.string().min(1).max(50_000),
  seed: z.number().int().optional(),
  format: z
    .enum(['auto', 'novel', 'screenplay', 'essay', 'diary', 'light-novel'])
    .optional()
    .default('auto'),
  llmEnabled: z.boolean().optional(),
  maxAlternatives: z.number().int().min(0).max(5).optional(),
})

// ─── 에러 응답 헬퍼 ───────────────────────────────────────────────────────────

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

// ─── 사용자 조회 헬퍼 (이메일 기준) ──────────────────────────────────────────

async function findUserByEmail(email: string) {
  const prisma = getPrismaClient()
  return prisma.user.findUnique({ where: { email } })
}

// ─── Rate limit placeholder ───────────────────────────────────────────────────

function logRateLimitCheck(userId: string): void {
  // TODO(M4-02): 실제 rate limiting 구현 (Redis 또는 Upstash)
  // 현재는 콘솔 로그만 남기는 placeholder
  console.warn(`[rate-limit] userId=${userId}, limit=${RATE_LIMIT_PER_MIN}/min`)
}

// ─── SceneDoc + Scene DB 저장 ────────────────────────────────────────────────

async function upsertSceneDoc(
  projectId: string,
  scriptRaw: string,
  result: AnalyzeResult,
): Promise<void> {
  const prisma = getPrismaClient()

  // 트랜잭션으로 SceneDoc + Scene[] + Line[] 일괄 저장
  await prisma.$transaction(async (tx) => {
    // 기존 SceneDoc 삭제 (재분석 시 덮어쓰기)
    await tx.sceneDoc.deleteMany({ where: { projectId } })

    // SceneDoc 생성
    const sceneDoc = await tx.sceneDoc.create({
      data: {
        projectId,
        scriptRaw,
        meta: {
          format: result.format,
          seed: result.seed,
          modelVersion: result.modelVersion,
          characterCount: result.characters.length,
        },
      },
    })

    // Scene[] + Line[] 생성
    for (const scene of result.scenes) {
      const created = await tx.scene.create({
        data: {
          sceneDocId: sceneDoc.id,
          index: scene.index,
          slug: scene.slug,
          summary: scene.summary,
          emotion: scene.meta.emotion,
          view: scene.meta.view,
        },
      })

      // Line[] 생성
      if (scene.lines.length > 0) {
        await tx.line.createMany({
          data: scene.lines.map((line: { index: number; speaker?: string; text: string }) => ({
            sceneId: created.id,
            index: line.index,
            speaker: line.speaker ?? null,
            text: line.text,
          })),
        })
      }
    }
  })
}

// ─── POST /api/script/analyze ────────────────────────────────────────────────

export async function POST(req: Request): Promise<NextResponse> {
  // 1. 인증 확인
  const supabase = await createWebServerClient()
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser?.email) {
    return jsonError('로그인이 필요합니다.', 401)
  }

  // 2. DB 사용자 조회
  const dbUser = await findUserByEmail(authUser.email)
  if (!dbUser) {
    return jsonError('사용자를 찾을 수 없습니다.', 401)
  }

  // 3. 요청 파싱 + 검증
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('요청 본문이 유효하지 않습니다.', 400)
  }

  const parsed = AnalyzeRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: '요청 파라미터가 유효하지 않습니다.', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { projectId, scriptRaw, seed, format, llmEnabled, maxAlternatives } = parsed.data

  // 4. 소유권 검증
  const prisma = getPrismaClient()
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true },
  })

  if (!project) {
    return jsonError('프로젝트를 찾을 수 없습니다.', 404)
  }

  if (project.ownerId !== dbUser.id) {
    return jsonError('접근 권한이 없습니다.', 403)
  }

  // 5. Rate limit 로그 (placeholder)
  logRateLimitCheck(dbUser.id)

  // 6. LLM 비용 로그 (모니터링 placeholder)
  const effectiveLlm = llmEnabled ?? process.env['STORYWORK_LLM'] === '1'
  console.warn(
    `[ai-script] analyze start: projectId=${projectId}, format=${format}, llmEnabled=${effectiveLlm}, seed=${seed ?? 0}`,
  )

  // 7. 대본 분석
  let result: AnalyzeResult
  try {
    result = await analyze(scriptRaw, {
      seed: seed ?? 0,
      format: format as ScriptInputFormat,
      maxAlternatives: maxAlternatives ?? 3,
      llmEnabled,
    })
  } catch (err) {
    console.error('[ai-script] analyze 실패:', err)
    return jsonError('대본 분석 중 오류가 발생했습니다.', 500)
  }

  // 8. LLM 토큰 비용 로그 (placeholder — PostHog 전송 추후 구현)
  console.warn(
    `[ai-script] analyze done: projectId=${projectId}, scenes=${result.scenes.length}, modelVersion=${result.modelVersion}`,
  )

  // 9. DB 저장 (SceneDoc + Scene + Line)
  try {
    await upsertSceneDoc(projectId, scriptRaw, result)
  } catch (err) {
    console.error('[ai-script] DB 저장 실패:', err)
    // DB 저장 실패해도 분석 결과는 반환 (클라이언트 활용 가능)
    return NextResponse.json({ ...result, _dbSaveError: true })
  }

  return NextResponse.json(result)
}
