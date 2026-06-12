/**
 * usePageStore — 다중 페이지 프로젝트 상태 관리 (Zustand + immer)
 *
 * MVP: localStorage 기반 영속화 (서버 영속화는 FOLLOWUP)
 * FOLLOWUP: 인증 후 DB 영속화 — useAutoSavePage 내에서 fetch 추가만으로 확장
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type { CoverConfig } from '../../../lib/cover-config'

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface PageFormat {
  name: string
  widthMm: number
  heightMm: number
  dpi: number
  bleedMm: number
  safeMm: number
}

export interface PageData {
  /** UUID (client-side 생성) */
  id: string
  /** 0-based index */
  index: number
  /** canvas.toJSON() 결과 */
  fabricJson: Record<string, unknown>
  /** dataURL (256px 썸네일) */
  thumbnail?: string
  /** epoch ms */
  updatedAt: number
}

export interface ProjectData {
  /** UUID (client-side 생성) */
  id: string
  title: string
  /** 'preset:b5-novel' / 'preset:a5-artbook' / 'preset:square' / 'preset:mobile-story' / DB Format ID */
  formatId: string
  format: PageFormat
  /**
   * 표지 설정 (FOLLOWUP-COVER-02) — 설정 시 pages[0] = 표지 페이지(독립 치수).
   * null/undefined = 표지 없음. 서버 영속화는 Project.settings.cover.
   */
  cover?: CoverConfig | null
  pages: PageData[]
  currentPageIndex: number
  createdAt: number
  updatedAt: number
}

// ─── Store 인터페이스 ─────────────────────────────────────────────────────────

interface PageStore {
  project: ProjectData | null

  // Project 액션
  createProject: (
    format: PageFormat,
    formatId: string,
    title?: string,
    opts?: { cover?: CoverConfig | null },
  ) => void
  loadProject: (project: ProjectData) => void
  closeProject: () => void
  renameProject: (title: string) => void

  // Page 액션
  addPage: (opts?: { afterIndex?: number; fabricJson?: Record<string, unknown> }) => void
  removePage: (pageId: string) => void
  duplicatePage: (pageId: string) => void
  movePage: (fromIndex: number, toIndex: number) => void

  // 현재 페이지
  setCurrentPage: (pageIndex: number) => void
  updateCurrentPageJson: (fabricJson: Record<string, unknown>) => void
  updateCurrentPageThumbnail: (thumbnail: string) => void
  updatePageThumbnail: (pageIndex: number, thumbnail: string) => void
}

