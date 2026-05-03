import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import * as React from 'react'
import { describe, expect, it } from 'vitest'

import { Button } from '../src/components/Button.js'

expect.extend(toHaveNoViolations)

describe('Button', () => {
  it('텍스트가 렌더됩니다', () => {
    render(<Button>저장</Button>)
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument()
  })

  it('disabled 상태일 때 포인터 이벤트가 없습니다', () => {
    render(<Button disabled>저장</Button>)
    const btn = screen.getByRole('button', { name: '저장' })
    expect(btn).toBeDisabled()
  })

  it('variant=destructive 클래스를 가집니다', () => {
    render(<Button variant="destructive">삭제</Button>)
    const btn = screen.getByRole('button', { name: '삭제' })
    // destructive 클래스 포함 확인
    expect(btn.className).toContain('bg-[var(--color-error-500)]')
  })

  it('size=icon 일 때 44px 정사각형입니다 (Tailwind 클래스)', () => {
    render(
      <Button size="icon" aria-label="닫기">
        x
      </Button>,
    )
    const btn = screen.getByRole('button', { name: '닫기' })
    expect(btn.className).toContain('size-11')
  })

  it('asChild 로 a 태그를 렌더합니다', () => {
    render(
      <Button asChild>
        <a href="/test">링크 버튼</a>
      </Button>,
    )
    const link = screen.getByRole('link', { name: '링크 버튼' })
    expect(link.tagName).toBe('A')
  })

  it('axe a11y 위반이 없습니다', async () => {
    const { container } = render(<Button>접근성 테스트</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
