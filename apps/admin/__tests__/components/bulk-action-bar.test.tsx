/**
 * BulkActionBar 단위 테스트
 *
 * 선택 변화 시 노출/숨김, undo 토스트, destructive confirm, 처리 중 비활성화
 */

import { cleanup, render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BulkActionBar } from '../../src/components/bulk-action-bar/BulkActionBar'
import type { BulkAction } from '../../src/components/bulk-action-bar/BulkActionBar'

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('BulkActionBar', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  const defaultActions: BulkAction[] = [
    {
      id: 'publish',
      label: '일괄 승인',
      handler: vi.fn().mockResolvedValue(undefined),
    },
    {
      id: 'delete',
      label: '일괄 삭제',
      variant: 'destructive',
      handler: vi.fn().mockResolvedValue(undefined),
    },
  ]

  // 노출/숨김
  it('selectedCount=0 이면 툴바가 숨겨진다', () => {
    render(<BulkActionBar selectedCount={0} onClear={vi.fn()} actions={defaultActions} />)
    // selectedCount=0 이면 isVisible=false → null 반환
    const toolbar = screen.queryByRole('toolbar')
    expect(toolbar).not.toBeInTheDocument()
  })

  it('selectedCount > 0 이면 툴바가 표시된다', () => {
    render(<BulkActionBar selectedCount={3} onClear={vi.fn()} actions={defaultActions} />)
    expect(screen.getByRole('toolbar')).toBeInTheDocument()
    expect(screen.getByText('3개 선택됨')).toBeInTheDocument()
  })

  it('selectedCount 가 0으로 바뀌면 isVisible 이 false 로 변해 숨겨진다', async () => {
    // fake timer 없이 실제 타이머로 테스트: 0→3→0 흐름 확인
    const { rerender } = render(
      <BulkActionBar selectedCount={3} onClear={vi.fn()} actions={defaultActions} />,
    )
    expect(screen.getByRole('toolbar')).toBeInTheDocument()

    rerender(<BulkActionBar selectedCount={0} onClear={vi.fn()} actions={defaultActions} />)

    // selectedCount=0 직후에는 아직 isVisible=true (애니 중)
    expect(screen.getByRole('toolbar')).toBeInTheDocument()

    // 300ms 후 숨겨짐
    await waitFor(
      () => {
        expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
      },
      { timeout: 1000 },
    )
  })

  // 해제 버튼
  it('해제 버튼 클릭 시 onClear 가 호출된다', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()

    render(<BulkActionBar selectedCount={5} onClear={onClear} actions={defaultActions} />)

    await user.click(screen.getByRole('button', { name: '선택 해제' }))
    expect(onClear).toHaveBeenCalled()
  })

  // 일반 액션
  it('일반 액션 버튼 클릭 시 handler 가 호출된다', async () => {
    const user = userEvent.setup()
    const handler = vi.fn().mockResolvedValue(undefined)
    const actions: BulkAction[] = [{ id: 'approve', label: '일괄 승인', handler }]

    render(<BulkActionBar selectedCount={3} onClear={vi.fn()} actions={actions} />)

    await user.click(screen.getByRole('button', { name: '일괄 승인' }))
    await waitFor(() => expect(handler).toHaveBeenCalled())
  })

  // undo 토스트 — handler 반환값 확인
  it('handler 가 undoable=true 를 반환하면 실행 후 에러 없이 완료된다', async () => {
    const user = userEvent.setup()
    const undoFn = vi.fn().mockResolvedValue(undefined)
    const handler = vi.fn().mockResolvedValue({ undoable: true, undo: undoFn })
    const actions: BulkAction[] = [{ id: 'approve', label: '일괄 승인', handler }]

    render(<BulkActionBar selectedCount={2} onClear={vi.fn()} actions={actions} />)

    await user.click(screen.getByRole('button', { name: '일괄 승인' }))
    await waitFor(() => expect(handler).toHaveBeenCalled())
    // undo fn 은 아직 호출 안 됨 (토스트에서 클릭해야 호출됨)
    expect(undoFn).not.toHaveBeenCalled()
  })

  // destructive confirm
  it('destructive 액션은 confirm 모달이 열린다', async () => {
    const user = userEvent.setup()
    const handler = vi.fn().mockResolvedValue(undefined)
    const actions: BulkAction[] = [
      { id: 'delete', label: '일괄 삭제', variant: 'destructive', handler },
    ]

    render(<BulkActionBar selectedCount={3} onClear={vi.fn()} actions={actions} />)

    await user.click(screen.getByRole('button', { name: '일괄 삭제' }))
    // confirm 모달이 열림
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('일괄 작업 확인')).toBeInTheDocument()
    // handler 는 아직 호출되지 않음
    expect(handler).not.toHaveBeenCalled()
  })

  it('destructive confirm 에서 실행 클릭 시 handler 가 호출된다', async () => {
    const user = userEvent.setup()
    const handler = vi.fn().mockResolvedValue(undefined)
    const actions: BulkAction[] = [
      { id: 'delete', label: '일괄 삭제', variant: 'destructive', handler },
    ]

    render(<BulkActionBar selectedCount={3} onClear={vi.fn()} actions={actions} />)

    await user.click(screen.getByRole('button', { name: '일괄 삭제' }))
    await user.click(screen.getByRole('button', { name: '실행' }))
    await waitFor(() => expect(handler).toHaveBeenCalled())
  })

  it('destructive confirm 에서 취소 클릭 시 handler 가 호출되지 않는다', async () => {
    const user = userEvent.setup()
    const handler = vi.fn()
    const actions: BulkAction[] = [
      { id: 'delete', label: '일괄 삭제', variant: 'destructive', handler },
    ]

    render(<BulkActionBar selectedCount={3} onClear={vi.fn()} actions={actions} />)

    await user.click(screen.getByRole('button', { name: '일괄 삭제' }))
    await user.click(screen.getByRole('button', { name: '취소' }))
    expect(handler).not.toHaveBeenCalled()
  })

  // 아이콘 렌더
  it('icon prop 이 있으면 버튼에 아이콘이 표시된다', () => {
    const actions: BulkAction[] = [
      {
        id: 'approve',
        label: '승인',
        icon: <span data-testid="icon" />,
        handler: vi.fn(),
      },
    ]

    render(<BulkActionBar selectedCount={1} onClear={vi.fn()} actions={actions} />)

    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  // 처리 중 비활성화
  it('처리 중에는 모든 액션 버튼이 비활성화된다', async () => {
    const user = userEvent.setup()
    let resolveHandler!: () => void
    const handler = vi.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        resolveHandler = resolve
      }),
    )
    const secondHandler = vi.fn()
    const actions: BulkAction[] = [
      { id: 'approve', label: '일괄 승인', handler },
      { id: 'delete', label: '일괄 삭제', variant: 'destructive', handler: secondHandler },
    ]

    render(<BulkActionBar selectedCount={3} onClear={vi.fn()} actions={actions} />)

    await user.click(screen.getByRole('button', { name: '일괄 승인' }))

    // 처리 중 — 모든 액션 버튼 비활성화
    await waitFor(() => {
      const approveBtn = screen.getByRole('button', { name: '일괄 승인' })
      expect(approveBtn).toBeDisabled()
    })

    // 완료
    act(() => resolveHandler())
    await waitFor(() => {
      const approveBtn = screen.getByRole('button', { name: '일괄 승인' })
      expect(approveBtn).not.toBeDisabled()
    })
  })
})
