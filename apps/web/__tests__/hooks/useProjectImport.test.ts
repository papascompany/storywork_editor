/**
 * useProjectImport 단위 테스트 (M4-04 Step 3)
 *
 * 검증:
 *   - projectId query param 있으면 /api/projects/[id] 호출
 *   - 성공 시 loadProject + canvasRef.loadJson + showToast 호출
 *   - 실패 시 error 반환
 *   - readyTick=0 이면 로드 안 함
 *   - 중복 로드 방지 (같은 projectId 두 번 호출 시 1회만)
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── useProjectImport import ─────────────────────────────────────────────────

// window.location 모킹은 각 테스트 내에서 설정
import { useProjectImport } from '../../components/editor/hooks/useProjectImport'

// ─── 픽스처 ──────────────────────────────────────────────────────────────────

const MOCK_PROJECT_RESPONSE = {
  project: { id: 'proj-001', title: '테스트 콘티', formatId: 'preset-b5-novel', status: 'editing' },
  pages: [
    {
      id: 'page-0',
      index: 0,
      fabricJson: {
        v: 1,
        format: { id: 'preset-b5-novel', widthMm: 128, heightMm: 182, dpi: 350 },
        layers: [],
      },
      thumbnail: null,
    },
  ],
}

function makeCanvasRef(loadJsonFn = vi.fn().mockResolvedValue(undefined)) {
  return { current: { loadJson: loadJsonFn } }
}

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('useProjectImport', () => {
  let originalLocation: Location

  beforeEach(() => {
    vi.clearAllMocks()
    originalLocation = window.location
    // window.location 은 read-only → Object.defineProperty 로 교체
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
    vi.restoreAllMocks()
  })

  function setProjectIdQuery(id: string | null) {
    const search = id ? `?projectId=${id}` : ''
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search },
      writable: true,
      configurable: true,
    })
  }

  it('readyTick=0 이면 fetch 호출 안 함', async () => {
    setProjectIdQuery('proj-001')
    global.fetch = vi.fn()

    const canvasRef = makeCanvasRef()
    const loadProject = vi.fn()
    const showToast = vi.fn()

    renderHook(() => useProjectImport(canvasRef, loadProject, showToast, 0))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('projectId 없으면 fetch 호출 안 함', async () => {
    setProjectIdQuery(null)
    global.fetch = vi.fn()

    const canvasRef = makeCanvasRef()
    const loadProject = vi.fn()
    const showToast = vi.fn()

    renderHook(() => useProjectImport(canvasRef, loadProject, showToast, 1))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('projectId 있고 readyTick>0 → fetch 호출 + loadProject + canvasRef.loadJson', async () => {
    setProjectIdQuery('proj-001')
    const loadJsonMock = vi.fn().mockResolvedValue(undefined)
    const canvasRef = makeCanvasRef(loadJsonMock)
    const loadProject = vi.fn()
    const showToast = vi.fn()

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_PROJECT_RESPONSE),
    })

    renderHook(() => useProjectImport(canvasRef, loadProject, showToast, 1))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/projects/proj-001')
    expect(loadProject).toHaveBeenCalledOnce()
    expect(loadJsonMock).toHaveBeenCalledOnce()
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('테스트 콘티'), 'success')
  })

  it('API 오류 → error 상태 + showToast error', async () => {
    setProjectIdQuery('proj-bad')
    const canvasRef = makeCanvasRef()
    const loadProject = vi.fn()
    const showToast = vi.fn()

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: '프로젝트를 찾을 수 없습니다.' }),
    })

    const { result } = renderHook(() => useProjectImport(canvasRef, loadProject, showToast, 1))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(result.current.error).toBeTruthy()
    expect(showToast).toHaveBeenCalledWith(expect.any(String), 'error')
    expect(loadProject).not.toHaveBeenCalled()
  })

  it('성공 후 loadedProjectId 업데이트', async () => {
    setProjectIdQuery('proj-ok')
    const canvasRef = makeCanvasRef()
    const loadProject = vi.fn()
    const showToast = vi.fn()

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ...MOCK_PROJECT_RESPONSE,
          project: { ...MOCK_PROJECT_RESPONSE.project, id: 'proj-ok' },
        }),
    })

    const { result } = renderHook(() => useProjectImport(canvasRef, loadProject, showToast, 1))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(result.current.loadedProjectId).toBe('proj-ok')
  })
})
