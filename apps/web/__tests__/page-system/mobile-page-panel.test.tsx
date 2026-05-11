/**
 * mobile-page-panel.test.tsx
 *
 * FOLLOWUP-46: MobileBottomSheet "페이지" 탭 → PagePanel 노출 + 액션 동작
 */

import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { MobileBottomSheet } from '../../components/editor/MobileBottomSheet'
import { usePageStore } from '../../components/editor/store/usePageStore'
import type { PageFormat } from '../../components/editor/store/usePageStore'

// ─── 픽스처 ───────────────────────────────────────────────────────────────────

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

const DEFAULT_PROPS = {
  activeTool: 'select' as const,
  onToolChange: vi.fn(),
  onAddPose: vi.fn(),
  onAddBackground: vi.fn(),
  selectionProps: null,
  layerTree: null,
  canvas: null,
  history: null,
  selectedIds: [],
  onPageChange: vi.fn(),
}

// ─── 헬퍼: "페이지" 탭 찾기 ──────────────────────────────────────────────────

function findPagesTab() {
  // role=tab + name contains "페이지"
  return screen.getByRole('tab', { name: '페이지' })
}

// ─── 테스트 ───────────────────────────────────────────────────────────────────

describe('MobileBottomSheet — "페이지" 탭 존재', () => {
  beforeEach(() => {
    setupProject(3)
  })

  it('"페이지" 탭 버튼이 렌더된다', () => {
    render(<MobileBottomSheet {...DEFAULT_PROPS} />)
    expect(findPagesTab()).toBeInTheDocument()
  })

  it('"페이지" 탭을 클릭하면 PagePanel 이 노출된다', () => {
    render(<MobileBottomSheet {...DEFAULT_PROPS} />)
    fireEvent.click(findPagesTab())

    // PagePanel data-testid="page-panel"
    expect(screen.getByTestId('page-panel')).toBeInTheDocument()
  })

  it('"페이지" 탭 클릭 후 시트가 열린다 (peek → half)', () => {
    render(<MobileBottomSheet {...DEFAULT_PROPS} />)
    const sheet = screen.getByTestId('mobile-bottom-sheet')
    // 초기 상태: peek
    expect(sheet.getAttribute('data-snap')).toBe('peek')

    fireEvent.click(findPagesTab())
    // "페이지" 탭 클릭 → half 이상으로 열려야 함
    expect(sheet.getAttribute('data-snap')).not.toBe('peek')
  })
})

describe('MobileBottomSheet — PagePanel 액션', () => {
  beforeEach(() => {
    setupProject(3)
  })

  it('PagePanel 의 "페이지 추가" 버튼이 동작한다', () => {
    render(<MobileBottomSheet {...DEFAULT_PROPS} />)
    fireEvent.click(findPagesTab())

    // page-add-button 클릭
    const addBtn = screen.getByTestId('page-add-button')
    fireEvent.click(addBtn)

    // 페이지 수 3 → 4
    expect(usePageStore.getState().project?.pages).toHaveLength(4)
  })

  it('PagePanel 카드 클릭 시 onPageChange 콜백 호출', () => {
    const onPageChange = vi.fn()
    render(<MobileBottomSheet {...DEFAULT_PROPS} onPageChange={onPageChange} />)
    fireEvent.click(findPagesTab())

    // 2번째 페이지 카드 버튼
    const pages = usePageStore.getState().project?.pages ?? []
    const secondId = pages[1]?.id
    if (!secondId) throw new Error('secondId should exist')
    fireEvent.click(screen.getByTestId(`page-card-btn-${secondId}`))

    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('프로젝트 없으면 PagePanel 빈 상태 메시지가 표시된다', () => {
    usePageStore.setState({ project: null })
    render(<MobileBottomSheet {...DEFAULT_PROPS} />)
    fireEvent.click(findPagesTab())
    expect(screen.getByTestId('page-panel-empty')).toBeInTheDocument()
  })
})

describe('MobileBottomSheet — 4탭 구조', () => {
  beforeEach(() => {
    setupProject(1)
  })

  it('탭이 4개 렌더된다 (도구/속성/레이어/페이지)', () => {
    render(<MobileBottomSheet {...DEFAULT_PROPS} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(4)
  })

  it('각 탭의 라벨이 올바르다', () => {
    render(<MobileBottomSheet {...DEFAULT_PROPS} />)
    expect(screen.getByRole('tab', { name: '도구' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '속성' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '레이어' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '페이지' })).toBeInTheDocument()
  })
})
