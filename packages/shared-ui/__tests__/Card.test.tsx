import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import * as React from 'react'
import { describe, expect, it } from 'vitest'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../src/components/Card.js'

expect.extend(toHaveNoViolations)

describe('Card', () => {
  it('Card 가 렌더됩니다', () => {
    render(<Card data-testid="card">내용</Card>)
    expect(screen.getByTestId('card')).toBeInTheDocument()
  })

  it('CardTitle 텍스트가 렌더됩니다', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>제목</CardTitle>
          <CardDescription>설명</CardDescription>
        </CardHeader>
        <CardContent>본문</CardContent>
        <CardFooter>푸터</CardFooter>
      </Card>,
    )
    expect(screen.getByText('제목')).toBeInTheDocument()
    expect(screen.getByText('설명')).toBeInTheDocument()
    expect(screen.getByText('본문')).toBeInTheDocument()
  })

  it('className 이 병합됩니다', () => {
    render(
      <Card className="custom-class" data-testid="card">
        내용
      </Card>,
    )
    expect(screen.getByTestId('card').className).toContain('custom-class')
  })

  it('axe a11y 위반이 없습니다', async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>접근성 테스트</CardTitle>
          <CardDescription>카드 설명입니다</CardDescription>
        </CardHeader>
        <CardContent>카드 내용</CardContent>
      </Card>,
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
