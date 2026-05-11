/**
 * page-persistence.test.ts — localStorage 영속화 단위 테스트
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import {
  saveProjectToLocalStorage,
  loadProjectFromLocalStorage,
  loadLatestProject,
  listLocalProjects,
  deleteLocalProject,
  createDebouncedSave,
  PROJECT_STORAGE_KEY_PREFIX,
  PROJECT_INDEX_KEY,
} from '../../components/editor/store/page-persistence'
import type { ProjectData } from '../../components/editor/store/usePageStore'

function makeProject(overrides?: Partial<ProjectData>): ProjectData {
  const now = Date.now()
  return {
    id: 'test-project-1',
    title: '테스트 프로젝트',
    formatId: 'preset:square',
    format: {
      name: '정사각 1:1',
      widthMm: 150,
      heightMm: 150,
      dpi: 300,
      bleedMm: 3,
      safeMm: 5,
    },
    pages: [
      {
        id: 'page-1',
        index: 0,
        fabricJson: { objects: [] },
        updatedAt: now,
      },
    ],
    currentPageIndex: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('saveProjectToLocalStorage / loadProjectFromLocalStorage', () => {
  it('저장 후 동일한 프로젝트를 로드한다', () => {
    const project = makeProject()
    saveProjectToLocalStorage(project)
    const loaded = loadProjectFromLocalStorage(project.id)
    expect(loaded).not.toBeNull()
    expect(loaded?.id).toBe(project.id)
    expect(loaded?.title).toBe(project.title)
  })

  it('존재하지 않는 프로젝트는 null을 반환한다', () => {
    const result = loadProjectFromLocalStorage('nonexistent-id')
    expect(result).toBeNull()
  })

  it('pages 배열이 복원된다', () => {
    const project = makeProject()
    const firstPage = project.pages[0]
    if (!firstPage) throw new Error('firstPage should exist')
    firstPage.fabricJson = { objects: [{ type: 'rect' }] }
    saveProjectToLocalStorage(project)
    const loaded = loadProjectFromLocalStorage(project.id)
    expect(loaded?.pages[0]?.fabricJson).toEqual({ objects: [{ type: 'rect' }] })
  })

  it('저장 키 포맷이 storywork:project:<id>이다', () => {
    const project = makeProject()
    saveProjectToLocalStorage(project)
    const key = `${PROJECT_STORAGE_KEY_PREFIX}${project.id}`
    expect(localStorage.getItem(key)).not.toBeNull()
  })
})

describe('listLocalProjects', () => {
  it('빈 상태에서 빈 배열을 반환한다', () => {
    expect(listLocalProjects()).toEqual([])
  })

  it('저장 후 목록에 나타난다', () => {
    const project = makeProject()
    saveProjectToLocalStorage(project)
    const list = listLocalProjects()
    expect(list).toHaveLength(1)
    expect(list[0]?.id).toBe(project.id)
  })

  it('여러 프로젝트가 최근 수정 순으로 정렬된다', () => {
    const p1 = makeProject({ id: 'proj-1', title: '첫 번째', updatedAt: 1000 })
    const p2 = makeProject({ id: 'proj-2', title: '두 번째', updatedAt: 3000 })
    const p3 = makeProject({ id: 'proj-3', title: '세 번째', updatedAt: 2000 })
    saveProjectToLocalStorage(p1)
    saveProjectToLocalStorage(p2)
    saveProjectToLocalStorage(p3)
    const list = listLocalProjects()
    expect(list[0]?.id).toBe('proj-2') // updatedAt 3000 이 가장 최근
    expect(list[1]?.id).toBe('proj-3') // updatedAt 2000
    expect(list[2]?.id).toBe('proj-1') // updatedAt 1000
  })

  it('인덱스에 메타 정보가 포함된다', () => {
    const project = makeProject()
    saveProjectToLocalStorage(project)
    const list = listLocalProjects()
    expect(list[0]?.formatName).toBe('정사각 1:1')
    expect(list[0]?.pageCount).toBe(1)
  })
})

describe('loadLatestProject', () => {
  it('프로젝트 없으면 null을 반환한다', () => {
    expect(loadLatestProject()).toBeNull()
  })

  it('가장 최근 수정된 프로젝트를 반환한다', () => {
    const p1 = makeProject({ id: 'proj-1', updatedAt: 1000 })
    const p2 = makeProject({ id: 'proj-2', updatedAt: 2000 })
    saveProjectToLocalStorage(p1)
    saveProjectToLocalStorage(p2)
    const latest = loadLatestProject()
    expect(latest).not.toBeNull()
    expect(latest?.id).toBe('proj-2')
  })
})

describe('deleteLocalProject', () => {
  it('삭제 후 로드할 수 없다', () => {
    const project = makeProject()
    saveProjectToLocalStorage(project)
    deleteLocalProject(project.id)
    expect(loadProjectFromLocalStorage(project.id)).toBeNull()
  })

  it('삭제 후 목록에서도 제거된다', () => {
    const project = makeProject()
    saveProjectToLocalStorage(project)
    deleteLocalProject(project.id)
    expect(listLocalProjects()).toHaveLength(0)
  })

  it('인덱스 키가 업데이트된다', () => {
    const p1 = makeProject({ id: 'proj-1' })
    const p2 = makeProject({ id: 'proj-2' })
    saveProjectToLocalStorage(p1)
    saveProjectToLocalStorage(p2)
    deleteLocalProject('proj-1')
    const list = listLocalProjects()
    expect(list).toHaveLength(1)
    expect(list[0]?.id).toBe('proj-2')
  })
})

describe('createDebouncedSave', () => {
  it('flush는 즉시 저장한다', () => {
    const saver = createDebouncedSave(60000)
    const project = makeProject()
    saver.flush(project)
    const loaded = loadProjectFromLocalStorage(project.id)
    expect(loaded?.id).toBe(project.id)
  })

  it('cancel 후 schedule이 실행되지 않는다', async () => {
    const saver = createDebouncedSave(50)
    const project = makeProject()
    saver.schedule(project)
    saver.cancel()
    // 100ms 대기 후에도 저장되지 않아야 함
    await new Promise((r) => setTimeout(r, 100))
    expect(loadProjectFromLocalStorage(project.id)).toBeNull()
  })

  it('인덱스 키가 저장된다', () => {
    const saver = createDebouncedSave(60000)
    const project = makeProject()
    saver.flush(project)
    const raw = localStorage.getItem(PROJECT_INDEX_KEY)
    expect(raw).not.toBeNull()
  })
})
