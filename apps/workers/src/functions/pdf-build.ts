/**
 * apps/workers/src/functions/pdf-build.ts
 *
 * Inngest 비동기 잡: pdf/build.requested
 *
 * 처리 흐름:
 *   step 1. load-project   — Prisma Project + Format + Pages 로드
 *   step 2. update-queued  — PublishJob.status = 'running' + progress 0%
 *   step 3. build-pdf      — buildPdf() 호출
 *   step 4. upload         — Supabase Storage 업로드
 *   step 5. complete       — PublishJob.status = 'succeeded', pdfUrl 저장
 *   step 6. emit-progress  — Supabase Realtime 100% publish
 *
 * 진행 % 채널: pdf-jobs:{jobId}
 *   payload: { jobId, progress: 0-100, status, message? }
 *
 * ADR-0007 결정론: seed = PublishJob createdAt.getTime() 사용
 * NFR: 16p ≤ 6초 (buildPdf 동기 모드에서 8~17ms 이미 달성)
 */

import { PrismaClient } from '@prisma/client'
import { buildPdf } from '@storywork/pdf-engine'
import type { PageInput, PdfBuildInput } from '@storywork/pdf-engine'
import { createClient } from '@supabase/supabase-js'

import { inngest } from '../inngest-client.js'

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface PdfBuildRequestedEvent {
  name: 'pdf/build.requested'
  data: {
    jobId: string
    projectId: string
    ownerId: string
    /** 결정론 시드 (기본 0). 동일 입력 → 동일 PDF 보장 */
    seed?: number
  }
}

export type PdfProgressPayload = {
  jobId: string
  progress: number
  status: 'queued' | 'running' | 'succeeded' | 'failed'
  message?: string
  pdfUrl?: string
}

// ─── 싱글턴 클라이언트 (step 내부에서 직렬화 문제 방지) ─────────────────────

function getPrisma() {
  return new PrismaClient()
}

function getSupabaseAdmin() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? process.env['SUPABASE_URL'] ?? ''
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
  // 자격증명 누락 시 createClient('','') 로 진행하면 업로드/Realtime 단계에서
  // 불명확한 에러가 3회 재시도되므로, 진입점에서 명확히 실패시킨다.
  if (!url || !key) {
    throw new Error(
      '[pdf-build] Supabase 자격증명 누락: NEXT_PUBLIC_SUPABASE_URL(또는 SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.',
    )
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ─── 진행 % 채널 publish ─────────────────────────────────────────────────────

async function emitProgress(payload: PdfProgressPayload): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    await supabase.channel(`pdf-jobs:${payload.jobId}`).send({
      type: 'broadcast',
      event: 'progress',
      payload,
    })
  } catch (err) {
    // 진행률 emit 실패는 잡 실패로 이어지지 않음 (best-effort)
    console.warn('[pdf-build] Realtime emit 실패:', err)
  }
}

// ─── Inngest 함수 ─────────────────────────────────────────────────────────────

