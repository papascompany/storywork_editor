/**
 * /faq 페이지 + faq-data 단일 소스 검증 (BOARD-06)
 */
import { render, screen, within } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import FaqPage from '@/app/faq/page'
import { FAQ_CATEGORIES, FEATURED_FAQS } from '@/lib/faq-data'

// Header/Footer 는 DB(company-info) 의존 → 가벼운 mock (vi.mock 은 hoisting 됨)
vi.mock('@/components/marketing/Header', () => ({ Header: () => <header /> }))
vi.mock('@/components/marketing/Footer', () => ({ Footer: () => <footer /> }))

describe('faq-data (단일 소스)', () => {
  it('카테고리마다 1개 이상 항목 + 모든 항목에 q/a', () => {
    expect(FAQ_CATEGORIES.length).toBeGreaterThanOrEqual(3)
    for (const c of FAQ_CATEGORIES) {
      expect(c.items.length).toBeGreaterThan(0)
      for (const i of c.items) {
        expect(i.q.length).toBeGreaterThan(0)
        expect(i.a.length).toBeGreaterThan(0)
      }
    }
  })

  it('FEATURED_FAQS 는 featured=true 만 + 최소 3개', () => {
    expect(FEATURED_FAQS.length).toBeGreaterThanOrEqual(3)
    const all = FAQ_CATEGORIES.flatMap((c) => c.items)
    for (const f of FEATURED_FAQS) {
      expect(all.find((x) => x.q === f.q)?.featured).toBe(true)
    }
  })

  it('질문 중복 없음', () => {
    const qs = FAQ_CATEGORIES.flatMap((c) => c.items.map((i) => i.q))
    expect(new Set(qs).size).toBe(qs.length)
  })
})

describe('FaqPage 렌더', () => {
  it('h1 + 모든 카테고리 섹션(앵커) + 전체 질문 렌더', () => {
    render(<FaqPage />)
    expect(screen.getByRole('heading', { level: 1, name: '자주 묻는 질문' })).toBeDefined()

    for (const c of FAQ_CATEGORIES) {
      // 섹션 앵커 id 존재
      const section = document.getElementById(c.id)
      expect(section).not.toBeNull()
      // 카테고리 라벨이 chip + 섹션 제목 둘 다 → 최소 1회 이상
      expect(screen.getAllByText(c.label).length).toBeGreaterThanOrEqual(1)
    }

    // 전체 질문 수만큼 <summary> 렌더
    const totalQ = FAQ_CATEGORIES.reduce((n, c) => n + c.items.length, 0)
    const summaries = document.querySelectorAll('summary')
    expect(summaries.length).toBe(totalQ)
  })

  it('FAQPage JSON-LD 구조화 데이터 포함', () => {
    render(<FaqPage />)
    const ld = document.querySelector('script[type="application/ld+json"]')
    expect(ld).not.toBeNull()
    const parsed = JSON.parse(ld?.textContent ?? '{}') as { '@type': string; mainEntity: unknown[] }
    expect(parsed['@type']).toBe('FAQPage')
    expect(parsed.mainEntity.length).toBe(FAQ_CATEGORIES.reduce((n, c) => n + c.items.length, 0))
  })

  it('카테고리 앵커 네비 링크가 각 섹션을 가리킨다', () => {
    render(<FaqPage />)
    const nav = screen.getByRole('navigation', { name: 'FAQ 카테고리' })
    for (const c of FAQ_CATEGORIES) {
      const link = within(nav).getByText(c.label).closest('a')
      expect(link?.getAttribute('href')).toBe(`#${c.id}`)
    }
  })
})
