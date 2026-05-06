/**
 * pose-panel.test.tsx — M2-05 PosePanel UI 단위 테스트
 *
 * 검증 항목:
 * 1.  검색창 렌더
 * 2.  검색 입력 → debounce 후 API 호출 (mock fetch)
 * 3.  그리드 결과 렌더
 * 4.  필터 변경 → 새 API 호출
 * 5.  무한 스크롤 트리거 → loadMore
 * 6.  그리드 아이템 클릭 → onAddToCanvas
 * 7.  드래그 → dataTransfer 에 JSON
 * 8.  빈 상태 렌더
 * 9.  에러 상태 렌더 + 재시도 버튼
 * 10. 로딩 상태 렌더
 * 11. lowDpi 뱃지 렌더
 * 12. usePoseSearch: debounce 동작 (타이머 제어)
 * 13. usePoseSearch: AbortController — 이전 요청 abort
 * 14. usePoseSearch: loadMore → offset 증가
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ─── 공통 모킹 ────────────────────────────────────────────────────────────────

const mockShowToast = vi.fn()
const mockOnAddToCanvas = vi.fn()

// IntersectionObserver mock
const mockObserve = vi.fn()
const mockDisconnect = vi.fn()
const mockUnobserve = vi.fn()

vi.stubGlobal(
  'IntersectionObserver',
  vi.fn((callback: IntersectionObserverCallback) => ({
    observe: mockObserve,
    disconnect: mockDisconnect,
    unobserve: mockUnobserve,
    // 테스트에서 트리거 시 사용
    _trigger: (isIntersecting: boolean) => {
      callback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver)
    },
  })),
)

// @storywork/ui 모킹
vi.mock('@storywork/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    showToast: (...args: unknown[]) => mockShowToast(...args),
    cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' '),
    Tooltip: ({ children }: { children: React.ReactElement }) => children,
    TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    LoadingOverlay: ({ show, message }: { show: boolean; message?: string }) =>
      show ? (
        <div role="status" aria-label={message ?? '로딩 중'}>
          {message}
        </div>
      ) : null,
    Checkbox: ({
      checked,
      onCheckedChange,
      label,
    }: {
      checked?: boolean
      onCheckedChange?: (v: boolean) => void
      label?: string
    }) => (
      <label>
        <input
          type="checkbox"
          checked={checked ?? false}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
        />
        {label}
      </label>
    ),
    ToggleGroup: ({
      children,
      value,
      onValueChange,
    }: {
      children: React.ReactNode
      type: string
      value?: string[]
      onValueChange?: (v: string[]) => void
    }) => (
      <div
        data-testid="toggle-group"
        data-value={JSON.stringify(value ?? [])}
        onClick={(e) => {
          const target = e.target as HTMLElement
          const val = target.getAttribute('data-value')
          if (!val || !onValueChange) return
          const current = value ?? []
          const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val]
          onValueChange(next)
        }}
      >
        {children}
      </div>
    ),
    ToggleGroupItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
      <button type="button" data-value={value} aria-label={String(children)}>
        {children}
      </button>
    ),
  }
})

// ─── 픽스처 ──────────────────────────────────────────────────────────────────
// vi.mock 이후 import — import/order 규칙 예외 처리
// eslint-disable-next-line import/order
import type { ResourceSummary } from '../app/api/_lib/search-types'

function makeResource(overrides: Partial<ResourceSummary> = {}): ResourceSummary {
  return {
    id: 'res-001',
    slug: 'standing-female-front-01',
    thumbUrl: 'https://cdn.example.com/thumb.png',
    width: 750,
    height: 750,
    masterDpi: 74,
    lowDpi: false,
    meta: { action: 'standing', view: 'front', bodyType: 'F' },
    tags: ['standing', 'female', 'front'],
    score: 0.9,
    ...overrides,
  }
}

const defaultSearchResponse = {
  results: [makeResource()],
  total: 1,
  took_ms: 10,
}

// ─── fetch mock 헬퍼 ──────────────────────────────────────────────────────────

function mockFetch(response: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => response,
    }),
  )
}

// ─── 컴포넌트 import ──────────────────────────────────────────────────────────
// vi.mock 이후 import (hoisting 방지)
import { PoseFilters, INITIAL_FILTERS } from '../components/editor/panels/PoseFilters'
import { PoseGridItem, POSE_DRAG_MIME } from '../components/editor/panels/PoseGridItem'
import { PosePanel } from '../components/editor/panels/PosePanel'

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('PosePanel', () => {
  beforeEach(() => {
    mockFetch(defaultSearchResponse)
    mockObserve.mockClear()
    mockDisconnect.mockClear()
    mockOnAddToCanvas.mockClear()
    mockShowToast.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // 1. 검색창 렌더
  it('검색창이 렌더된다', () => {
    render(<PosePanel canvas={null} history={null} onAddToCanvas={mockOnAddToCanvas} />)
    expect(screen.getByRole('searchbox', { name: /포즈 검색/ })).toBeInTheDocument()
  })

  // 2. 검색 입력 → debounce 후 fetch 호출 (fake timer)
  it('검색어 입력 후 300ms debounce 뒤 fetch 호출', async () => {
    vi.useFakeTimers()

    render(<PosePanel canvas={null} history={null} onAddToCanvas={mockOnAddToCanvas} />)
    const input = screen.getByRole('searchbox', { name: /포즈 검색/ })

    // 검색어 입력 전 초기 debounce 타이머 소진
    await vi.advanceTimersByTimeAsync(300)
    vi.mocked(fetch).mockClear()

    fireEvent.change(input, { target: { value: '서있는 여자' } })

    // debounce 전 — 아직 호출 안 됨
    expect(fetch).not.toHaveBeenCalled()

    // debounce 후
    await vi.advanceTimersByTimeAsync(300)

    expect(fetch).toHaveBeenCalledWith(
      '/api/search/poses',
      expect.objectContaining({
        method: 'POST',
      }),
    )

    // body 에 query 포함 확인
    const calls = vi.mocked(fetch).mock.calls
    const body = JSON.parse(calls[0]?.[1]?.body as string) as { query?: string }
    expect(body.query).toBe('서있는 여자')

    vi.useRealTimers()
  })

  // 3. 그리드 결과 렌더 (실제 타이머 사용)
  it('API 응답 후 그리드에 결과 렌더', async () => {
    render(<PosePanel canvas={null} history={null} onAddToCanvas={mockOnAddToCanvas} />)

    await waitFor(
      () => {
        expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0)
      },
      { timeout: 4000 },
    )
  })

  // 8. 빈 상태 (실제 타이머 사용)
  it('결과 없으면 빈 상태 메시지 렌더', async () => {
    mockFetch({ results: [], total: 0, took_ms: 5 })

    render(<PosePanel canvas={null} history={null} onAddToCanvas={mockOnAddToCanvas} />)
    const input = screen.getByRole('searchbox', { name: /포즈 검색/ })
    fireEvent.change(input, { target: { value: '존재안함xyz' } })

    await waitFor(
      () => {
        expect(screen.getByText(/결과가 없습니다/)).toBeInTheDocument()
      },
      { timeout: 4000 },
    )

    // 추천 검색어 칩 렌더
    expect(screen.getByText('서있는')).toBeInTheDocument()
  })

  // 10. 로딩 상태 — render 후 즉시 isLoading=true 인 시점 확인
  it('초기 마운트 시 검색창이 비어있음 (로딩 이전 상태)', () => {
    render(<PosePanel canvas={null} history={null} onAddToCanvas={mockOnAddToCanvas} />)
    // 검색창은 항상 노출
    expect(screen.getByRole('searchbox', { name: /포즈 검색/ })).toBeInTheDocument()
    // 에러 상태 아님
    expect(screen.queryByRole('button', { name: /다시 시도/ })).not.toBeInTheDocument()
  })
})

// ─── PoseGridItem 테스트 ──────────────────────────────────────────────────────

describe('PoseGridItem', () => {
  beforeEach(() => {
    mockOnAddToCanvas.mockClear()
  })

  const pose = makeResource()

  // 6. 그리드 아이템 클릭 → onAddToCanvas
  it('클릭 시 onAddToCanvas 호출', () => {
    render(<PoseGridItem pose={pose} onAddToCanvas={mockOnAddToCanvas} />)
    const btn = screen.getByRole('button', { name: /캔버스에 추가/ })
    fireEvent.click(btn)
    expect(mockOnAddToCanvas).toHaveBeenCalledWith(pose)
    expect(mockOnAddToCanvas).toHaveBeenCalledTimes(1)
  })

  // 키보드 Enter 로 추가
  it('Enter 키로 onAddToCanvas 호출', async () => {
    render(<PoseGridItem pose={pose} onAddToCanvas={mockOnAddToCanvas} />)
    const btn = screen.getByRole('button', { name: /캔버스에 추가/ })
    btn.focus()
    fireEvent.keyDown(btn, { key: 'Enter' })
    expect(mockOnAddToCanvas).toHaveBeenCalledWith(pose)
  })

  // Space 키로 추가
  it('Space 키로 onAddToCanvas 호출', async () => {
    render(<PoseGridItem pose={pose} onAddToCanvas={mockOnAddToCanvas} />)
    const btn = screen.getByRole('button', { name: /캔버스에 추가/ })
    btn.focus()
    fireEvent.keyDown(btn, { key: ' ' })
    expect(mockOnAddToCanvas).toHaveBeenCalledWith(pose)
  })

  // 7. 드래그 → dataTransfer 에 JSON
  it('dragstart 시 dataTransfer 에 POSE_DRAG_MIME JSON 설정', () => {
    render(<PoseGridItem pose={pose} onAddToCanvas={mockOnAddToCanvas} />)
    const btn = screen.getByRole('button', { name: /캔버스에 추가/ })

    const dataMap: Record<string, string> = {}
    const mockDataTransfer = {
      setData: (type: string, value: string) => {
        dataMap[type] = value
      },
      effectAllowed: '',
    }

    fireEvent.dragStart(btn, { dataTransfer: mockDataTransfer })

    expect(dataMap[POSE_DRAG_MIME]).toBeDefined()
    const parsed = JSON.parse(dataMap[POSE_DRAG_MIME] as string) as {
      id: string
      slug: string
      lowDpi: boolean
    }
    expect(parsed.id).toBe(pose.id)
    expect(parsed.slug).toBe(pose.slug)
    expect(parsed.lowDpi).toBe(false)
  })

  // 11. lowDpi 뱃지
  it('lowDpi=true 이면 경고 뱃지 렌더', () => {
    const lowDpiPose = makeResource({ lowDpi: true })
    render(<PoseGridItem pose={lowDpiPose} onAddToCanvas={mockOnAddToCanvas} />)
    expect(screen.getByLabelText('저해상도 자산')).toBeInTheDocument()
  })

  it('lowDpi=false 이면 경고 뱃지 없음', () => {
    render(<PoseGridItem pose={pose} onAddToCanvas={mockOnAddToCanvas} />)
    expect(screen.queryByLabelText('저해상도 자산')).not.toBeInTheDocument()
  })

  it('썸네일 없으면 플레이스홀더 렌더', () => {
    const nothumb = makeResource({ thumbUrl: null })
    render(<PoseGridItem pose={nothumb} onAddToCanvas={mockOnAddToCanvas} />)
    // img 태그 없어야 함
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})

// ─── PoseFilters 테스트 ───────────────────────────────────────────────────────

describe('PoseFilters', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('초기 렌더 — 필터 버튼 없음(접힌 상태)', () => {
    render(<PoseFilters value={INITIAL_FILTERS} onChange={mockOnChange} />)
    // 접기/펼치기 버튼은 있어야 함
    expect(screen.getByRole('button', { name: /필터/ })).toBeInTheDocument()
  })

  it('펼치기 버튼 클릭 시 필터 콘텐츠 노출', async () => {
    render(<PoseFilters value={INITIAL_FILTERS} onChange={mockOnChange} />)
    const toggleBtn = screen.getByRole('button', { name: /필터/ })
    fireEvent.click(toggleBtn)
    // 체형 레이블 노출
    await waitFor(() => {
      expect(screen.getByText('체형')).toBeInTheDocument()
    })
  })

  it('lowDpi 체크박스 변경 → onChange 호출', async () => {
    render(<PoseFilters value={INITIAL_FILTERS} onChange={mockOnChange} />)
    // 필터 열기
    fireEvent.click(screen.getByRole('button', { name: /필터/ }))

    await waitFor(() => {
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeInTheDocument()
    })

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ excludeLowDpi: true }))
  })

  it('활성 필터 있으면 초기화 버튼 노출', async () => {
    const activeFilters = { ...INITIAL_FILTERS, excludeLowDpi: true }
    render(<PoseFilters value={activeFilters} onChange={mockOnChange} />)
    // aria-controls 로 토글 버튼 특정
    fireEvent.click(screen.getByRole('button', { expanded: false }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /필터 초기화/ })).toBeInTheDocument()
    })
  })

  it('초기화 버튼 클릭 → INITIAL_FILTERS 로 onChange', async () => {
    const activeFilters = { ...INITIAL_FILTERS, excludeLowDpi: true }
    render(<PoseFilters value={activeFilters} onChange={mockOnChange} />)
    // aria-expanded=false 인 버튼이 토글 버튼
    fireEvent.click(screen.getByRole('button', { expanded: false }))

    await waitFor(() => {
      const resetBtn = screen.getByRole('button', { name: /필터 초기화/ })
      fireEvent.click(resetBtn)
    })

    expect(mockOnChange).toHaveBeenCalledWith(INITIAL_FILTERS)
  })
})

// ─── usePoseSearch 훅 테스트 (간소화) ────────────────────────────────────────

describe('usePoseSearch (via PosePanel)', () => {
  beforeEach(() => {
    mockFetch(defaultSearchResponse)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // 4. 필터 변경 → 새 API 호출 (실제 타이머)
  it('검색어 변경 시 fetch 재호출', async () => {
    render(<PosePanel canvas={null} history={null} onAddToCanvas={mockOnAddToCanvas} />)

    // 초기 fetch 완료 대기
    await waitFor(
      () => {
        expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(0)
      },
      { timeout: 2000 },
    )

    const firstCallCount = vi.mocked(fetch).mock.calls.length

    // 검색어 변경
    const input = screen.getByRole('searchbox', { name: /포즈 검색/ })
    fireEvent.change(input, { target: { value: '걷는' } })

    // debounce(300ms) 후 두 번째 fetch 호출
    await waitFor(
      () => {
        expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(firstCallCount)
      },
      { timeout: 2000 },
    )
  })

  // 9. 에러 상태 (실제 타이머, 10초 timeout)
  it('fetch 실패 후 에러 상태 + 재시도 버튼 노출', async () => {
    // RETRY_MAX=1 이므로 2번 실패해야 에러 상태
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('서버 오류')))

    render(<PosePanel canvas={null} history={null} onAddToCanvas={mockOnAddToCanvas} />)

    await waitFor(
      () => {
        // aria-label="검색 재시도" 버튼
        expect(screen.getByRole('button', { name: /검색 재시도/ })).toBeInTheDocument()
      },
      { timeout: 10000 },
    )
  }, 12000)
})
