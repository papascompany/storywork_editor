/**
 * 더비맨 사례 페이지 테스트 (/showcase/derbyman)
 */

import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/showcase/derbyman',
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string; [k: string]: unknown }) => (
    <img src={src} alt={alt} />
  ),
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

import DerbymanPage from '../../app/showcase/derbyman/page'

describe('더비맨 사례 페이지 (/showcase/derbyman)', () => {
  it('Hero 헤드라인이 렌더링된다', () => {
    render(<DerbymanPage />)
    // 더비맨이 여러 곳에 등장하므로 h1 안에서 찾기
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('더비맨')
  })

  it('Hero subhead — "5분 만에 완성" 가 렌더링된다', () => {
    render(<DerbymanPage />)
    expect(screen.getByText(/5분/)).toBeInTheDocument()
  })

  it('캐릭터 설명이 렌더링된다', () => {
    render(<DerbymanPage />)
    expect(screen.getByText(/비밀스런 만화 작가/)).toBeInTheDocument()
  })

  it('4컷 콘티 — CUT 1 이 렌더링된다', () => {
    render(<DerbymanPage />)
    expect(screen.getByText('CUT 1')).toBeInTheDocument()
  })

  it('4컷 콘티 — 모든 4컷이 렌더링된다', () => {
    render(<DerbymanPage />)
    expect(screen.getByText('CUT 1')).toBeInTheDocument()
    expect(screen.getByText('CUT 2')).toBeInTheDocument()
    expect(screen.getByText('CUT 3')).toBeInTheDocument()
    expect(screen.getByText('CUT 4')).toBeInTheDocument()
  })

  it('4컷 제목이 렌더링된다', () => {
    render(<DerbymanPage />)
    expect(screen.getByText('월요일 아침')).toBeInTheDocument()
    expect(screen.getByText('점심시간')).toBeInTheDocument()
    expect(screen.getByText('퇴근 후 카페')).toBeInTheDocument()
    expect(screen.getByText('주말, 책 도착')).toBeInTheDocument()
  })

  it('제작 과정 STEP 1 — 대본 작성이 렌더링된다', () => {
    render(<DerbymanPage />)
    expect(screen.getByText('대본 작성')).toBeInTheDocument()
  })

  it('제작 과정 STEP 2 — AI 장면 분리가 렌더링된다', () => {
    render(<DerbymanPage />)
    expect(screen.getByText(/AI가 장면을 나눕니다/)).toBeInTheDocument()
  })

  it('제작 과정 STEP 3 — 포즈 자동 배치가 렌더링된다', () => {
    render(<DerbymanPage />)
    expect(screen.getByText(/포즈가 자동으로 배치됩니다/)).toBeInTheDocument()
  })

  it('제작 과정 STEP 4 — PDF 출판이 렌더링된다', () => {
    render(<DerbymanPage />)
    expect(screen.getByText(/PDF로 출판, 인쇄소로/)).toBeInTheDocument()
  })

  it('Final CTA — "당신의 이야기는" 이 렌더링된다', () => {
    render(<DerbymanPage />)
    expect(screen.getByText(/당신의 이야기는/)).toBeInTheDocument()
  })

  it('Final CTA — "내 콘티 시작하기" 링크가 /editor 로 연결된다', () => {
    render(<DerbymanPage />)
    const ctas = screen.getAllByRole('link', { name: /내 콘티 시작하기/ })
    expect(ctas.length).toBeGreaterThan(0)
    expect(ctas[0]).toHaveAttribute('href', '/editor')
  })

  it('Header와 Footer가 렌더링된다', () => {
    render(<DerbymanPage />)
    const logos = screen.getAllByText('StoryWork')
    expect(logos.length).toBeGreaterThan(0)
    expect(screen.getByText(/All rights reserved/)).toBeInTheDocument()
  })
})
