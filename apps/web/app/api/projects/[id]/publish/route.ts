/**
 * POST /api/projects/[id]/publish
 *
 * 동기/비동기 PDF 빌드 + Supabase Storage 업로드 + PublishJob 생성
 *
 * M6-01: 동기 처리 (16p ≤ 6초).
 * M6-02: 비동기 옵션 추가 (body.async = true).
 *
 * 요청 body (JSON, 선택):
 *   { async?: boolean }  — 기본 false (동기 처리). true 이면 Inngest 잡 트리거.
 *   { conti?: boolean }  — CONTI-02: true 이면 SceneDoc 기반 콘티 시트(2×4 그리드)를
 *                          본문 앞에 prepend (동기 모드 전용, async 와 병용 불가).
 *
 * 인증:
 *   - Supabase 세션 확인 → 미인증 401
 *   - 소유권 확인 → 불일치 403
 *
 * 동기 처리 흐름 (async=false):
 *   1. 인증 + 소유권 확인
 *   2. Project + Format + Pages 로드
 *   3. buildPdf() 호출
 *   4. Supabase Storage 업로드 (pdfs/{ownerId}/{projectId}-{ts}.pdf)
 *   5. PublishJob 생성 (status: 'succeeded')
 *   6. 응답: { jobId, pdfUrl, byteSize, warnings, pageCount }
 *
 * 비동기 처리 흐름 (async=true):
 *   1. 인증 + 소유권 확인
 *   2. PublishJob 생성 (status: 'queued')
 *   3. Inngest 이벤트 전송 ('pdf/build.requested')
 *   4. 응답: { jobId, status: 'queued', realtimeChannel: 'pdf-jobs:{jobId}' }
 *   → 진행률: Supabase Realtime 채널 'pdf-jobs:{jobId}' 구독
 *
 * 오류:
 *   - 400: 파라미터 누락
 *   - 401: 미인증
 *   - 403: 소유권 불일치
 *   - 404: 프로젝트/포맷 없음
 *   - 500: 빌드/업로드/Inngest 오류
 */

