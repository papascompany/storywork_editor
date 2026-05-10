/**
 * 기능 소개 페이지 테스트 (/features)
 */

import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/features',
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

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string; [k: string]: unknown }) => (
    <img src={src} alt={alt} />
  ),
}))

import FeaturesPage from '../../app/features/page'

describe('기능 소개 페이지 (/features)', () => {
  it('Hero 헤드라인이 렌더링된다', () => {
    render(<FeaturesPage />)
    expect(screen.getByText(/콘티에 필요한 것만/)).toBeInTheDocument()
  })

  it('Hero 서브텍스트가 렌더링된다', () => {
    render(<FeaturesPage />)
    expect(screen.getByText(/콘티 전용 편집기/)).toBeInTheDocument()
  })

  it('Feature 1 — 편집기 한눈에 섹션이 렌더링된다', () => {
    render(<FeaturesPage />)
    expect(screen.getByText(/편집기 한눈에/)).toBeInTheDocument()
  })

  it('Feature 2 — AI 자동 배치 섹션이 렌더링된다 (#ai-layout)', () => {
    render(<FeaturesPage />)
    expect(screen.getByText(/대본 → 30초 → 페이지/)).toBeInTheDocument()
  })

  it('Feature 3 — 포즈 라이브러리 섹션이 렌더링된다', () => {
    render(<FeaturesPage />)
    expect(screen.getByText(/1,270\+ 포즈 검색/)).toBeInTheDocument()
  })

  it('Feature 4 — PDF 출판 섹션이 렌더링된다', () => {
    render(<FeaturesPage />)
    expect(screen.getByText(/인쇄소 사양 PDF/)).toBeInTheDocument()
  })

  it('Feature 5 — 모바일 섹션이 렌더링된다', () => {
    render(<FeaturesPage />)
    expect(screen.getByText(/모바일에서도 1급/)).toBeInTheDocument()
  })

  it('Final CTA — 편집기 열기 링크가 /editor 로 연결된다', () => {
    render(<FeaturesPage />)
    const ctas = screen.getAllByRole('link', { name: /편집기 열기/ })
    expect(ctas.length).toBeGreaterThan(0)
    expect(ctas[0]).toHaveAttribute('href', '/editor')
  })

  it('EDITOR OVERVIEW eyebrow 가 렌더링된다', () => {
    render(<FeaturesPage />)
    expect(screen.getByText('EDITOR OVERVIEW')).toBeInTheDocument()
  })

  it('AI AUTO-LAYOUT eyebrow 가 렌더링된다', () => {
    render(<FeaturesPage />)
    expect(screen.getByText('AI AUTO-LAYOUT')).toBeInTheDocument()
  })

  it('PDF EXPORT eyebrow 가 렌더링된다', () => {
    render(<FeaturesPage />)
    expect(screen.getByText('PDF EXPORT')).toBeInTheDocument()
  })

  it('Header와 Footer가 렌더링된다', () => {
    render(<FeaturesPage />)
    const logos = screen.getAllByText('StoryWork')
    expect(logos.length).toBeGreaterThan(0)
    expect(screen.getByText(/All rights reserved/)).toBeInTheDocument()
  })
})
