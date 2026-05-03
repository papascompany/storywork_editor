import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import * as React from 'react'
import { describe, expect, it } from 'vitest'

import { Button } from '../src/components/Button.js'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../src/components/Sheet.js'

expect.extend(toHaveNoViolations)

const TestSheet = ({ side }: { side?: 'left' | 'right' | 'top' | 'bottom' }) => (
  <Sheet>
    <SheetTrigger asChild>
      <Button>시트 열기</Button>
    </SheetTrigger>
    <SheetContent side={side}>
      <SheetHeader>
        <SheetTitle>레이어 패널</SheetTitle>
      </SheetHeader>
      <p>시트 내용</p>
    </SheetContent>
  </Sheet>
)

describe('Sheet', () => {
  it('트리거 버튼이 렌더됩니다', () => {
    render(<TestSheet />)
    expect(screen.getByRole('button', { name: '시트 열기' })).toBeInTheDocument()
  })

  it('트리거 클릭 시 시트가 열립니다', async () => {
    const user = userEvent.setup()
    render(<TestSheet />)
    await user.click(screen.getByRole('button', { name: '시트 열기' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('레이어 패널')).toBeInTheDocument()
  })

  it('bottom 사이드로 열립니다 (BottomSheet)', async () => {
    const user = userEvent.setup()
    render(<TestSheet side="bottom" />)
    await user.click(screen.getByRole('button', { name: '시트 열기' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('ESC 키로 시트가 닫힙니다', async () => {
    const user = userEvent.setup()
    render(<TestSheet />)
    await user.click(screen.getByRole('button', { name: '시트 열기' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('트리거 버튼 axe a11y 위반이 없습니다', async () => {
    const { container } = render(<TestSheet />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
