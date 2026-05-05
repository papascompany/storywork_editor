// ─────────────────────────────────────────────
// requestPdf.ts — PDF 잡 트리거 (M6 이전 Mock)
// ─────────────────────────────────────────────
//
// M6 에서 apps/workers/inngest 와 연결 예정.
// 현재는 fetch POST 를 /api/pdf 에 보내고 { jobId, statusUrl } 응답을 기대한다.
// ─────────────────────────────────────────────

import type { RequestPdfOptions, RequestPdfResult } from '../types.js'

const DEFAULT_ENDPOINT = '/api/pdf'

/**
 * PDF 변환 잡을 비동기로 요청한다.
 *
 * - 실제 PDF 변환은 apps/workers (Inngest) 에서 실행된다.
 * - 이 함수는 잡 ID 만 반환하고 결과를 기다리지 않는다.
 * - M6 이전이므로 인터페이스만 확정, 실제 워커는 mock.
 *
 * @throws Error fetch 실패 또는 서버가 400/500 반환 시
 */
export async function requestPdf(
  projectId: string,
  opts?: RequestPdfOptions,
): Promise<RequestPdfResult> {
  const endpoint = opts?.endpoint ?? DEFAULT_ENDPOINT
  const spec = opts?.spec ?? {}

  const body = JSON.stringify({ projectId, spec })

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  })

  if (!response.ok) {
    throw new Error(
      `[editor-export] requestPdf: 서버 오류 ${response.status} ${response.statusText}`,
    )
  }

  const json = (await response.json()) as unknown

  if (!isPdfJobResponse(json)) {
    throw new Error(
      '[editor-export] requestPdf: 서버 응답 형식이 올바르지 않습니다. { jobId: string } 가 필요합니다.',
    )
  }

  return json
}

function isPdfJobResponse(val: unknown): val is RequestPdfResult {
  if (typeof val !== 'object' || val === null) return false
  const obj = val as Record<string, unknown>
  if (typeof obj['jobId'] !== 'string') return false
  if ('statusUrl' in obj && typeof obj['statusUrl'] !== 'string') return false
  return true
}
