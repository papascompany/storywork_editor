import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import * as React from 'react'
import { describe, expect, it, beforeEach } from 'vitest'

import { ToastProvider, showToast, useToast, _resetToastState } from '../src/components/Toast.js'

expect.extend(toHaveNoViolations)

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

describe('Toast', () => {
  beforeEach(() => {
    // 각 테스트 전 싱글톤 상태 초기화
    _resetToastState()
  })

  it('ToastProvider 가 렌더됩니다', () => {
    render(
      <ToastProvider>
        <div>content</div>
      </ToastProvider>,
    )
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('showToast 호출 후 메시지가 화면에 표시됩니다', async () => {
    render(<ToastProvider />)

    act(() => {
      showToast('테스트 메시지', 'success')
    })

    await waitFor(() => {
      expect(screen.getByText('테스트 메시지')).toBeInTheDocument()
    })
  })

  it('useToast().show 로 토스트를 표시합니다', async () => {
    function TestComponent() {
      const { show } = useToast()
      return (
        <button type="button" onClick={() => show({ message: 'hook 토스트', variant: 'info' })}>
          표시
        </button>
      )
    }

    render(
      <Wrapper>
        <TestComponent />
      </Wrapper>,
    )
    await userEvent.click(screen.getByRole('button', { name: '표시' }))

    await waitFor(() => {
      expect(screen.getByText('hook 토스트')).toBeInTheDocument()
    })
  })

  it('닫기 버튼 클릭 시 토스트가 제거됩니다', async () => {
    render(<ToastProvider />)

    act(() => {
      showToast('닫기 테스트', 'error', Infinity)
    })

    await waitFor(() => {
      expect(screen.getByText('닫기 테스트')).toBeInTheDocument()
    })

    const closeBtn = screen.getByRole('button', { name: '알림 닫기' })
    await userEvent.click(closeBtn)

    // 300ms 애니메이션 대기
    await waitFor(
      () => {
        expect(screen.queryByText('닫기 테스트')).not.toBeInTheDocument()
      },
      { timeout: 1000 },
    )
  })

  it('action 버튼이 렌더되고 클릭됩니다', async () => {
    const onAction = () => showToast('실행 취소됨', 'success')

    function TestComponent() {
      const { show } = useToast()
      return (
        <button
          type="button"
          onClick={() =>
            show({
              message: '삭제됐습니다',
              variant: 'error',
              duration: Infinity,
              action: { label: '실행 취소', onClick: onAction },
            })
          }
        >
          삭제
        </button>
      )
    }

    render(
      <Wrapper>
        <TestComponent />
      </Wrapper>,
    )
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(screen.getByText('삭제됐습니다')).toBeInTheDocument()
    })

    const actionBtn = screen.getByRole('button', { name: '실행 취소' })
    expect(actionBtn).toBeInTheDocument()
    await userEvent.click(actionBtn)

    await waitFor(() => {
      expect(screen.getByText('실행 취소됨')).toBeInTheDocument()
    })
  })

  it('role="region" aria-live="polite" 가 있습니다', () => {
    render(<ToastProvider />)
    const region = screen.getByRole('region', { name: '알림' })
    expect(region).toHaveAttribute('aria-live', 'polite')
  })

  it('axe a11y 위반이 없습니다', async () => {
    render(<ToastProvider />)

    act(() => {
      showToast('a11y 테스트', 'success', Infinity)
    })

    await waitFor(() => {
      expect(screen.getByText('a11y 테스트')).toBeInTheDocument()
    })

    const { container } = render(<ToastProvider />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
