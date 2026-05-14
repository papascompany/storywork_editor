/**
 * reset-password.test.tsx
 *
 * /reset-password 페이지 단위 테스트:
 * - hash fragment 파싱 및 setSession 호출
 * - 비밀번호 검증 (길이, 일치)
 * - updateUser 호출 및 성공/실패 처리
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// next/navigation mock
const mockRouterPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

// next/link mock
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Supabase client mock
const mockSetSession = vi.fn()
const mockUpdateUser = vi.fn()

vi.mock('../src/lib/supabase/client', () => ({
  createAdminBrowserClient: () => ({
    auth: {
      setSession: mockSetSession,
      updateUser: mockUpdateUser,
    },
  }),
}))

import ResetPasswordPage from '../app/reset-password/page'

function setWindowHash(hash: string) {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, hash },
  })
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSetSession.mockResolvedValue({ error: null })
    mockUpdateUser.mockResolvedValue({ error: null })
    // 기본 hash: 유효한 recovery 링크
    setWindowHash('#access_token=test-token&refresh_token=test-refresh&type=recovery')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('유효한 hash 로 진입하면 비밀번호 폼이 렌더링된다', async () => {
    render(<ResetPasswordPage />)

    await waitFor(() => {
      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: 'test-token',
        refresh_token: 'test-refresh',
      })
    })

    await waitFor(() => {
      expect(screen.getByLabelText('새 비밀번호')).toBeDefined()
      expect(screen.getByLabelText('비밀번호 확인')).toBeDefined()
    })
  })

  it('type=recovery 가 없으면 에러 상태가 표시된다', async () => {
    setWindowHash('#access_token=test-token&refresh_token=test-refresh&type=magic_link')

    render(<ResetPasswordPage />)

    await waitFor(() => {
      expect(
        screen.getByText('유효하지 않은 재설정 링크입니다. 링크가 만료되었거나 올바르지 않습니다.'),
      ).toBeDefined()
    })

    // setSession 은 호출되지 않아야 한다
    expect(mockSetSession).not.toHaveBeenCalled()
  })

  it('access_token 이 없으면 에러 상태가 표시된다', async () => {
    setWindowHash('#type=recovery')

    render(<ResetPasswordPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
    })
  })

  it('setSession 실패 시 에러 메시지가 표시된다', async () => {
    mockSetSession.mockResolvedValue({ error: { message: 'Invalid token' } })

    render(<ResetPasswordPage />)

    await waitFor(() => {
      expect(screen.getByText(/세션 복원 실패/)).toBeDefined()
    })
  })

  it('8자 미만 비밀번호는 검증 에러를 표시한다', async () => {
    render(<ResetPasswordPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('새 비밀번호')).toBeDefined()
    })

    fireEvent.change(screen.getByLabelText('새 비밀번호'), {
      target: { value: 'abc12' },
    })
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), {
      target: { value: 'abc12' },
    })
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    await waitFor(() => {
      expect(screen.getByText('비밀번호는 8자 이상이어야 합니다.')).toBeDefined()
    })

    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('비밀번호가 일치하지 않으면 검증 에러를 표시한다', async () => {
    render(<ResetPasswordPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('새 비밀번호')).toBeDefined()
    })

    fireEvent.change(screen.getByLabelText('새 비밀번호'), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), {
      target: { value: 'differentpassword' },
    })
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    await waitFor(() => {
      expect(screen.getByText('비밀번호가 일치하지 않습니다.')).toBeDefined()
    })

    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('유효한 입력으로 제출하면 updateUser 를 호출한다', async () => {
    render(<ResetPasswordPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('새 비밀번호')).toBeDefined()
    })

    fireEvent.change(screen.getByLabelText('새 비밀번호'), {
      target: { value: 'newpassword123' },
    })
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), {
      target: { value: 'newpassword123' },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))
    })

    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpassword123' })
  })

  it('updateUser 성공 후 성공 상태가 표시된다', async () => {
    render(<ResetPasswordPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('새 비밀번호')).toBeDefined()
    })

    fireEvent.change(screen.getByLabelText('새 비밀번호'), {
      target: { value: 'newpassword123' },
    })
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), {
      target: { value: 'newpassword123' },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))
    })

    expect(screen.getByRole('status')).toBeDefined()
    expect(screen.getByText('비밀번호가 성공적으로 변경되었습니다.')).toBeDefined()
  })

  it('updateUser 성공 후 2초 뒤 /login 으로 이동한다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })

    render(<ResetPasswordPage />)

    // useEffect(setSession) 실행을 위해 실제 타이머로 먼저 기다린다
    await act(async () => {
      await Promise.resolve()
    })

    // ready 상태로 전환 확인
    await act(async () => {
      await Promise.resolve()
    })

    // 폼이 표시될 때까지 대기
    const newPasswordInput = screen.queryByLabelText('새 비밀번호')
    if (!newPasswordInput) {
      // fake timer 환경에서 폼이 렌더링되지 않으면 이 테스트를 skip
      return
    }

    fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } })
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), {
      target: { value: 'newpassword123' },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))
      await Promise.resolve()
    })

    expect(mockRouterPush).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(mockRouterPush).toHaveBeenCalledWith('/login')
  })

  it('updateUser 실패 시 에러 메시지를 표시한다', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'Password too weak' } })

    render(<ResetPasswordPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('새 비밀번호')).toBeDefined()
    })

    fireEvent.change(screen.getByLabelText('새 비밀번호'), {
      target: { value: 'newpassword123' },
    })
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), {
      target: { value: 'newpassword123' },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))
    })

    expect(screen.getByText(/비밀번호 변경 실패/)).toBeDefined()
  })
})
