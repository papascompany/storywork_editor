import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import * as React from 'react'
import { describe, expect, it } from 'vitest'

import { LoadingOverlay } from '../src/components/LoadingOverlay.js'

expect.extend(toHaveNoViolations)

describe('LoadingOverlay', () => {
  it('show=false 이면 null 반환 (DOM에 없음)', () => {
    render(<LoadingOverlay show={false} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('show=true 이면 role="status" 가 있습니다', () => {
    render(<LoadingOverlay show />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('message 가 화면에 표시됩니다', () => {
    render(<LoadingOverlay show message="저장 중..." />)
    // p 태그와 sr-only span 두 곳에 렌더되므로 getAllByText 사용
    const elements = screen.getAllByText('저장 중...')
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })

  it('variant=inline 이면 배경 오버레이가 없습니다', () => {
    const { container } = render(<LoadingOverlay show variant="inline" message="업로드 중" />)
    // fixed 또는 absolute inset 클래스가 없어야 함
    expect(container.querySelector('.fixed')).toBeNull()
    expect(container.querySelector('.absolute')).toBeNull()
  })

  it('variant=fullscreen 이면 fixed inset-0 클래스를 가집니다', () => {
    const { container } = render(<LoadingOverlay show variant="fullscreen" />)
    const overlay = container.querySelector('.fixed')
    expect(overlay).toBeInTheDocument()
  })

  it('variant=panel 이면 absolute inset-0 클래스를 가집니다', () => {
    const { container } = render(<LoadingOverlay show variant="panel" />)
    const overlay = container.querySelector('.absolute')
    expect(overlay).toBeInTheDocument()
  })

  it('sr-only 스크린리더 텍스트가 있습니다', () => {
    render(<LoadingOverlay show message="PDF 변환 중..." />)
    // sr-only 요소에 메시지가 있음
    const srText = document.querySelector('.sr-only')
    expect(srText?.textContent).toBe('PDF 변환 중...')
  })

  it('message 없을 때 sr-only 에 기본 텍스트가 있습니다', () => {
    render(<LoadingOverlay show />)
    const srText = document.querySelector('.sr-only')
    expect(srText?.textContent).toBe('로딩 중')
  })

  it('axe a11y 위반이 없습니다 (fullscreen)', async () => {
    const { container } = render(<LoadingOverlay show message="로딩 중..." variant="fullscreen" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('axe a11y 위반이 없습니다 (inline)', async () => {
    const { container } = render(<LoadingOverlay show variant="inline" message="저장 중" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
