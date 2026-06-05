/**
 * 마케팅 랜딩 페이지 테스트 (/)
 *
 * - Hero 텍스트 렌더링
 * - CTA 링크 존재 + href 확인
 * - Marquee strip 존재
 * - 컬러블록 섹션 (cream/lime/navy/coral) 존재
 * - Footer 존재
 */

import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

// next/navigation mock
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}))

// next/link mock: <Link href="..."> → <a href="...">
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

// next/image mock
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string; [k: string]: unknown }) => (
    <img src={src} alt={alt} />
  ),
}))

// shared-ui mock
vi.mock('@storywork/ui', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetClose: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Footer 는 async RSC — jsdom 환경에서 async Server Component 는 Suspense 를 유발한다.
// React 18 jsdom 에서 async RSC 를 동기 render 로 실행하면 빈 트리를 반환하므로
// Footer 를 동기 stub 으로 교체해 렌더 블로킹을 방지한다.
vi.mock('../../components/marketing/Footer', () => ({
  Footer: () => (
    <footer data-testid="footer-stub">
      <span>All rights reserved</span>
    </footer>
  ),
}))

import LandingPage from '../../app/page'

describe('랜딩 페이지 (/)', () => {
  it('Hero 헤드라인이 렌더링된다', () => {
    render(<LandingPage />)
    expect(screen.getByText(/대본만 쓰세요/)).toBeInTheDocument()
  })

  it('Eyebrow 가 렌더링된다', () => {
    render(<LandingPage />)
    expect(screen.getByText('STORYWORK')).toBeInTheDocument()
  })

  it('Hero subhead 가 렌더링된다', () => {
    render(<LandingPage />)
    expect(screen.getByText(/1,270\+ 포즈 라이브러리/)).toBeInTheDocument()
  })

  it('"무료로 시작하기" CTA 가 /editor 로 링크된다', () => {
    render(<LandingPage />)
    const ctas = screen.getAllByRole('link', { name: /무료로 시작하기/ })
    expect(ctas.length).toBeGreaterThan(0)
    expect(ctas[0]).toHaveAttribute('href', '/editor')
  })

  it('"데모 보기" CTA 가 /features 로 링크된다', () => {
    render(<LandingPage />)
    const demoLink = screen.getByRole('link', { name: /데모 보기/ })
    expect(demoLink).toHaveAttribute('href', '/features')
  })

  it('"지금 시작하기" CTA 가 존재한다', () => {
    render(<LandingPage />)
    const startLinks = screen.getAllByRole('link', { name: /지금 시작하기/ })
    expect(startLinks.length).toBeGreaterThan(0)
  })

  it('Feature 1 제목이 렌더링된다', () => {
    render(<LandingPage />)
    expect(screen.getByText(/캔바도 어렵다면/)).toBeInTheDocument()
  })

  it('Feature 2 (AI 배치) 제목이 렌더링된다', () => {
    render(<LandingPage />)
    expect(screen.getByText(/대본 → 페이지, 30초/)).toBeInTheDocument()
  })

  it('Feature 3 (포즈 라이브러리) 제목이 렌더링된다', () => {
    render(<LandingPage />)
    expect(screen.getByText(/1,270\+ 포즈, 누구나/)).toBeInTheDocument()
  })

  it('Feature 4 (PDF 출판) 제목이 렌더링된다', () => {
    render(<LandingPage />)
    expect(screen.getByText(/책으로 출판까지, 한 번에/)).toBeInTheDocument()
  })

  it('히어로 4컷 더미맨 카드가 렌더링된다', () => {
    render(<LandingPage />)
    const storyboard = screen.getByLabelText('더미맨의 월요일 4컷 미리보기')
    expect(storyboard).toBeInTheDocument()
  })

  it('히어로 카드가 /showcase/derbyman 으로 링크된다', () => {
    render(<LandingPage />)
    const caseLink = screen.getByLabelText('사례 자세히 보기 — 더미맨의 월요일')
    expect(caseLink).toHaveAttribute('href', '/showcase/derbyman')
  })

  it('히어로 보조 CTA "사례 자세히 보기" 가 렌더링된다', () => {
    render(<LandingPage />)
    expect(screen.getByText(/사례 자세히 보기/)).toBeInTheDocument()
  })

  it('Showcase teaser 가 렌더링된다', () => {
    render(<LandingPage />)
    expect(screen.getByText(/더미맨의 짧은 콘티/)).toBeInTheDocument()
  })

  it('Final CTA "먼저 만들어 보세요" 가 렌더링된다', () => {
    render(<LandingPage />)
    expect(screen.getByText(/먼저 만들어 보세요/)).toBeInTheDocument()
  })

  it('Header 가 렌더링된다 (StoryWork 로고)', () => {
    render(<LandingPage />)
    const logos = screen.getAllByText('StoryWork')
    expect(logos.length).toBeGreaterThan(0)
  })

  it('Footer 가 렌더링된다 (저작권 텍스트)', () => {
    render(<LandingPage />)
    expect(screen.getByText(/All rights reserved/)).toBeInTheDocument()
  })

  it('Marquee strip 아이템이 렌더링된다', () => {
    render(<LandingPage />)
    // aria-hidden 요소지만 텍스트 접근 가능
    const marqueeItems = screen.queryAllByText(/POD 인쇄/)
    expect(marqueeItems.length).toBeGreaterThan(0)
  })
})
