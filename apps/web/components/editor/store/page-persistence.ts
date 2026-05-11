/**
 * page-persistence.ts — 프로젝트 localStorage 영속화 헬퍼
 *
 * MVP: localStorage 기반 (서버 영속화는 FOLLOWUP)
 * FOLLOWUP: useAutoSavePage 내에서 fetch POST 추가만으로 서버 영속화 가능
 */

import type { ProjectData } from './usePageStore'

// ─── 상수 ─────────────────────────────────────────────────────────────────────

/** 프로젝트별 localStorage 키 */
export const PROJECT_STORAGE_KEY_PREFIX = 'storywork:project:'

/** 프로젝트 목록 인덱스 키 */
export const PROJECT_INDEX_KEY = 'storywork:project-index'

/** debounce ms */
export const PERSIST_DEBOUNCE_MS = 5000

// ─── 프로젝트 메타 (인덱스용) ────────────────────────────────────────────────

export interface ProjectMeta {
  id: string
  title: string
  formatId: string
  formatName: string
  pageCount: number
  updatedAt: number
  thumbnail?: string // 첫 페이지 썸네일
}

// ─── 저장 ─────────────────────────────────────────────────────────────────────

/**
 * 프로젝트 전체를 localStorage 에 저장
 * key: storywork:project:<id>
 */
export function saveProjectToLocalStorage(project: ProjectData): void {
  try {
    const key = `${PROJECT_STORAGE_KEY_PREFIX}${project.id}`
    localStorage.setItem(key, JSON.stringify(project))

    // 인덱스 업데이트
    const meta: ProjectMeta = {
      id: project.id,
      title: project.title,
      formatId: project.formatId,
      formatName: project.format.name,
      pageCount: project.pages.length,
      updatedAt: project.updatedAt,
      thumbnail: project.pages[0]?.thumbnail,
    }
    updateProjectIndex(meta)
  } catch (e) {
    console.warn('[page-persistence] localStorage 저장 실패:', e)
  }
}

/**
 * 프로젝트 인덱스 업데이트 (메타만 저장)
 */
function updateProjectIndex(meta: ProjectMeta): void {
  try {
    const raw = localStorage.getItem(PROJECT_INDEX_KEY)
    const index: ProjectMeta[] = raw ? (JSON.parse(raw) as ProjectMeta[]) : []

    const existingIdx = index.findIndex((m) => m.id === meta.id)
    if (existingIdx >= 0) {
      index[existingIdx] = meta
    } else {
      index.push(meta)
    }

    // updatedAt 기준 내림차순 정렬
    index.sort((a, b) => b.updatedAt - a.updatedAt)

    localStorage.setItem(PROJECT_INDEX_KEY, JSON.stringify(index))
  } catch (e) {
    console.warn('[page-persistence] 인덱스 업데이트 실패:', e)
  }
}

// ─── 로드 ─────────────────────────────────────────────────────────────────────

/**
 * 특정 프로젝트를 localStorage 에서 로드
 */
export function loadProjectFromLocalStorage(projectId: string): ProjectData | null {
  try {
    const key = `${PROJECT_STORAGE_KEY_PREFIX}${projectId}`
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as ProjectData
  } catch (e) {
    console.warn('[page-persistence] localStorage 로드 실패:', e)
    return null
  }
}

/**
 * 가장 최근에 수정된 프로젝트를 로드 (새로고침 복구용)
 */
export function loadLatestProject(): ProjectData | null {
  try {
    const raw = localStorage.getItem(PROJECT_INDEX_KEY)
    if (!raw) return null
    const index = JSON.parse(raw) as ProjectMeta[]
    if (index.length === 0) return null

    // 가장 최근 프로젝트 로드
    const latest = index[0]
    if (!latest) return null
    return loadProjectFromLocalStorage(latest.id)
  } catch (e) {
    console.warn('[page-persistence] 최근 프로젝트 로드 실패:', e)
    return null
  }
}

/**
 * 모든 프로젝트 메타 목록 반환
 */
export function listLocalProjects(): ProjectMeta[] {
  try {
    const raw = localStorage.getItem(PROJECT_INDEX_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ProjectMeta[]
  } catch {
    return []
  }
}

/**
 * 특정 프로젝트 삭제
 */
export function deleteLocalProject(projectId: string): void {
  try {
    const key = `${PROJECT_STORAGE_KEY_PREFIX}${projectId}`
    localStorage.removeItem(key)

    // 인덱스에서 제거
    const raw = localStorage.getItem(PROJECT_INDEX_KEY)
    if (!raw) return
    const index = JSON.parse(raw) as ProjectMeta[]
    const filtered = index.filter((m) => m.id !== projectId)
    localStorage.setItem(PROJECT_INDEX_KEY, JSON.stringify(filtered))
  } catch (e) {
    console.warn('[page-persistence] 프로젝트 삭제 실패:', e)
  }
}

// ─── Debounce 유틸 ────────────────────────────────────────────────────────────

type DebounceTimer = ReturnType<typeof setTimeout>

export function createDebouncedSave(ms = PERSIST_DEBOUNCE_MS): {
  schedule: (project: ProjectData) => void
  flush: (project: ProjectData) => void
  cancel: () => void
} {
  let timer: DebounceTimer | null = null

  return {
    schedule(project) {
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        saveProjectToLocalStorage(project)
      }, ms)
    },
    flush(project) {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      saveProjectToLocalStorage(project)
    },
    cancel() {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
    },
  }
}
