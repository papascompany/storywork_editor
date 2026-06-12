/**
 * usePageStore — 표지 페이지 자동 생성 (FOLLOWUP-COVER-02)
 */
import { beforeEach, describe, expect, it } from 'vitest'

import { usePageStore } from '@/components/editor/store/usePageStore'

const FORMAT = { name: 'B5 단행본', widthMm: 130, heightMm: 200, dpi: 300, bleedMm: 3, safeMm: 5 }

describe('createProject — 표지 옵션', () => {
  beforeEach(() => {
    usePageStore.getState().closeProject()
  })

  it('cover 없이 생성 → 1페이지, cover=null', () => {
    usePageStore.getState().createProject(FORMAT, 'preset-b5-novel', '테스트')
    const p = usePageStore.getState().project
    expect(p?.pages).toHaveLength(1)
    expect(p?.cover ?? null).toBeNull()
  })

  it('cover 옵션 → [표지, 본문] 2페이지 + cover 치수 저장', () => {
    usePageStore
      .getState()
      .createProject(FORMAT, 'preset-b5-novel', '책', { cover: { widthMm: 420, heightMm: 210 } })
    const p = usePageStore.getState().project
    expect(p?.pages).toHaveLength(2)
    expect(p?.pages[0]?.index).toBe(0)
    expect(p?.pages[1]?.index).toBe(1)
    expect(p?.cover).toEqual({ widthMm: 420, heightMm: 210 })
    expect(p?.currentPageIndex).toBe(0)
  })

  it('cover: null 명시 → 일반 생성과 동일', () => {
    usePageStore.getState().createProject(FORMAT, 'preset-b5-novel', '일반', { cover: null })
    const p = usePageStore.getState().project
    expect(p?.pages).toHaveLength(1)
    expect(p?.cover).toBeNull()
  })

  it('loadProject 라운드트립 — cover 보존', () => {
    usePageStore
      .getState()
      .createProject(FORMAT, 'preset-b5-novel', '책', { cover: { widthMm: 408, heightMm: 200 } })
    const saved = usePageStore.getState().project
    if (!saved) throw new Error('project 생성 실패')
    usePageStore.getState().closeProject()
    usePageStore.getState().loadProject(saved)
    expect(usePageStore.getState().project?.cover).toEqual({ widthMm: 408, heightMm: 200 })
  })
})
