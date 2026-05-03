import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import * as React from 'react'
import { describe, expect, it } from 'vitest'

import { Button } from '../src/components/Button.js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../src/components/Dialog.js'

expect.extend(toHaveNoViolations)

const TestDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button>다이얼로그 열기</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>확인</DialogTitle>
        <DialogDescription>정말 삭제하겠습니까?</DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
)

describe('Dialog', () => {
  it('트리거 버튼이 렌더됩니다', () => {
    render(<TestDialog />)
    expect(screen.getByRole('button', { name: '다이얼로그 열기' })).toBeInTheDocument()
  })

  it('트리거 클릭 시 다이얼로그가 열립니다', async () => {
    const user = userEvent.setup()
    render(<TestDialog />)
    await user.click(screen.getByRole('button', { name: '다이얼로그 열기' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('확인')).toBeInTheDocument()
    expect(screen.getByText('정말 삭제하겠습니까?')).toBeInTheDocument()
  })

  it('ESC 키로 다이얼로그가 닫힙니다', async () => {
    const user = userEvent.setup()
    render(<TestDialog />)
    await user.click(screen.getByRole('button', { name: '다이얼로그 열기' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('트리거 버튼 axe a11y 위반이 없습니다', async () => {
    const { container } = render(<TestDialog />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
