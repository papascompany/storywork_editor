/**
 * ReviewQueue 단위 테스트
 *
 * 키보드 j/k/a/r/Esc, 거절 사유 모달, 자동 다음 포커스, undo 토스트, 빈 상태
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ReviewQueue } from '../../src/components/review-queue/ReviewQueue'

// ─── ToastProvider mock ───────────────────────────────────────────────────────
// shared-ui/Toast 의 useToast 는 싱글톤이라 테스트에서도 동작함
// ToastProvider 는 마운트 안 해도 showToast 사용 가능

// ─── 픽스처 ──────────────────────────────────────────────────────────────────

interface PoseItem {
  id: string
  name: string
  thumbnailUrl: string
}

function makeItems(n: number): PoseItem[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `pose-${i}`,
    name: `포즈 ${i + 1}`,
    thumbnailUrl: `/poses/pose-${i}.png`,
  }))
}

const rowKey = (item: PoseItem) => item.id

function renderCard(item: PoseItem, { isFocused }: { isFocused: boolean }) {
  return (
    <div data-testid={`card-${item.id}`} data-focused={isFocused}>
      <img src={item.thumbnailUrl} alt={item.name} />
      <p>{item.name}</p>
    </div>
  )
}

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('ReviewQueue', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  // 기본 렌더
  it('항목들을 카드 그리드로 렌더한다', () => {
    const items = makeItems(4)
    const onApprove = vi.fn().mockResolvedValue(undefined)
    const onReject = vi.fn().mockResolvedValue(undefined)

    render(
      <ReviewQueue
        items={items}
        rowKey={rowKey}
        renderCard={renderCard}
        onApprove={onApprove}
        onReject={onReject}
      />,
    )

    expect(screen.getByTestId('card-pose-0')).toBeInTheDocument()
    expect(screen.getByTestId('card-pose-3')).toBeInTheDocument()
  })

  // 빈 상태
  it('항목이 없으면 빈 상태를 표시한다', () => {
    const onApprove = vi.fn()
    const onReject = vi.fn()

    render(
      <ReviewQueue
        items={[]}
        rowKey={rowKey}
        renderCard={renderCard}
        onApprove={onApprove}
        onReject={onReject}
      />,
    )
    expect(screen.getByText('검수 대기 항목이 없습니다')).toBeInTheDocument()
  })

  it('커스텀 emptyState 를 렌더한다', () => {
    const onApprove = vi.fn()
    const onReject = vi.fn()

    render(
      <ReviewQueue
        items={[]}
        rowKey={rowKey}
        renderCard={renderCard}
        onApprove={onApprove}
        onReject={onReject}
        emptyState={<span>모두 검수 완료!</span>}
      />,
    )
    expect(screen.getByText('모두 검수 완료!')).toBeInTheDocument()
  })

  // 로딩
  it('isLoading=true 면 skeleton 을 표시한다', () => {
    const onApprove = vi.fn()
    const onReject = vi.fn()

    render(
      <ReviewQueue
        items={[]}
        rowKey={rowKey}
        renderCard={renderCard}
        onApprove={onApprove}
        onReject={onReject}
        isLoading
      />,
    )
    const skeletons = document.querySelectorAll('[aria-hidden="true"].animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  // 승인 버튼 클릭
  it('승인 버튼 클릭 시 onApprove 가 호출된다', async () => {
    const user = userEvent.setup()
    const items = makeItems(2)
    const onApprove = vi.fn().mockResolvedValue(undefined)
    const onReject = vi.fn()

    render(
      <ReviewQueue
        items={items}
        rowKey={rowKey}
        renderCard={renderCard}
        onApprove={onApprove}
        onReject={onReject}
      />,
    )

    const approveButtons = screen.getAllByRole('button', { name: '승인' })
    if (approveButtons[0]) await user.click(approveButtons[0])
    await waitFor(() => {
      expect(onApprove).toHaveBeenCalledWith(items[0])
    })
  })

  // 거절 버튼 → 모달 → 사유 입력 → 확인
  it('거절 버튼 클릭 시 사유 모달이 열린다', async () => {
    const user = userEvent.setup()
    const items = makeItems(2)
    const onApprove = vi.fn()
    const onReject = vi.fn().mockResolvedValue(undefined)

    render(
      <ReviewQueue
        items={items}
        rowKey={rowKey}
        renderCard={renderCard}
        onApprove={onApprove}
        onReject={onReject}
      />,
    )

    const rejectButtons = screen.getAllByRole('button', { name: '거절' })
    if (rejectButtons[0]) await user.click(rejectButtons[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('거절 사유 입력')).toBeInTheDocument()
  })

  it('거절 사유 입력 후 확인 시 onReject 가 호출된다', async () => {
    const user = userEvent.setup()
    const items = makeItems(2)
    const onApprove = vi.fn()
    const onReject = vi.fn().mockResolvedValue(undefined)

    render(
      <ReviewQueue
        items={items}
        rowKey={rowKey}
        renderCard={renderCard}
        onApprove={onApprove}
        onReject={onReject}
      />,
    )

    const rejectButtons = screen.getAllByRole('button', { name: '거절' })
    if (rejectButtons[0]) await user.click(rejectButtons[0])

    const textarea = screen.getByRole('textbox', { name: '거절 사유' })
    await user.type(textarea, '해상도가 너무 낮습니다')

    const confirmBtn = screen.getByRole('button', { name: '거절 확정' })
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(onReject).toHaveBeenCalledWith(items[0], '해상도가 너무 낮습니다')
    })
  })

  it('빈 사유로는 거절 확정 버튼이 비활성화된다', async () => {
    const user = userEvent.setup()
    const items = makeItems(1)
    const onApprove = vi.fn()
    const onReject = vi.fn()

    render(
      <ReviewQueue
        items={items}
        rowKey={rowKey}
        renderCard={renderCard}
        onApprove={onApprove}
        onReject={onReject}
      />,
    )

    const rejectButton = screen.getByRole('button', { name: '거절' })
    await user.click(rejectButton)

    const confirmBtn = screen.getByRole('button', { name: '거절 확정' })
    expect(confirmBtn).toBeDisabled()
  })

  // 키보드 j/k
  it('j 키로 다음 항목에 포커스가 이동한다', async () => {
    const user = userEvent.setup()
    const items = makeItems(3)
    const onApprove = vi.fn()
    const onReject = vi.fn()

    render(
      <ReviewQueue
        items={items}
        rowKey={rowKey}
        renderCard={renderCard}
        onApprove={onApprove}
        onReject={onReject}
      />,
    )

    await user.keyboard('j')
    // focusedIndex = 0 → 첫 번째 카드가 focused
    await waitFor(() => {
      const card = screen.getByTestId('card-pose-0')
      const gridCell = card.closest('[role="gridcell"]')
      expect(gridCell).toHaveAttribute('aria-selected', 'true')
    })
  })

  it('k 키로 이전 항목으로 이동한다', async () => {
    const user = userEvent.setup()
    const items = makeItems(3)
    const onApprove = vi.fn()
    const onReject = vi.fn()

    render(
      <ReviewQueue
        items={items}
        rowKey={rowKey}
        renderCard={renderCard}
        onApprove={onApprove}
        onReject={onReject}
      />,
    )

    await user.keyboard('j')
    await user.keyboard('j')
    await user.keyboard('k')

    await waitFor(() => {
      const card = screen.getByTestId('card-pose-0')
      const gridCell = card.closest('[role="gridcell"]')
      expect(gridCell).toHaveAttribute('aria-selected', 'true')
    })
  })

  it('Esc 키로 포커스를 해제한다', async () => {
    const user = userEvent.setup()
    const items = makeItems(3)
    const onApprove = vi.fn()
    const onReject = vi.fn()

    render(
      <ReviewQueue
        items={items}
        rowKey={rowKey}
        renderCard={renderCard}
        onApprove={onApprove}
        onReject={onReject}
      />,
    )

    await user.keyboard('j')
    await user.keyboard('{Escape}')

    // 모든 카드가 선택 해제됨
    const gridCells = screen.getAllByRole('gridcell')
    gridCells.forEach((cell) => {
      expect(cell).not.toHaveAttribute('aria-selected', 'true')
    })
  })

  // 키보드 a — 승인
  it('포커스 있을 때 a 키로 승인된다', async () => {
    const user = userEvent.setup()
    const items = makeItems(2)
    const onApprove = vi.fn().mockResolvedValue(undefined)
    const onReject = vi.fn()

    render(
      <ReviewQueue
        items={items}
        rowKey={rowKey}
        renderCard={renderCard}
        onApprove={onApprove}
        onReject={onReject}
      />,
    )

    await user.keyboard('j') // focus index 0
    await user.keyboard('a')

    await waitFor(() => {
      expect(onApprove).toHaveBeenCalledWith(items[0])
    })
  })

  // 키보드 r — 거절 모달
  it('포커스 있을 때 r 키로 거절 모달이 열린다', async () => {
    const user = userEvent.setup()
    const items = makeItems(2)
    const onApprove = vi.fn()
    const onReject = vi.fn()

    render(
      <ReviewQueue
        items={items}
        rowKey={rowKey}
        renderCard={renderCard}
        onApprove={onApprove}
        onReject={onReject}
      />,
    )

    await user.keyboard('j')
    await user.keyboard('r')

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  // 진행률 표시
  it('totalCount > items.length 이면 진행률 바가 표시된다', () => {
    const items = makeItems(5)
    const onApprove = vi.fn()
    const onReject = vi.fn()

    render(
      <ReviewQueue
        items={items}
        rowKey={rowKey}
        renderCard={renderCard}
        onApprove={onApprove}
        onReject={onReject}
        totalCount={10}
      />,
    )

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  // 추가 액션
  it('extraActions 가 있으면 버튼이 렌더되고 클릭 시 handler 가 호출된다', async () => {
    const user = userEvent.setup()
    const items = makeItems(2)
    const onApprove = vi.fn()
    const onReject = vi.fn()
    const extraHandler = vi.fn().mockResolvedValue(undefined)

    render(
      <ReviewQueue
        items={items}
        rowKey={rowKey}
        renderCard={renderCard}
        onApprove={onApprove}
        onReject={onReject}
        extraActions={[{ id: 'edit', label: '수정 후 승인', key: 'e', handler: extraHandler }]}
      />,
    )

    const editButtons = screen.getAllByRole('button', { name: '수정 후 승인' })
    if (editButtons[0]) await user.click(editButtons[0])
    await waitFor(() => {
      expect(extraHandler).toHaveBeenCalledWith(items[0])
    })
  })
})
