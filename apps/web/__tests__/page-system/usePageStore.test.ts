/**
 * usePageStore.test.ts — 페이지 스토어 액션 단위 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest'

import { usePageStore } from '../../components/editor/store/usePageStore'
import type { PageFormat } from '../../components/editor/store/usePageStore'

const SAMPLE_FORMAT: PageFormat = {
  name: '정사각 1:1',
  widthMm: 150,
  heightMm: 150,
  dpi: 300,
  bleedMm: 3,
  safeMm: 5,
}

function resetStore() {
  usePageStore.setState({ project: null })
}

describe('usePageStore — createProject', () => {
  beforeEach(resetStore)

  it('createProject: 프로젝트와 1개 페이지가 생성된다', () => {
    usePageStore.getState().createProject(SAMPLE_FORMAT, 'preset:square', '테스트 콘티')
    const { project } = usePageStore.getState()
    expect(project).not.toBeNull()
    expect(project?.title).toBe('테스트 콘티')
    expect(project?.pages).toHaveLength(1)
    expect(project?.currentPageIndex).toBe(0)
  })

  it('createProject: 기본 제목이 "새 콘티 ..."로 시작한다', () => {
    usePageStore.getState().createProject(SAMPLE_FORMAT, 'preset:square')
    const { project } = usePageStore.getState()
    expect(project?.title).toMatch(/^새 콘티/)
  })

  it('createProject: format 정보가 저장된다', () => {
    usePageStore.getState().createProject(SAMPLE_FORMAT, 'preset:square', '테스트')
    const { project } = usePageStore.getState()
    expect(project?.format.widthMm).toBe(150)
    expect(project?.format.heightMm).toBe(150)
    expect(project?.formatId).toBe('preset:square')
  })
})

describe('usePageStore — addPage', () => {
  beforeEach(() => {
    resetStore()
    usePageStore.getState().createProject(SAMPLE_FORMAT, 'preset:square', '테스트')
  })

  it('addPage: 페이지가 1개 더 추가된다', () => {
    usePageStore.getState().addPage()
    const { project } = usePageStore.getState()
    expect(project?.pages).toHaveLength(2)
  })

  it('addPage: currentPageIndex가 새 페이지로 이동한다', () => {
    usePageStore.getState().addPage()
    const { project } = usePageStore.getState()
    expect(project?.currentPageIndex).toBe(1)
  })

  it('addPage: afterIndex 옵션으로 중간 삽입이 가능하다', () => {
    usePageStore.getState().addPage()
    usePageStore.getState().addPage()
    // pages: [0, 1, 2], 0 뒤에 삽입
    usePageStore.getState().addPage({ afterIndex: 0 })
    const { project } = usePageStore.getState()
    expect(project?.pages).toHaveLength(4)
    expect(project?.currentPageIndex).toBe(1)
  })

  it('addPage: index가 0-based로 재계산된다', () => {
    usePageStore.getState().addPage()
    usePageStore.getState().addPage()
    const { project } = usePageStore.getState()
    project?.pages.forEach((p, i) => {
      expect(p.index).toBe(i)
    })
  })
})

describe('usePageStore — removePage', () => {
  beforeEach(() => {
    resetStore()
    usePageStore.getState().createProject(SAMPLE_FORMAT, 'preset:square', '테스트')
    usePageStore.getState().addPage()
    usePageStore.getState().addPage()
    // 3개 페이지, currentPageIndex = 2
  })

  it('removePage: 지정 페이지가 삭제된다', () => {
    const { project } = usePageStore.getState()
    const firstPageId = project?.pages[0]?.id
    if (!firstPageId) throw new Error('firstPageId should exist')
    usePageStore.getState().removePage(firstPageId)
    expect(usePageStore.getState().project?.pages).toHaveLength(2)
  })

  it('removePage: 마지막 1개 페이지는 삭제할 수 없다', () => {
    // 1개만 남도록 삭제
    let state = usePageStore.getState()
    const id1 = state.project?.pages[1]?.id
    const id2 = state.project?.pages[2]?.id
    if (id1) usePageStore.getState().removePage(id1)
    if (id2) usePageStore.getState().removePage(id2)

    state = usePageStore.getState()
    const lastId = state.project?.pages[0]?.id
    if (!lastId) throw new Error('lastId should exist')
    usePageStore.getState().removePage(lastId)
    expect(usePageStore.getState().project?.pages).toHaveLength(1)
  })

  it('removePage: currentPageIndex가 범위 내로 조정된다', () => {
    // pages[2] 가 currentPage, pages[2] 삭제 → currentPageIndex = 1
    const { project } = usePageStore.getState()
    const lastId = project?.pages[2]?.id
    if (!lastId) throw new Error('lastId should exist')
    usePageStore.getState().removePage(lastId)
    expect(usePageStore.getState().project?.currentPageIndex).toBe(1)
  })

  it('removePage: 삭제 후 index 재계산이 된다', () => {
    const { project } = usePageStore.getState()
    const firstId = project?.pages[0]?.id
    if (!firstId) throw new Error('firstId should exist')
    usePageStore.getState().removePage(firstId)
    usePageStore.getState().project?.pages.forEach((p, i) => {
      expect(p.index).toBe(i)
    })
  })
})

describe('usePageStore — duplicatePage', () => {
  beforeEach(() => {
    resetStore()
    usePageStore.getState().createProject(SAMPLE_FORMAT, 'preset:square', '테스트')
  })

  it('duplicatePage: 페이지가 복제된다', () => {
    const { project } = usePageStore.getState()
    const firstId = project?.pages[0]?.id
    if (!firstId) throw new Error('firstId should exist')

    // fabricJson 설정
    usePageStore.getState().updateCurrentPageJson({ test: 'data' })

    usePageStore.getState().duplicatePage(firstId)
    const newState = usePageStore.getState()
    expect(newState.project?.pages).toHaveLength(2)
    expect(newState.project?.currentPageIndex).toBe(1)
  })

  it('duplicatePage: 복제된 페이지가 원본의 fabricJson을 가진다', () => {
    usePageStore.getState().updateCurrentPageJson({ hello: 'world' })
    const { project } = usePageStore.getState()
    const firstId = project?.pages[0]?.id
    if (!firstId) throw new Error('firstId should exist')

    usePageStore.getState().duplicatePage(firstId)
    const newState = usePageStore.getState()
    const duplicated = newState.project?.pages[1]
    expect(duplicated?.fabricJson).toEqual({ hello: 'world' })
  })

  it('duplicatePage: 복제된 페이지는 새 id를 가진다', () => {
    const { project } = usePageStore.getState()
    const firstId = project?.pages[0]?.id
    if (!firstId) throw new Error('firstId should exist')

    usePageStore.getState().duplicatePage(firstId)
    const newState = usePageStore.getState()
    const pages = newState.project?.pages
    expect(pages?.[0]?.id).not.toBe(pages?.[1]?.id)
  })
})

describe('usePageStore — movePage', () => {
  beforeEach(() => {
    resetStore()
    usePageStore.getState().createProject(SAMPLE_FORMAT, 'preset:square', '테스트')
    usePageStore.getState().addPage()
    usePageStore.getState().addPage()
    // pages: [0, 1, 2]
  })

  it('movePage: 페이지 순서가 변경된다', () => {
    const beforeIds = usePageStore.getState().project?.pages.map((p) => p.id)
    usePageStore.getState().movePage(0, 2)
    const afterIds = usePageStore.getState().project?.pages.map((p) => p.id)
    // index 0 이 index 2 로 이동
    expect(afterIds?.[2]).toBe(beforeIds?.[0])
  })

  it('movePage: index 재계산이 된다', () => {
    usePageStore.getState().movePage(0, 2)
    usePageStore.getState().project?.pages.forEach((p, i) => {
      expect(p.index).toBe(i)
    })
  })

  it('movePage: 같은 index 이동 시 변경 없음', () => {
    const beforeIds = usePageStore.getState().project?.pages.map((p) => p.id)
    usePageStore.getState().movePage(1, 1)
    const afterIds = usePageStore.getState().project?.pages.map((p) => p.id)
    expect(afterIds).toEqual(beforeIds)
  })
})

describe('usePageStore — setCurrentPage', () => {
  beforeEach(() => {
    resetStore()
    usePageStore.getState().createProject(SAMPLE_FORMAT, 'preset:square', '테스트')
    usePageStore.getState().addPage()
    usePageStore.getState().addPage()
  })

  it('setCurrentPage: 지정 인덱스로 이동한다', () => {
    usePageStore.getState().setCurrentPage(2)
    expect(usePageStore.getState().project?.currentPageIndex).toBe(2)
  })

  it('setCurrentPage: 범위 초과 시 마지막 페이지로 clamping', () => {
    usePageStore.getState().setCurrentPage(99)
    expect(usePageStore.getState().project?.currentPageIndex).toBe(2)
  })

  it('setCurrentPage: 음수 시 0으로 clamping', () => {
    usePageStore.getState().setCurrentPage(-1)
    expect(usePageStore.getState().project?.currentPageIndex).toBe(0)
  })
})

describe('usePageStore — updateCurrentPageJson', () => {
  beforeEach(() => {
    resetStore()
    usePageStore.getState().createProject(SAMPLE_FORMAT, 'preset:square', '테스트')
  })

  it('updateCurrentPageJson: fabricJson이 저장된다', () => {
    usePageStore.getState().updateCurrentPageJson({ objects: [{ type: 'rect' }] })
    const page = usePageStore.getState().project?.pages[0]
    expect(page?.fabricJson).toEqual({ objects: [{ type: 'rect' }] })
  })

  it('updateCurrentPageJson: updatedAt이 갱신된다', () => {
    const beforeUpdatedAt = usePageStore.getState().project?.pages[0]?.updatedAt ?? 0
    // 시간 차이를 위해 잠깐 대기 (ms 레벨)
    usePageStore.getState().updateCurrentPageJson({ x: 1 })
    const afterUpdatedAt = usePageStore.getState().project?.pages[0]?.updatedAt ?? 0
    expect(afterUpdatedAt).toBeGreaterThanOrEqual(beforeUpdatedAt)
  })
})

describe('usePageStore — renameProject', () => {
  beforeEach(() => {
    resetStore()
    usePageStore.getState().createProject(SAMPLE_FORMAT, 'preset:square', '원래 이름')
  })

  it('renameProject: 프로젝트 이름이 변경된다', () => {
    usePageStore.getState().renameProject('새 이름')
    expect(usePageStore.getState().project?.title).toBe('새 이름')
  })
})

describe('usePageStore — loadProject / closeProject', () => {
  beforeEach(resetStore)

  it('loadProject: 외부 project 객체를 로드한다', () => {
    const externalProject = {
      id: 'ext-1',
      title: '외부 프로젝트',
      formatId: 'preset:b5-novel',
      format: SAMPLE_FORMAT,
      pages: [
        {
          id: 'page-1',
          index: 0,
          fabricJson: { objects: [] },
          updatedAt: Date.now(),
        },
      ],
      currentPageIndex: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    usePageStore.getState().loadProject(externalProject)
    expect(usePageStore.getState().project?.id).toBe('ext-1')
    expect(usePageStore.getState().project?.pages).toHaveLength(1)
  })

  it('closeProject: 프로젝트가 null 이 된다', () => {
    usePageStore.getState().createProject(SAMPLE_FORMAT, 'preset:square', '테스트')
    usePageStore.getState().closeProject()
    expect(usePageStore.getState().project).toBeNull()
  })
})
