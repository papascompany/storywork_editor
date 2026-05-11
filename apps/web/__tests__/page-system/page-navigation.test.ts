/**
 * page-navigation.test.ts — 페이지 네비게이션 단위 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest'

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

function setupProject(pageCount = 5) {
  usePageStore.setState({ project: null })
  usePageStore.getState().createProject(FORMAT, 'preset:square', '테스트')
  for (let i = 1; i < pageCount; i++) {
    usePageStore.getState().addPage()
  }
  usePageStore.getState().setCurrentPage(0)
}

describe('페이지 네비게이션 — 이전/다음', () => {
  beforeEach(() => setupProject(5))

  it('다음 페이지로 이동 (setCurrentPage(idx+1))', () => {
    usePageStore.getState().setCurrentPage(1)
    expect(usePageStore.getState().project?.currentPageIndex).toBe(1)
  })

  it('이전 페이지로 이동 (setCurrentPage(idx-1))', () => {
    usePageStore.getState().setCurrentPage(3)
    usePageStore.getState().setCurrentPage(2)
    expect(usePageStore.getState().project?.currentPageIndex).toBe(2)
  })

  it('첫 페이지에서 이전 이동 시 0 유지', () => {
    usePageStore.getState().setCurrentPage(0)
    usePageStore.getState().setCurrentPage(-1)
    expect(usePageStore.getState().project?.currentPageIndex).toBe(0)
  })

  it('마지막 페이지에서 다음 이동 시 마지막 유지', () => {
    const total = usePageStore.getState().project?.pages.length ?? 5
    usePageStore.getState().setCurrentPage(total - 1)
    usePageStore.getState().setCurrentPage(total)
    expect(usePageStore.getState().project?.currentPageIndex).toBe(total - 1)
  })
})

describe('페이지 네비게이션 — 직접 이동', () => {
  beforeEach(() => setupProject(5))

  it('임의 페이지로 직접 이동 (index 3)', () => {
    usePageStore.getState().setCurrentPage(3)
    expect(usePageStore.getState().project?.currentPageIndex).toBe(3)
  })

  it('5개 페이지 중 각 인덱스로 이동 가능', () => {
    for (let i = 0; i < 5; i++) {
      usePageStore.getState().setCurrentPage(i)
      expect(usePageStore.getState().project?.currentPageIndex).toBe(i)
    }
  })
})

describe('페이지 네비게이션 — 총 페이지 수', () => {
  beforeEach(() => {
    usePageStore.setState({ project: null })
    usePageStore.getState().createProject(FORMAT, 'preset:square', '테스트')
  })

  it('초기 1개 페이지', () => {
    expect(usePageStore.getState().project?.pages).toHaveLength(1)
  })

  it('addPage 후 2개 페이지', () => {
    usePageStore.getState().addPage()
    expect(usePageStore.getState().project?.pages).toHaveLength(2)
  })

  it('removePage 후 1개 페이지', () => {
    usePageStore.getState().addPage()
    const pages = usePageStore.getState().project?.pages
    const lastId = pages?.[1]?.id
    if (!lastId) throw new Error('lastId should exist')
    usePageStore.getState().removePage(lastId)
    expect(usePageStore.getState().project?.pages).toHaveLength(1)
  })
})
