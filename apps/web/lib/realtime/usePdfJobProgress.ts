'use client'

/**
 * apps/web/lib/realtime/usePdfJobProgress.ts
 *
 * React 훅: PDF 잡 진행률 구독.
 *
 * Supabase Realtime 채널(pdf-jobs:{jobId})을 구독하여
 * 진행률·상태·pdfUrl 을 리액티브하게 반환합니다.
 *
 * 사용:
 *   const { progress, status, pdfUrl, error } = usePdfJobProgress(jobId)
 */

import { useEffect, useRef, useState } from 'react'

import type { PdfJobStatus, PdfProgressPayload } from './pdf-progress.js'
import { subscribePdfProgress } from './pdf-progress.js'

export interface PdfJobProgressState {
  /** 0~100 */
  progress: number
  status: PdfJobStatus
  pdfUrl: string | null
  message: string | null
  error: string | null
}

const INITIAL_STATE: PdfJobProgressState = {
  progress: 0,
  status: 'queued',
  pdfUrl: null,
  message: null,
  error: null,
}

/**
 * PDF 잡 진행률 훅.
 *
 * @param jobId  구독할 잡 ID. null 이면 구독하지 않습니다.
 */
export function usePdfJobProgress(jobId: string | null): PdfJobProgressState {
  const [state, setState] = useState<PdfJobProgressState>(INITIAL_STATE)
  const prevJobId = useRef<string | null>(null)

  useEffect(() => {
    if (!jobId) {
      setState(INITIAL_STATE)
      return
    }

    // jobId 가 바뀌면 초기화
    if (prevJobId.current !== jobId) {
      setState(INITIAL_STATE)
      prevJobId.current = jobId
    }

    const unsub = subscribePdfProgress(jobId, (payload: PdfProgressPayload) => {
      setState({
        progress: payload.progress,
        status: payload.status,
        pdfUrl: payload.pdfUrl ?? null,
        message: payload.message ?? null,
        error: payload.status === 'failed' ? (payload.message ?? 'PDF 생성 실패') : null,
      })
    })

    return unsub
  }, [jobId])

  return state
}
