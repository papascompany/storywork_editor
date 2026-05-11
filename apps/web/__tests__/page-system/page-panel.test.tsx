/**
 * page-panel.test.tsx — PagePanel 단위 테스트
 */

import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { PagePanel } from '../../components/editor/page-system/PagePanel'
import { usePageStore } from '../../components/editor/store/usePageStore'
import type { PageFormat } from '../../components/editor/store/usePageStore'

const FORMAT: PageFormat = {
  name: '정사각 1:1',
  widthMm: 150,
  heightMm: 150,
  dpi: 300,
  bleedMm: 3,
  safeMm: 5,
}

function setupProject(pageCount = 3) {
  usePageStore.setState({ project: null })
  usePageStore.getState().createProject(FORMAT, 'preset:square', '테스트')
  for (let i = 1; i < pageCount; i++) {
    usePageStore.getState().addPage()
  }
  usePageStore.getState().setCurrentPage(0)
}

describe('PagePanel — 빈 프로젝트', () => {
  beforeEach(() => {
    usePageStore.setState({ project: null })
  })

  it('프로젝트 없을 때 "프로젝트를 먼저 시작하세요" 메시지 표시', () => {
    render(<PagePanel />)
    expect(screen.getByTestId('page-panel-empty')).toBeInTheDocument()
  })
})

describe('PagePanel — 기본 렌더링', () => {
  beforeEach(() => setupProject(3))

  it('3개 페이지 카드가 렌더링된다', () => {
    render(<PagePanel />)
    const pages = usePageStore.getState().project?.pages ?? []
    pages.forEach((p) => {
      expect(screen.getByTestId(`page-card-${p.id}`)).toBeInTheDocument()
    })
  })

  it('"페이지 추가" 버튼이 보인다', () => {
    render(<PagePanel />)
    expect(screen.getByTestId('page-add-button')).toBeInTheDocument()
  })

  it('현재 페이지 카드에 aria-current="true"가 설정된다', () => {
    render(<PagePanel />)
    const pages = usePageStore.getState().project?.pages ?? []
    const firstId = pages[0]?.id
    if (!firstId) throw new Error('firstId should exist')
    const btn = screen.getByTestId(`page-card-btn-${firstId}`)
    expect(btn.getAttribute('aria-current')).toBe('true')
  })
})

describe('PagePanel — 페이지 전환', () => {
  beforeEach(() => setupProject(3))

  it('카드 클릭 시 setCurrentPage가 호출된다', () => {
    const onPageChange = vi.fn()
    render(<PagePanel onPageChange={onPageChange} />)
    const pages = usePageStore.getState().project?.pages ?? []
    const secondId = pages[1]?.id
    if (!secondId) throw new Error('secondId should exist')
    fireEvent.click(screen.getByTestId(`page-card-btn-${secondId}`))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('2번째 카드 클릭 후 store의 currentPageIndex가 1이 된다', () => {
    render(<PagePanel />)
    const pages = usePageStore.getState().project?.pages ?? []
    const secondId = pages[1]?.id
    if (!secondId) throw new Error('secondId should exist')
    fireEvent.click(screen.getByTestId(`page-card-btn-${secondId}`))
    expect(usePageStore.getState().project?.currentPageIndex).toBe(1)
  })
})

describe('PagePanel — 페이지 추가', () => {
  beforeEach(() => setupProject(1))

  it('"페이지 추가" 클릭 시 페이지가 추가된다', () => {
    render(<PagePanel />)
    fireEvent.click(screen.getByTestId('page-add-button'))
    expect(usePageStore.getState().project?.pages).toHaveLength(2)
  })
})

describe('PagePanel — 페이지 메뉴 (store action 직접 검증)', () => {
  beforeEach(() => setupProject(3))

  it('⋯ 메뉴 버튼이 각 카드에 렌더된다', () => {
    render(<PagePanel />)
    const pages = usePageStore.getState().project?.pages ?? []
    const firstId = pages[0]?.id
    if (!firstId) throw new Error('firstId should exist')
    const menuBtn = screen.getByTestId(`page-card-menu-${firstId}`)
    expect(menuBtn).toBeInTheDocument()
  })

  it('duplicatePage store action: 페이지가 복제된다', () => {
    const pages = usePageStore.getState().project?.pages ?? []
    const firstId = pages[0]?.id
    if (!firstId) throw new Error('firstId should exist')
    usePageStore.getState().duplicatePage(firstId)
    expect(usePageStore.getState().project?.pages).toHaveLength(4)
  })

  it('removePage store action: 페이지가 삭제된다', () => {
    const pages = usePageStore.getState().project?.pages ?? []
    const firstId = pages[0]?.id
    if (!firstId) throw new Error('firstId should exist')
    usePageStore.getState().removePage(firstId)
    expect(usePageStore.getState().project?.pages).toHaveLength(2)
  })

  it('1개 페이지만 남은 경우 removePage가 무시된다', () => {
    usePageStore.setState({ project: null })
    usePageStore.getState().createProject(FORMAT, 'preset:square', '테스트')
    const pages = usePageStore.getState().project?.pages ?? []
    const firstId = pages[0]?.id
    if (!firstId) throw new Error('firstId should exist')
    usePageStore.getState().removePage(firstId)
    // 삭제 불가 → 1개 유지
    expect(usePageStore.getState().project?.pages).toHaveLength(1)
  })
})
