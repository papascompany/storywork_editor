/**
 * formats-form.test.tsx
 *
 * 프리셋 카드 클릭 + EntityForm 렌더링 테스트.
 * API fetch mock 으로 submit 동작 검증.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

// next/navigation mock
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// fetch mock
global.fetch = vi.fn()

import NewFormatPage from '../../app/(dashboard)/formats/new/page'

describe('NewFormatPage (프리셋 + 폼)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 201,
      ok: true,
      json: vi.fn().mockResolvedValue({ id: 'new-id', name: 'B5 단행본' }),
    })
  })

  it('4종 프리셋 카드가 렌더링된다', () => {
    render(<NewFormatPage />)
    expect(screen.getByText('B5 (단행본)')).toBeDefined()
    expect(screen.getByText('A5 (작품집)')).toBeDefined()
    expect(screen.getByText('정사각 1:1')).toBeDefined()
    expect(screen.getByText('세로형 (모바일)')).toBeDefined()
  })

  it('프리셋 카드 클릭 시 aria-pressed=true 가 된다', () => {
    render(<NewFormatPage />)
    const b5Card = screen.getByRole('button', { name: /B5 \(단행본\)/ })
    expect(b5Card.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(b5Card)
    expect(b5Card.getAttribute('aria-pressed')).toBe('true')
  })

  it('EntityForm 이 렌더링된다', () => {
    render(<NewFormatPage />)
    expect(screen.getByLabelText(/판형 이름/)).toBeDefined()
  })

  it('표지 설정 필드(표지 사용/표지 폭/표지 높이/판형 활성화)가 렌더된다', () => {
    render(<NewFormatPage />)
    // 표지 사용 + 판형 활성화 — role="switch"
    expect(screen.getByRole('switch', { name: '표지 사용' })).toBeDefined()
    expect(screen.getByRole('switch', { name: '판형 활성화' })).toBeDefined()
    // 표지 폭/높이 — number 입력
    expect(screen.getByLabelText(/표지 폭/)).toBeDefined()
    expect(screen.getByLabelText(/표지 높이/)).toBeDefined()
  })

  it('판형 활성화 스위치 기본값은 켜짐(true), 표지 사용은 꺼짐(false)', () => {
    render(<NewFormatPage />)
    expect(screen.getByRole('switch', { name: '판형 활성화' }).getAttribute('aria-checked')).toBe(
      'true',
    )
    expect(screen.getByRole('switch', { name: '표지 사용' }).getAttribute('aria-checked')).toBe(
      'false',
    )
  })

  it('표지 사용 스위치 토글이 동작한다', () => {
    render(<NewFormatPage />)
    const sw = screen.getByRole('switch', { name: '표지 사용' })
    expect(sw.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(sw)
    expect(sw.getAttribute('aria-checked')).toBe('true')
  })

  it('프리셋 카드 클릭 후 폼 필드가 채워진다', async () => {
    render(<NewFormatPage />)
    const b5Card = screen.getByRole('button', { name: /B5 \(단행본\)/ })
    fireEvent.click(b5Card)

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('예: B5 단행본') as HTMLInputElement
      expect(nameInput.value).toBe('B5 단행본')
    })
  })

  it('폼 제출 시 POST /api/formats 호출', async () => {
    render(<NewFormatPage />)

    // 프리셋 선택
    fireEvent.click(screen.getByRole('button', { name: /B5 \(단행본\)/ }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('예: B5 단행본')).toBeDefined()
    })

    // 폼 제출
    const submitBtn = screen.getByRole('button', { name: '판형 등록' })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/formats',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })
})