/* eslint-disable import/order */
import { NextResponse } from 'next/server'
import { composeContiSheets } from '@storywork/ai-layout'
import type { ContiCut } from '@storywork/ai-layout'
import { buildPdf } from '@storywork/pdf-engine'
import type { PdfBuildInput, PageInput } from '@storywork/pdf-engine'
import { inngest } from '@storywork/workers'
import { createWebServerClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase-admin'
import { getPrismaClient } from '../../../_lib/prisma'
import { guardDeletedUser } from '../../../_lib/require-active-user'
/* eslint-enable import/order */

// ─── 에러 응답 헬퍼 ───────────────────────────────────────────────────────────

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

// ─── 사용자 조회 헬퍼 ────────────────────────────────────────────────────────

async function findUserByEmail(email: string) {
  const prisma = getPrismaClient()
  return prisma.user.findUnique({ where: { email } })
}

// ─── POST /api/projects/[id]/publish ─────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: projectId } = await params

  if (!projectId) {
    return jsonError('projectId 가 누락되었습니다.', 400)
  }

  // body 파싱 (선택: Content-Type 이 없을 수도 있음)
  let isAsync = false
  let withConti = false
  try {
    const contentType = req.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const body = (await req.json()) as { async?: boolean; conti?: boolean }
      isAsync = body.async === true
      withConti = body.conti === true
    }
  } catch {
    // body 파싱 실패 → 기본값 동기
  }

  // 1. 인증 확인
  const supabase = await createWebServerClient()
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser?.email) {
    return jsonError('로그인이 필요합니다.', 401)
  }

  // 2. Prisma 사용자 조회
  const dbUser = await findUserByEmail(authUser.email)
  if (!dbUser) {
    return jsonError('사용자 정보를 찾을 수 없습니다.', 404)
  }

  // FOLLOWUP-69: 탈퇴(soft-deleted) 심층방어 — 미들웨어 fail-open 대비 서버 재검증
  const deletedGuard = guardDeletedUser(dbUser)
  if (deletedGuard) return deletedGuard

  const prisma = getPrismaClient()

  // 3. 프로젝트 + 포맷 + 페이지 로드
  let project: Awaited<ReturnType<typeof prisma.project.findUnique>>
  try {
    project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        format: true,
        pages: {
          orderBy: { index: 'asc' },
        },
      },
    })
  } catch (err) {
    console.error('[publish] DB 조회 오류:', err)
    return jsonError('프로젝트 조회 중 오류가 발생했습니다.', 500)
  }

  if (!project) {
    return jsonError('프로젝트를 찾을 수 없습니다.', 404)
  }

  // 4. 소유권 확인
  if (project.ownerId !== dbUser.id) {
    return jsonError('이 프로젝트에 접근할 권한이 없습니다.', 403)
  }

  // 4-b. px(웹툰) 판형 가드 (MODE-03 도입 · MODE-04 위치 교정)
  // pdf-engine 은 mm 좌표 전용이다 — px 값을 mm 로 읽으면 690mm 지면이 만들어진다.
  // **async 분기보다 먼저** 둬야 한다: 종전에는 동기 경로에만 있어 `{async:true}` 요청이
  // 가드를 건너뛰고 Inngest 워커로 넘어갔다. 웹툰 출력은 이미지 시퀀스(MODE-05)로 간다.
  const projectFormatUnit = (project as unknown as { format?: { unit?: string } }).format?.unit
  if (projectFormatUnit !== undefined && projectFormatUnit !== 'mm') {
    return jsonError('웹툰(px) 판형은 PDF 출판 대상이 아닙니다.', 400)
  }

  // ── 비동기 모드 분기 (async=true) ──────────────────────────────────────────
  if (isAsync) {
    // PublishJob 생성 (status: 'queued')
    let jobId: string
    try {
      const job = await prisma.publishJob.create({
        data: {
          projectId,
          kind: 'pdf',
          status: 'queued',
          spec: { formatId: project.formatId },
        },
      })
      jobId = job.id
    } catch (err) {
      console.error('[publish/async] PublishJob 생성 오류:', err)
      return jsonError('PublishJob 생성 중 오류가 발생했습니다.', 500)
    }

    // Inngest 이벤트 전송
    try {
      await inngest.send({
        name: 'pdf/build.requested',
        data: {
          jobId,
          projectId,
          ownerId: dbUser.id,
          seed: 0,
        },
      })
    } catch (err) {
      console.error('[publish/async] Inngest 이벤트 전송 오류:', err)
      // 잡은 이미 queued — 실패해도 클라이언트에서 폴링 가능
      // 단, 응답에 경고를 포함
      return NextResponse.json(
        {
          jobId,
          status: 'queued',
          realtimeChannel: `pdf-jobs:${jobId}`,
          warning: 'Inngest 이벤트 전송 실패. 잡이 처리되지 않을 수 있습니다.',
        },
        { status: 202 },
      )
    }

    return NextResponse.json(
      {
        jobId,
        status: 'queued',
        realtimeChannel: `pdf-jobs:${jobId}`,
        ...(withConti
          ? {
              warning:
                '[conti] async 모드는 콘티 시트를 지원하지 않습니다. 동기 모드를 사용하세요.',
            }
          : {}),
      },
      { status: 202 },
    )
  }

  // 5. buildPdf() 입력 구성 (동기 모드)
  const format = (project as unknown as { format: Record<string, unknown> }).format as {
    unit?: string
    widthMm: number
    heightMm: number
    dpi: number
    bleedMm: number
    safeMm: number
  }

  const pages = (project as unknown as { pages: Array<Record<string, unknown>> }).pages

  // FOLLOWUP-COVER-03: Project.settings.cover → 표지 페이지(index 0) 독립 치수
  const coverDims =
    (project.settings as { cover?: { widthMm: number; heightMm: number } | null } | null)?.cover ??
    null

  const buildInput: PdfBuildInput = {
    formatId: project.formatId,
    format: {
      widthMm: format.widthMm,
      heightMm: format.heightMm,
      dpi: format.dpi,
      bleedMm: format.bleedMm,
      safeMm: format.safeMm,
    },
    title: project.title,
    author: dbUser.name ?? undefined,
    pages: pages.map(
      (p): PageInput => ({
        pageIndex: p['index'] as number,
        fabricJson: (p['fabricJson'] as object) ?? { v: 1, format: {}, layers: [] },
        thumbnail: (p['thumbnail'] as string | null) ?? undefined,
        // 표지 페이지(index 0)는 독립 치수로 렌더/검증
        ...(coverDims && (p['index'] as number) === 0 ? { dims: coverDims } : {}),
      }),
    ),
    seed: 0,
  }

  // ── CONTI-02: 콘티 시트를 본문 앞에 prepend (음수 pageIndex → 정렬 시 선두) ──
  const contiWarnings: string[] = []
  let contiPageCount = 0
  if (withConti) {
    try {
      const sceneDoc = await prisma.sceneDoc.findUnique({
        where: { projectId },
        include: {
          scenes: {
            orderBy: { index: 'asc' },
            include: { lines: { orderBy: { index: 'asc' } } },
          },
        },
      })

      if (!sceneDoc || sceneDoc.scenes.length === 0) {
        contiWarnings.push(
          '[conti] 대본 분석 데이터(SceneDoc)가 없어 콘티 시트를 생략했습니다. 자동 배치를 먼저 실행하세요.',
        )
      } else {
        // 장면 → 본문 페이지/대표 포즈 매핑 (fabricJson._aiMeta.sceneIndices 기반)
        const pageByScene = new Map<number, { pageIndex: number; resourceId?: string }>()
        for (const p of pages) {
          const fj = p['fabricJson'] as {
            _aiMeta?: { sceneIndices?: number[] }
            layers?: Array<{ kind?: string; data?: { resourceId?: string } }>
          } | null
          const sceneIndices = fj?._aiMeta?.sceneIndices ?? []
          if (sceneIndices.length === 0) continue
          const poseLayer = fj?.layers?.find((l) => l?.kind === 'pose' && l?.data?.resourceId)
          for (const si of sceneIndices) {
            if (pageByScene.has(si)) continue
            pageByScene.set(si, {
              pageIndex: p['index'] as number,
              ...(poseLayer?.data?.resourceId ? { resourceId: poseLayer.data.resourceId } : {}),
            })
          }
        }

        // 대표 포즈 썸네일 URL 해석 — PNG 마스터만 (pdf-lib 는 WebP 임베드 불가)
        const resourceIds = [
          ...new Set(
            [...pageByScene.values()]
              .map((v) => v.resourceId)
              .filter((v): v is string => typeof v === 'string'),
          ),
        ]
        const resources =
          resourceIds.length > 0
            ? await prisma.resource.findMany({
                where: { id: { in: resourceIds } },
                select: { id: true, fileUrl: true, format: true },
              })
            : []
        const urlByResource = new Map(
          resources.filter((r) => r.format === 'png').map((r) => [r.id, r.fileUrl]),
        )

        const cuts: ContiCut[] = sceneDoc.scenes.map((sc, i) => {
          const pageRef = pageByScene.get(sc.index)
          const thumbUrl = pageRef?.resourceId ? urlByResource.get(pageRef.resourceId) : undefined
          return {
            cutNo: i + 1,
            sceneIndex: sc.index,
            summary: sc.summary,
            lines: sc.lines.map((l) => ({ speaker: l.speaker, text: l.text })),
            // shotLabel: CONTI-01(장면 메타 영속화) 이후 cameraAngleToShotLabel 로 채움
            ...(pageRef ? { pageNo: pageRef.pageIndex + 1 } : {}),
            ...(thumbUrl ? { poseThumbUrl: thumbUrl } : {}),
          }
        })

        const sheets = composeContiSheets(cuts, {
          format: {
            id: project.formatId,
            widthMm: format.widthMm,
            heightMm: format.heightMm,
            dpi: format.dpi,
            bleedMm: format.bleedMm,
            safeMm: format.safeMm,
          },
          seed: 0,
          title: project.title,
        })

        contiPageCount = sheets.length
        buildInput.pages = [
          ...sheets.map(
            (fabricJson, i): PageInput => ({
              pageIndex: i - sheets.length,
              fabricJson,
            }),
          ),
          ...buildInput.pages,
        ]
      }
    } catch (err) {
      console.error('[publish/conti] 콘티 시트 합성 오류:', err)
      contiWarnings.push('[conti] 콘티 시트 합성 중 오류가 발생해 생략했습니다.')
    }
  }

  // 6. PDF 빌드
  let buildResult: Awaited<ReturnType<typeof buildPdf>>
  try {
    buildResult = await buildPdf(buildInput)
  } catch (err) {
    console.error('[publish] PDF 빌드 오류:', err)
    return jsonError('PDF 빌드 중 오류가 발생했습니다.', 500)
  }
  buildResult.warnings.push(...contiWarnings)

  // 7. Supabase Storage 업로드
  // 경로: pdfs/{ownerId}/{projectId}-{timestamp}.pdf (RLS scope: ownerId)
  const timestamp = Date.now()
  const storagePath = `pdfs/${dbUser.id}/${projectId}-${timestamp}.pdf`
  const adminClient = getAdminClient()

  const { error: uploadError } = await adminClient.storage
    .from('storywork')
    .upload(storagePath, buildResult.pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  let pdfUrl: string | null = null

  if (uploadError) {
    console.error('[publish] Storage 업로드 오류:', uploadError)
    // 업로드 실패해도 PublishJob 은 생성 (pdfUrl null)
    buildResult.warnings.push(`[publish] Storage 업로드 실패: ${uploadError.message}`)
  } else {
    const { data: urlData } = adminClient.storage.from('storywork').getPublicUrl(storagePath)
    pdfUrl = urlData.publicUrl
  }

  // 8. PublishJob 생성
  let jobId: string
  try {
    const job = await prisma.publishJob.create({
      data: {
        projectId,
        kind: 'pdf',
        status: pdfUrl ? 'succeeded' : 'failed',
        pdfUrl,
        spec: {
          formatId: project.formatId,
          pageCount: buildResult.pageCount,
          byteSize: buildResult.byteSize,
          seed: 0,
          producer: buildResult.metadata.producer,
          creationDate: buildResult.metadata.creationDate,
          ...(withConti ? { conti: true, contiPageCount } : {}),
        },
        preflight: {
          warnings: buildResult.warnings,
        },
      },
    })
    jobId = job.id
  } catch (err) {
    console.error('[publish] PublishJob 생성 오류:', err)
    return jsonError('PublishJob 생성 중 오류가 발생했습니다.', 500)
  }

  return NextResponse.json({
    jobId,
    pdfUrl,
    byteSize: buildResult.byteSize,
    pageCount: buildResult.pageCount,
    ...(withConti ? { contiPageCount } : {}),
    warnings: buildResult.warnings,
  })
}