// ─── UUID 생성 헬퍼 ───────────────────────────────────────────────────────────

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // 폴백 (테스트 환경 등)
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function makePage(index: number, fabricJson?: Record<string, unknown>): PageData {
  return {
    id: generateId(),
    index,
    fabricJson: fabricJson ?? {},
    thumbnail: undefined,
    updatedAt: Date.now(),
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePageStore = create<PageStore>()(
  immer((set) => ({
    project: null,

    // ── Project 액션 ─────────────────────────────────────────────────────────

    createProject(format, formatId, title, opts) {
      const now = Date.now()
      const dateStr = new Date(now).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      const projectTitle = title ?? `새 콘티 ${dateStr}`
      const cover = opts?.cover ?? null

      // 표지 사용 시: pages[0] = 표지(독립 치수), pages[1] = 본문 1페이지
      const pages = cover ? [makePage(0), makePage(1)] : [makePage(0)]

      set((s) => {
        s.project = {
          id: generateId(),
          title: projectTitle,
          formatId,
          format,
          cover,
          pages,
          currentPageIndex: 0,
          createdAt: now,
          updatedAt: now,
        }
      })
    },

    loadProject(project) {
      set((s) => {
        s.project = project
      })
    },

    closeProject() {
      set((s) => {
        s.project = null
      })
    },

    renameProject(title) {
      set((s) => {
        if (!s.project) return
        s.project.title = title
        s.project.updatedAt = Date.now()
      })
    },

    // ── Page 액션 ─────────────────────────────────────────────────────────────

    addPage(opts) {
      set((s) => {
        if (!s.project) return
        const { afterIndex, fabricJson } = opts ?? {}
        const insertAt =
          afterIndex !== undefined
            ? Math.min(afterIndex + 1, s.project.pages.length)
            : s.project.pages.length

        const newPage = makePage(insertAt, fabricJson)

        // insertAt 위치에 삽입
        s.project.pages.splice(insertAt, 0, newPage)

        // 전체 index 재계산
        s.project.pages.forEach((p, i) => {
          p.index = i
        })

        s.project.currentPageIndex = insertAt
        s.project.updatedAt = Date.now()
      })
    },

    removePage(pageId) {
      set((s) => {
        if (!s.project) return
        if (s.project.pages.length <= 1) return // 마지막 페이지 삭제 불가

        const idx = s.project.pages.findIndex((p) => p.id === pageId)
        if (idx === -1) return

        s.project.pages.splice(idx, 1)

        // index 재계산
        s.project.pages.forEach((p, i) => {
          p.index = i
        })

        // currentPageIndex 가드
        const newCurrent = Math.min(s.project.currentPageIndex, s.project.pages.length - 1)
        s.project.currentPageIndex = newCurrent
        s.project.updatedAt = Date.now()
      })
    },

    duplicatePage(pageId) {
      set((s) => {
        if (!s.project) return
        const idx = s.project.pages.findIndex((p) => p.id === pageId)
        if (idx === -1) return

        const source = s.project.pages[idx]
        if (!source) return

        const newPage: PageData = {
          id: generateId(),
          index: idx + 1,
          fabricJson: JSON.parse(JSON.stringify(source.fabricJson)) as Record<string, unknown>,
          thumbnail: source.thumbnail,
          updatedAt: Date.now(),
        }

        s.project.pages.splice(idx + 1, 0, newPage)

        // index 재계산
        s.project.pages.forEach((p, i) => {
          p.index = i
        })

        s.project.currentPageIndex = idx + 1
        s.project.updatedAt = Date.now()
      })
    },

    movePage(fromIndex, toIndex) {
      set((s) => {
        if (!s.project) return
        const pages = s.project.pages
        if (fromIndex < 0 || fromIndex >= pages.length) return
        if (toIndex < 0 || toIndex >= pages.length) return
        if (fromIndex === toIndex) return

        const [moved] = pages.splice(fromIndex, 1)
        if (!moved) return
        pages.splice(toIndex, 0, moved)

        // index 재계산
        pages.forEach((p, i) => {
          p.index = i
        })

        // 이동된 페이지로 currentPageIndex 추적
        const currentId = s.project.pages[s.project.currentPageIndex]?.id
        if (currentId) {
          const newIdx = pages.findIndex((p) => p.id === currentId)
          if (newIdx !== -1) s.project.currentPageIndex = newIdx
        }
        s.project.updatedAt = Date.now()
      })
    },

    // ── 현재 페이지 액션 ───────────────────────────────────────────────────────

    setCurrentPage(pageIndex) {
      set((s) => {
        if (!s.project) return
        const clamped = Math.max(0, Math.min(pageIndex, s.project.pages.length - 1))
        s.project.currentPageIndex = clamped
      })
    },

    updateCurrentPageJson(fabricJson) {
      set((s) => {
        if (!s.project) return
        const page = s.project.pages[s.project.currentPageIndex]
        if (!page) return
        page.fabricJson = fabricJson
        page.updatedAt = Date.now()
        s.project.updatedAt = Date.now()
      })
    },

    updateCurrentPageThumbnail(thumbnail) {
      set((s) => {
        if (!s.project) return
        const page = s.project.pages[s.project.currentPageIndex]
        if (!page) return
        page.thumbnail = thumbnail
      })
    },

    updatePageThumbnail(pageIndex, thumbnail) {
      set((s) => {
        if (!s.project) return
        const page = s.project.pages[pageIndex]
        if (!page) return
        page.thumbnail = thumbnail
      })
    },
  })),
)

// ─── 셀렉터 헬퍼 ─────────────────────────────────────────────────────────────

export const selectCurrentPage = (s: { project: ProjectData | null }): PageData | null => {
  if (!s.project) return null
  return s.project.pages[s.project.currentPageIndex] ?? null
}

export const selectTotalPages = (s: { project: ProjectData | null }): number => {
  return s.project?.pages.length ?? 0
}
