/**
 * 서비스 소개 페이지 테스트 (/intro)
 */

import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/intro',
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
    [k: string]: unknown
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('@storywork/ui', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetClose: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import IntroPage from '../../app/intro/page'

describe('서비스 소개 페이지 (/intro)', () => {
  it('Hero 헤드라인이 렌더링된다', () => {
    render(<IntroPage />)
    expect(screen.getByText(/스토리는 머릿속에 있어요/)).toBeInTheDocument()
  })

  it('Hero 서브헤드가 렌더링된다', () => {
    render(<IntroPage />)
    expect(screen.getByText(/그 어려움을 없애려고 만들었습니다/)).toBeInTheDocument()
  })

  it('Section 1 — 왜 만들었나 텍스트가 렌더링된다', () => {
    render(<IntroPage />)
    expect(screen.getByText(/그림을 못 그려도/)).toBeInTheDocument()
  })

  it('Section 2 — 일반 사용자 카드가 렌더링된다', () => {
    render(<IntroPage />)
    expect(screen.getByText('일반 사용자')).toBeInTheDocument()
  })

  it('Section 2 — 크리에이터 카드가 렌더링된다', () => {
    render(<IntroPage />)
    expect(screen.getByText('크리에이터')).toBeInTheDocument()
  })

  it('Section 2 — 출판 워크플로 카드가 렌더링된다', () => {
    render(<IntroPage />)
    expect(screen.getByText('출판 워크플로')).toBeInTheDocument()
  })

  it('Section 3 — 차별점 4개가 렌더링된다', () => {
    render(<IntroPage />)
    // 각 텍스트가 여러 곳에 등장할 수 있으므로 getAllByText 사용
    expect(screen.getAllByText('콘티 전용').length).toBeGreaterThan(0)
    expect(screen.getAllByText('AI 자동 배치').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1,270+ 포즈').length).toBeGreaterThan(0)
    expect(screen.getAllByText('POD 인쇄').length).toBeGreaterThan(0)
  })

  it('Final CTA — "3분 만에 첫 페이지" 가 렌더링된다', () => {
    render(<IntroPage />)
    expect(screen.getByText(/3분 만에/)).toBeInTheDocument()
  })

  it('Final CTA — "지금 시작하기" 링크가 /editor 로 연결된다', () => {
    render(<IntroPage />)
    const ctas = screen.getAllByRole('link', { name: /지금 시작하기/ })
    const editorCtas = ctas.filter((el) => el.getAttribute('href') === '/editor')
    expect(editorCtas.length).toBeGreaterThan(0)
  })

  it('Header와 Footer가 렌더링된다', () => {
    render(<IntroPage />)
    const logos = screen.getAllByText('StoryWork')
    expect(logos.length).toBeGreaterThan(0)
    expect(screen.getByText(/All rights reserved/)).toBeInTheDocument()
  })
})
