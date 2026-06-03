/**
 * POST /api/script/full-pipeline
 *
 * analyze → recommend → compose 4단계 통합 파이프라인.
 * 결과를 Project / Page / SceneDoc / Scene / Line DB 에 저장하고
 * 편집기 진입 URL 을 반환한다.
 *
 * 요청:
 *   {
 *     scriptRaw:        string (1~50,000자),
 *     projectId?:       string | null   // 기존 프로젝트 덮어쓰기
 *     formatId:         string,          // DB Format.id 또는 'preset-b5-novel' 등
 *     title?:           string,          // 신규 프로젝트 제목 (projectId 없을 때 필수)
 *     characterMapping?:Record<string,string>,
 *     seed?:            number,
 *     llmEnabled?:      boolean          // 기본 false (비용 보호)
 *   }
 *
 * 응답:
 *   {
 *     projectId:  string,
 *     pages:      Array<{ id: string, pageIndex: number, thumbnail: null }>,
 *     scenes:     Array<{ id: string, index: number, summary: string }>,
 *     warnings:   string[],
 *     seed:       number,
 *     redirectTo: string   // "/editor?projectId=..."
 *   }
 *
 * 인증:
 *   - Supabase 세션 확인 → 미인증 401
 *
 * LLM 비용 보호:
 *   - llmEnabled 기본 false
 *   - CI 에서는 절대 LLM 호출 없음
 *
 * 결정론 (ADR-0007):
 *   - 같은 seed + 같은 입력 → 같은 pages/warnings 출력 보장
 *
 * lowDpi 제약 (ADR-0011a):
 *   - compose() 가 자동 체크 → warnings 에 포함
 *
 * DB 저장 트랜잭션:
 *   - 실패 시 전체 롤백 (prisma.$transaction)
 *   - 기존 SceneDoc/Scene/Line/Page 는 덮어쓰기 전 삭제
 */

/* eslint-disable import/order */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createWebServerClient } from '@/lib/supabase/server'
import { analyze } from '@storywork/ai-script'
import type { AnalyzeResult, ScriptInputFormat } from '@storywork/ai-script'
import { recommend } from '@storywork/ai-recommend'
import type { RecommendResult } from '@storywork/ai-recommend'
import { compose } from '@storywork/ai-layout'
import type { ComposeResult, LayoutFormat } from '@storywork/ai-layout'
import { getPrismaClient } from '../../_lib/prisma'
import { resolveFormatId } from '@/lib/format-mapping'
/* eslint-enable import/order */

// ─── 라우트 타임아웃 (Next.js) ───────────────────────────────────────────────
export const maxDuration = 60 // 초 — Vercel 무료 플랜 최대
export const dynamic = 'force-dynamic'

// ─── Zod 스키마 ──────────────────────────────────────────────────────────────

const FullPipelineRequestSchema = z
  .object({
    scriptRaw: z.string().min(1).max(50_000),
    projectId: z.string().nullable().optional(),
    formatId: z.string().min(1),
    title: z.string().min(1).max(200).optional(),
    characterMapping: z.record(z.string(), z.string()).optional(),
    seed: z.number().int().optional(),
    llmEnabled: z.boolean().optional(),
  })
  .refine((d) => d.projectId || d.title, { message: 'projectId 또는 title 둘 중 하나 필수' })

// ─── 에러 헬퍼 ───────────────────────────────────────────────────────────────

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

// ─── 사용자 조회 (이메일 기준) ────────────────────────────────────────────────

async function findUserByEmail(email: string) {
  const prisma = getPrismaClient()
  return prisma.user.findUnique({ where: { email } })
}

// ─── POST /api/script/full-pipeline ──────────────────────────────────────────