export const pdfBuildJob = inngest.createFunction(
  {
    id: 'pdf-build',
    name: 'PDF Build Job',
    retries: 3,
    // 동일 jobId 로 중복 실행 방지 (at-least-once 보정)
    concurrency: { limit: 10 },
  },
  { event: 'pdf/build.requested' },
  async ({ event, step }) => {
    const { jobId, projectId, ownerId, seed = 0 } = event.data as PdfBuildRequestedEvent['data']

    // ── Step 1: 프로젝트 + Format + Pages 로드 ──────────────────────────────
    const project = await step.run('load-project', async () => {
      await emitProgress({ jobId, progress: 0, status: 'running', message: '프로젝트 로드 중...' })

      const prisma = getPrisma()
      try {
        const result = await prisma.project.findUnique({
          where: { id: projectId },
          include: {
            format: true,
            pages: { orderBy: { index: 'asc' } },
          },
        })
        if (!result) throw new Error(`[pdf-build] 프로젝트를 찾을 수 없습니다: ${projectId}`)
        if (result.ownerId !== ownerId) {
          throw new Error(
            `[pdf-build] 소유권 불일치: project.ownerId=${result.ownerId}, ownerId=${ownerId}`,
          )
        }
        return result
      } finally {
        await prisma.$disconnect()
      }
    })

    await emitProgress({ jobId, progress: 20, status: 'running', message: '페이지 로드 완료' })

    // ── Step 2: PublishJob.status = 'running' ───────────────────────────────
    await step.run('update-status-running', async () => {
      const prisma = getPrisma()
      try {
        await prisma.publishJob.update({
          where: { id: jobId },
          data: { status: 'running' },
        })
      } finally {
        await prisma.$disconnect()
      }
    })

    // ── Step 3: PDF 빌드 ────────────────────────────────────────────────────
    const buildResult = await step.run('build-pdf', async () => {
      await emitProgress({ jobId, progress: 40, status: 'running', message: 'PDF 생성 중...' })

      const format = project.format as {
        widthMm: number
        heightMm: number
        dpi: number
        bleedMm: number
        safeMm: number
      }
      const pages = project.pages as Array<{
        index: number
        fabricJson: object
        thumbnail: string | null
      }>

      // FOLLOWUP-COVER-03: Project.settings.cover → 표지 페이지(index 0) 독립 치수
      const coverDims =
        (project.settings as { cover?: { widthMm: number; heightMm: number } | null } | null)
          ?.cover ?? null

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
        pages: pages.map(
          (p): PageInput => ({
            pageIndex: p.index,
            fabricJson: (p.fabricJson as object) ?? { v: 1, format: {}, layers: [] },
            thumbnail: p.thumbnail ?? undefined,
            // 표지 페이지(index 0)는 독립 치수로 렌더
            ...(coverDims && p.index === 0 ? { dims: coverDims } : {}),
          }),
        ),
        seed,
      }

      const result = await buildPdf(buildInput)
      // pdfBuffer 는 Uint8Array — Inngest step 직렬화를 위해 Array 로 변환
      return {
        ...result,
        pdfBuffer: Array.from(result.pdfBuffer),
      }
    })

    await emitProgress({ jobId, progress: 70, status: 'running', message: '업로드 중...' })

    // ── Step 4: Supabase Storage 업로드 ────────────────────────────────────
    const pdfUrl = await step.run('upload-to-storage', async () => {
      const supabase = getSupabaseAdmin()
      const timestamp = Date.now()
      const storagePath = `pdfs/${ownerId}/${projectId}-${timestamp}.pdf`

      const pdfBytes = new Uint8Array(buildResult.pdfBuffer)

      const { error: uploadError } = await supabase.storage
        .from('storywork')
        .upload(storagePath, pdfBytes, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadError) {
        console.error('[pdf-build] Storage 업로드 오류:', uploadError)
        throw new Error(`[pdf-build] Storage 업로드 실패: ${uploadError.message}`)
      }

      const { data: urlData } = supabase.storage.from('storywork').getPublicUrl(storagePath)
      return urlData.publicUrl
    })

    await emitProgress({ jobId, progress: 85, status: 'running', message: '완료 처리 중...' })

    // ── Step 5: PublishJob 완료 처리 ────────────────────────────────────────
    await step.run('update-status-completed', async () => {
      const prisma = getPrisma()
      try {
        await prisma.publishJob.update({
          where: { id: jobId },
          data: {
            status: 'succeeded',
            pdfUrl,
            spec: {
              formatId: project.formatId,
              pageCount: buildResult.pageCount,
              byteSize: buildResult.byteSize,
              seed,
              producer: buildResult.metadata.producer,
              creationDate: buildResult.metadata.creationDate,
            },
            preflight: {
              warnings: buildResult.warnings,
            },
          },
        })
      } finally {
        await prisma.$disconnect()
      }
    })

    // ── Step 6: 100% 완료 emit ──────────────────────────────────────────────
    await step.run('emit-complete', async () => {
      await emitProgress({
        jobId,
        progress: 100,
        status: 'succeeded',
        message: 'PDF 생성 완료',
        pdfUrl,
      })
    })

    return {
      jobId,
      projectId,
      pdfUrl,
      pageCount: buildResult.pageCount,
      byteSize: buildResult.byteSize,
      warnings: buildResult.warnings,
    }
  },
)
