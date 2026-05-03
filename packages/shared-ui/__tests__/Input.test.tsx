import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import * as React from 'react'
import { describe, expect, it } from 'vitest'

import { Input } from '../src/components/Input.js'

expect.extend(toHaveNoViolations)

describe('Input', () => {
  it('input 이 렌더됩니다', () => {
    render(<Input placeholder="이메일" />)
    expect(screen.getByPlaceholderText('이메일')).toBeInTheDocument()
  })

  it('label 이 input 과 연결됩니다', () => {
    render(<Input label="이메일 주소" placeholder="user@example.com" />)
    expect(screen.getByLabelText('이메일 주소')).toBeInTheDocument()
  })

  it('variant=error 일 때 aria-invalid 를 가집니다', () => {
    render(<Input label="비밀번호" variant="error" errorText="8자 이상 입력하세요" />)
    const input = screen.getByLabelText('비밀번호')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('errorText 가 role=alert 로 렌더됩니다', () => {
    render(<Input variant="error" errorText="필수 입력 항목입니다" />)
    expect(screen.getByRole('alert')).toHaveTextContent('필수 입력 항목입니다')
  })

  it('helperText 가 렌더됩니다', () => {
    render(<Input helperText="이메일 형식으로 입력하세요" />)
    expect(screen.getByText('이메일 형식으로 입력하세요')).toBeInTheDocument()
  })

  it('axe a11y 위반이 없습니다', async () => {
    const { container } = render(<Input label="이메일" placeholder="user@example.com" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('에러 상태 axe a11y 위반이 없습니다', async () => {
    const { container } = render(
      <Input label="비밀번호" variant="error" errorText="잘못된 비밀번호입니다" />,
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
