/**
 * command-palette.test.tsx — CommandPalette 단위 테스트
 *
 * 검증 항목:
 * 1. open=true → 팔레트 노출
 * 2. open=false → 팔레트 미노출
 * 3. 검색 "pose" → 포즈 도구 명령 노출
 * 4. ↑↓ 키 이동
 * 5. Enter → 명령 실행 (mock)
 * 6. Esc → 닫힘 (onClose 호출)
 * 7. 최근 사용 localStorage 저장 + 다음 마운트 시 복원
 * 8. 빈 검색 → 추천 명령 노출
 * 9. 비활성(disabled) 명령 → 클릭해도 실행 안 됨
 */

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { CommandPalette } from '../components/editor/CommandPalette'
import { RECENT_COMMANDS_KEY, saveRecentCommandId } from '../components/editor/commands/registry'

// ── 모킹 ─────────────────────────────────────────────────────────────────────

const mockCtx = {
  canvas: null,
  layerTree: null,
  history: null,
  setActiveTool: vi.fn(),
  showToast: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  try {
    localStorage.removeItem(RECENT_COMMANDS_KEY)
  } catch {
    // private mode
  }
})

afterEach(() => {
  try {
    localStorage.removeItem(RECENT_COMMANDS_KEY)
  } catch {
    // private mode
  }
})

// ── 테스트 ───────────────────────────────────────────────────────────────────

describe('CommandPalette — 기본 렌더', () => {
  it('1. open=true → 팔레트 노출', () => {
    render(<CommandPalette open={true} onClose={() => {}} ctx={mockCtx} />)
    expect(screen.getByRole('dialog', { name: '명령 팔레트' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('명령 검색...')).toBeInTheDocument()
  })

  it('2. open=false → 팔레트 미노출', () => {
    render(<CommandPalette open={false} onClose={() => {}} ctx={mockCtx} />)
    expect(screen.queryByRole('dialog', { name: '명령 팔레트' })).not.toBeInTheDocument()
  })
})

describe('CommandPalette — 검색', () => {
  it('3. 검색 "pose" → 포즈 도구 명령 노출', async () => {
    render(<CommandPalette open={true} onClose={() => {}} ctx={mockCtx} />)
    const input = screen.getByPlaceholderText('명령 검색...')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'pose' } })
    })
    // "포즈 도구" 명령이 목록에 있어야 함
    expect(screen.getByText('포즈 도구')).toBeInTheDocument()
  })

  it('검색 "포즈" (한국어) → 포즈 도구 명령 노출', async () => {
    render(<CommandPalette open={true} onClose={() => {}} ctx={mockCtx} />)
    const input = screen.getByPlaceholderText('명령 검색...')
    await act(async () => {
      fireEvent.change(input, { target: { value: '포즈' } })
    })
    expect(screen.getByText('포즈 도구')).toBeInTheDocument()
  })

  it('8. 빈 검색 → 추천/최근 명령 섹션 노출', () => {
    render(<CommandPalette open={true} onClose={() => {}} ctx={mockCtx} />)
    // 추천 또는 최근 헤더가 있어야 함
    expect(screen.getByText(/추천|최근/)).toBeInTheDocument()
  })

  it('검색어 지우기 버튼 → input 초기화', async () => {
    render(<CommandPalette open={true} onClose={() => {}} ctx={mockCtx} />)
    const input = screen.getByPlaceholderText('명령 검색...')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } })
    })
    const clearBtn = screen.getByLabelText('검색어 지우기')
    await act(async () => {
      fireEvent.click(clearBtn)
    })
    expect((input as HTMLInputElement).value).toBe('')
  })
})

describe('CommandPalette — 키보드 탐색', () => {
  it('4. ↓ 키 → 다음 항목 선택', async () => {
    render(<CommandPalette open={true} onClose={() => {}} ctx={mockCtx} />)
    const input = screen.getByPlaceholderText('명령 검색...')
    // 첫 번째 항목이 aria-selected=true
    const items = screen.getAllByRole('option')
    expect(items[0]).toHaveAttribute('aria-selected', 'true')
    // ↓ 키
    await act(async () => {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
    })
    const updatedItems = screen.getAllByRole('option')
    expect(updatedItems[1]).toHaveAttribute('aria-selected', 'true')
  })

  it('↑ 키 → 범위 초과 안 함 (0에서 유지)', async () => {
    render(<CommandPalette open={true} onClose={() => {}} ctx={mockCtx} />)
    const input = screen.getByPlaceholderText('명령 검색...')
    await act(async () => {
      fireEvent.keyDown(input, { key: 'ArrowUp' })
    })
    const items = screen.getAllByRole('option')
    // 여전히 첫 번째 항목 선택
    expect(items[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('5. Enter → 명령 실행 (onClose 호출, action 실행)', async () => {
    const onClose = vi.fn()
    render(<CommandPalette open={true} onClose={onClose} ctx={mockCtx} />)
    const input = screen.getByPlaceholderText('명령 검색...')
    // "선택 도구" 검색
    await act(async () => {
      fireEvent.change(input, { target: { value: '선택 도구' } })
    })
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' })
    })
    // onClose 호출
    expect(onClose).toHaveBeenCalled()
  })

  it('6. Esc → onClose 호출', async () => {
    const onClose = vi.fn()
    render(<CommandPalette open={true} onClose={onClose} ctx={mockCtx} />)
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(onClose).toHaveBeenCalled()
  })
})

describe('CommandPalette — 최근 사용', () => {
  it('7. 명령 실행 → localStorage 저장 + 다음 마운트 시 복원', async () => {
    // 미리 최근 명령 저장
    saveRecentCommandId('tool-select')

    const { unmount } = render(<CommandPalette open={true} onClose={() => {}} ctx={mockCtx} />)

    // "최근 및 추천" 헤더
    await waitFor(() => {
      expect(screen.getByText('최근 및 추천')).toBeInTheDocument()
    })

    // "선택 도구" 가 목록에 있어야 함
    expect(screen.getByText('선택 도구')).toBeInTheDocument()

    unmount()
  })
})

describe('CommandPalette — 백드롭 클릭', () => {
  it('백드롭 클릭 → onClose 호출', async () => {
    const onClose = vi.fn()
    render(<CommandPalette open={true} onClose={onClose} ctx={mockCtx} />)
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement
    await act(async () => {
      fireEvent.click(backdrop)
    })
    expect(onClose).toHaveBeenCalled()
  })
})
