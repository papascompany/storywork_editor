/**
 * apps/web/__tests__/lib/realtime-pdf-progress.test.ts
 *
 * usePdfJobProgress 훅 단위 테스트.
 * Supabase Realtime 을 모킹합니다.
 *
 * M6-02 Step 3 DoD: 클라이언트 훅 단위 테스트
 */

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Supabase Realtime 모킹 ───────────────────────────────────────────────────

type BroadcastCallback = (payload: { payload: unknown }) => void
type ChannelEventHandler = {
  event: string
  callback: BroadcastCallback
}

let _channelHandlers: ChannelEventHandler[] = []
let _subscribeCalled = false

const mockChannel = {
  on: vi.fn((_type: string, opts: { event: string }, callback: BroadcastCallback) => {
    _channelHandlers.push({ event: opts.event, callback })
    return mockChannel
  }),
  subscribe: vi.fn(() => {
    _subscribeCalled = true
    return mockChannel
  }),
  send: vi.fn(),
}

const mockSupabase = {
  channel: vi.fn((_name: string) => mockChannel),
  removeChannel: vi.fn(),
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

// ─── 진행률 emit 헬퍼 ─────────────────────────────────────────────────────────

function emitProgress(payload: unknown) {
  _channelHandlers.forEach((h) => {
    if (h.event === 'progress') {
      h.callback({ payload })
    }
  })
}

// ─── 테스트 ───────────────────────────────────────────────────────────────────

describe('usePdfJobProgress', () => {
  beforeEach(() => {
    _channelHandlers = []
    _subscribeCalled = false
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('jobId 가 null 이면 초기 상태를 반환한다', async () => {
    const { usePdfJobProgress } = await import('../../lib/realtime/usePdfJobProgress.js')
    const { result } = renderHook(() => usePdfJobProgress(null))

    expect(result.current.progress).toBe(0)
    expect(result.current.status).toBe('queued')
    expect(result.current.pdfUrl).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('jobId 가 주어지면 Supabase Realtime 채널을 구독한다', async () => {
    const { usePdfJobProgress } = await import('../../lib/realtime/usePdfJobProgress.js')
    renderHook(() => usePdfJobProgress('job-123'))

    expect(mockSupabase.channel).toHaveBeenCalledWith('pdf-jobs:job-123')
    expect(_subscribeCalled).toBe(true)
  })

  it('progress 이벤트를 수신하면 상태를 업데이트한다', async () => {
    const { usePdfJobProgress } = await import('../../lib/realtime/usePdfJobProgress.js')
    const { result } = renderHook(() => usePdfJobProgress('job-456'))

    act(() => {
      emitProgress({
        jobId: 'job-456',
        progress: 40,
        status: 'running',
        message: 'PDF 생성 중...',
      })
    })

    expect(result.current.progress).toBe(40)
    expect(result.current.status).toBe('running')
    expect(result.current.message).toBe('PDF 생성 중...')
    expect(result.current.error).toBeNull()
  })

  it('status=succeeded 이면 pdfUrl 을 반환한다', async () => {
    const { usePdfJobProgress } = await import('../../lib/realtime/usePdfJobProgress.js')
    const { result } = renderHook(() => usePdfJobProgress('job-789'))

    act(() => {
      emitProgress({
        jobId: 'job-789',
        progress: 100,
        status: 'succeeded',
        pdfUrl: 'https://example.com/output.pdf',
      })
    })

    expect(result.current.progress).toBe(100)
    expect(result.current.status).toBe('succeeded')
    expect(result.current.pdfUrl).toBe('https://example.com/output.pdf')
    expect(result.current.error).toBeNull()
  })

  it('status=failed 이면 error 를 설정한다', async () => {
    const { usePdfJobProgress } = await import('../../lib/realtime/usePdfJobProgress.js')
    const { result } = renderHook(() => usePdfJobProgress('job-failed'))

    act(() => {
      emitProgress({
        jobId: 'job-failed',
        progress: 40,
        status: 'failed',
        message: 'Storage 업로드 실패',
      })
    })

    expect(result.current.status).toBe('failed')
    expect(result.current.error).toBe('Storage 업로드 실패')
  })

  it('언마운트 시 채널 구독을 해제한다', async () => {
    const { usePdfJobProgress } = await import('../../lib/realtime/usePdfJobProgress.js')
    const { unmount } = renderHook(() => usePdfJobProgress('job-cleanup'))

    unmount()

    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel)
  })
})
