/**
 * apps/web/lib/realtime/pdf-progress.ts
 *
 * Supabase Realtime 기반 PDF 잡 진행률 수신 헬퍼.
 *
 * 채널명: pdf-jobs:{jobId}
 * 이벤트: 'progress'
 * payload: PdfProgressPayload
 *
 * 사용:
 *   const unsub = subscribePdfProgress(jobId, (payload) => {
 *     setProgress(payload.progress)
 *   })
 *   // 정리
 *   unsub()
 */

import { createClient } from '@supabase/supabase-js'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ─── 타입 ────────────────────────────────────────────────────────────────────

export type PdfJobStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export interface PdfProgressPayload {
  jobId: string
  progress: number
  status: PdfJobStatus
  message?: string
  pdfUrl?: string
}

export type PdfProgressCallback = (payload: PdfProgressPayload) => void

// ─── Supabase 클라이언트 (퍼블릭 anon key — 클라이언트 전용) ─────────────────

function getSupabaseClient() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

  if (!url || !anonKey) {
    throw new Error(
      '[pdf-progress] NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY 누락',
    )
  }

  return createClient(url, anonKey, {
    auth: { persistSession: true },
    realtime: { params: { eventsPerSecond: 10 } },
  })
}

// ─── 구독 ─────────────────────────────────────────────────────────────────────

/**
 * PDF 잡 진행률 채널을 구독합니다.
 *
 * @param jobId    구독할 잡 ID
 * @param onProgress 진행률 콜백
 * @returns unsubscribe 함수
 */
export function subscribePdfProgress(jobId: string, onProgress: PdfProgressCallback): () => void {
  const supabase = getSupabaseClient()
  const channelName = `pdf-jobs:${jobId}`

  const channel: RealtimeChannel = supabase
    .channel(channelName)
    .on('broadcast', { event: 'progress' }, ({ payload }) => {
      onProgress(payload as PdfProgressPayload)
    })
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
