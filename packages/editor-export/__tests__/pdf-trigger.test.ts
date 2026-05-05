// ─────────────────────────────────────────────
// pdf-trigger.test.ts — requestPdf Mock fetch 검증
// ─────────────────────────────────────────────

import { describe, expect, it, vi, afterEach } from 'vitest'

import { requestPdf } from '../src/index.js'

describe('requestPdf', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('성공: { jobId, statusUrl } 응답을 반환한다', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ jobId: 'job-abc-123', statusUrl: '/api/pdf/status/job-abc-123' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await requestPdf('project-001')

    expect(result.jobId).toBe('job-abc-123')
    expect(result.statusUrl).toBe('/api/pdf/status/job-abc-123')
  })

  it('성공: statusUrl 없는 응답도 허용', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ jobId: 'job-xyz' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await requestPdf('project-002')

    expect(result.jobId).toBe('job-xyz')
    expect(result.statusUrl).toBeUndefined()
  })

  it('기본 endpoint 는 /api/pdf 로 POST 한다', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ jobId: 'j1' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await requestPdf('proj-1')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/pdf')
    expect(init.method).toBe('POST')
  })

  it('커스텀 endpoint 를 사용할 수 있다', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ jobId: 'j2' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await requestPdf('proj-2', { endpoint: '/custom/pdf' })

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/custom/pdf')
  })

  it('body 에 projectId 와 spec 이 포함된다', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ jobId: 'j3' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const spec = { pageCount: 16, colorMode: 'cmyk' }
    await requestPdf('proj-3', { spec })

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string) as { projectId: string; spec: unknown }
    expect(body.projectId).toBe('proj-3')
    expect(body.spec).toEqual(spec)
  })

  it('서버 500 오류 시 Error 를 던진다', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })
    vi.stubGlobal('fetch', mockFetch)

    await expect(requestPdf('proj-err')).rejects.toThrow('500')
  })

  it('서버 400 오류 시 Error 를 던진다', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
    })
    vi.stubGlobal('fetch', mockFetch)

    await expect(requestPdf('proj-err')).rejects.toThrow('400')
  })

  it('서버 응답이 jobId 없는 객체면 Error 를 던진다', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: 'ok' }), // jobId 없음
    })
    vi.stubGlobal('fetch', mockFetch)

    await expect(requestPdf('proj-bad')).rejects.toThrow('형식')
  })

  it('Content-Type: application/json 헤더가 설정된다', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ jobId: 'j4' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await requestPdf('proj-4')

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>)?.['Content-Type']).toBe('application/json')
  })
})