export async function POST(req: Request): Promise<NextResponse> {
  // 1. 인증
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
    return jsonError('사용자 정보를 찾을 수 없습니다.', 404)
  }

  // 3. 요청 파싱 + 검증
  let body: z.infer<typeof FullPipelineRequestSchema>
  try {
    const raw: unknown = await req.json()
    body = FullPipelineRequestSchema.parse(raw)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: '요청 파라미터가 유효하지 않습니다.', details: err.flatten() },
        { status: 400 },
      )
    }
    return jsonError('요청 본문이 유효하지 않습니다.', 400)
  }

  const { scriptRaw, projectId, title, characterMapping, seed = 0, llmEnabled = false } = body
  const resolvedFormatId = resolveFormatId(body.formatId)

  const prisma = getPrismaClient()

  // 4. Format 로드
  const dbFormat = await prisma.format.findUnique({
    where: { id: resolvedFormatId },
    select: { id: true, widthMm: true, heightMm: true, dpi: true, bleedMm: true, safeMm: true },
  })
  if (!dbFormat) {
    return jsonError(`Format 을 찾을 수 없습니다: ${resolvedFormatId}`, 404)
  }

  const format: LayoutFormat = {
    id: dbFormat.id,
    widthMm: dbFormat.widthMm,
    heightMm: dbFormat.heightMm,
    dpi: dbFormat.dpi,
    bleedMm: dbFormat.bleedMm,
    safeMm: dbFormat.safeMm,
  }

  // 5. 기존 프로젝트 소유권 확인
  if (projectId) {
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true },
    })
    if (!existing) {
      return jsonError('프로젝트를 찾을 수 없습니다.', 404)
    }
    if (existing.ownerId !== dbUser.id) {
      return jsonError('접근 권한이 없습니다.', 403)
    }
  }

  console.warn(
    `[full-pipeline] start: userId=${dbUser.id}, formatId=${resolvedFormatId}, seed=${seed}, llmEnabled=${llmEnabled}`,
  )

  // 6. analyze() — 대본 분석
  let analyzed: AnalyzeResult
  try {
    analyzed = await analyze(scriptRaw, {
      seed,
      format: 'auto' as ScriptInputFormat,
      maxAlternatives: 3,
      llmEnabled,
    })
  } catch (err) {
    console.error('[full-pipeline] analyze 실패:', err)
    return jsonError('대본 분석 중 오류가 발생했습니다.', 500)
  }

  console.warn(`[full-pipeline] analyze done: scenes=${analyzed.scenes.length}`)

  // 7. recommend() — 포즈/배경 추천
  let recommended: RecommendResult
  try {
    recommended = await recommend(analyzed, {
      seed,
      characterMapping: characterMapping ?? {},
      candidatesPerCharacter: 5,
      llmEnabled: false, // 비용 보호: recommend 는 항상 rule-only
    })
  } catch (err) {
    console.error('[full-pipeline] recommend 실패:', err)
    return jsonError('추천 중 오류가 발생했습니다.', 500)
  }

  console.warn(`[full-pipeline] recommend done: scenes=${recommended.scenes.length}`)

  // 8. compose() — 페이지 배치
  let composed: ComposeResult
  try {
    composed = await compose(analyzed, recommended, {
      formatId: format.id,
      format,
      seed,
      preferredTemplateIds: [],
      enableSplitMerge: true,
    })
  } catch (err) {
    console.error('[full-pipeline] compose 실패:', err)
    return jsonError('페이지 배치 중 오류가 발생했습니다.', 500)
  }

  console.warn(
    `[full-pipeline] compose done: pages=${composed.pages.length}, warnings=${composed.warnings.length}`,
  )

  // 9. DB 저장 트랜잭션
  let savedProjectId: string
  type SavedPage = { id: string; pageIndex: number; thumbnail: null }
  type SavedScene = { id: string; index: number; summary: string }
  let savedPages: SavedPage[] = []
  let savedScenes: SavedScene[] = []

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 9-a. Project upsert
      let prjId: string
      if (projectId) {
        // 기존 프로젝트 → 메타 업데이트
        await tx.project.update({
          where: { id: projectId },
          data: {
            title: title ?? undefined,
            formatId: resolvedFormatId,
            status: 'composing',
          },
        })
        prjId = projectId

        // 기존 SceneDoc/Scene/Line/Page 삭제 (덮어쓰기)
        await tx.sceneDoc.deleteMany({ where: { projectId: prjId } })
        await tx.page.deleteMany({ where: { projectId: prjId } })
      } else {
        // 신규 프로젝트 생성
        const newProject = await tx.project.create({
          data: {
            ownerId: dbUser.id,
            formatId: resolvedFormatId,
            title: title ?? `새 콘티 — ${new Date().toLocaleDateString('ko-KR')}`,
            status: 'composing',
          },
        })
        prjId = newProject.id
      }

      // 9-b. SceneDoc 생성
      const sceneDoc = await tx.sceneDoc.create({
        data: {
          projectId: prjId,
          scriptRaw,
          meta: {
            format: analyzed.format,
            seed: analyzed.seed,
            modelVersion: analyzed.modelVersion,
            characterCount: analyzed.characters.length,
          },
        },
      })

      // 9-c. Scene + Line 생성
      const createdScenes: SavedScene[] = []
      for (const scene of analyzed.scenes) {
        const createdScene = await tx.scene.create({
          data: {
            sceneDocId: sceneDoc.id,
            index: scene.index,
            slug: scene.slug,
            summary: scene.summary,
            emotion: scene.meta.emotion ?? null,
            view: scene.meta.view ?? null,
          },
        })
        createdScenes.push({
          id: createdScene.id,
          index: createdScene.index,
          summary: createdScene.summary,
        })

        if (scene.lines.length > 0) {
          await tx.line.createMany({
            data: scene.lines.map((line) => ({
              sceneId: createdScene.id,
              index: line.index,
              speaker: line.speaker ?? null,
              text: line.text,
            })),
          })
        }
      }

      // 9-d. Page 생성 (fabricJson 저장)
      const createdPages: SavedPage[] = []
      for (const page of composed.pages) {
        const createdPage = await tx.page.create({
          data: {
            projectId: prjId,
            index: page.pageIndex,
            templateId: page.templateId ?? null,
            // PageFabricJson → Prisma JSON 캐스팅
            fabricJson: page.fabricJson as Parameters<
              typeof tx.page.create
            >[0]['data']['fabricJson'],
            thumbnail: null,
          },
        })
        createdPages.push({
          id: createdPage.id,
          pageIndex: page.pageIndex,
          thumbnail: null,
        })
      }

      // 9-e. Project 상태 → editing
      await tx.project.update({
        where: { id: prjId },
        data: { status: 'editing' },
      })

      return { projectId: prjId, pages: createdPages, scenes: createdScenes }
    })

    savedProjectId = result.projectId
    savedPages = result.pages
    savedScenes = result.scenes
  } catch (err) {
    console.error('[full-pipeline] DB 저장 실패:', err)
    return jsonError('DB 저장 중 오류가 발생했습니다.', 500)
  }

  console.warn(
    `[full-pipeline] done: projectId=${savedProjectId}, pages=${savedPages.length}, scenes=${savedScenes.length}`,
  )

  return NextResponse.json({
    projectId: savedProjectId,
    pages: savedPages,
    scenes: savedScenes,
    warnings: composed.warnings,
    seed,
    redirectTo: `/editor?projectId=${savedProjectId}`,
  })
}

export function GET(): NextResponse {
  return NextResponse.json({ error: 'Method Not Allowed. Use POST.' }, { status: 405 })
}
