'use client'

/**
 * useProjectImport — URL projectId query param 으로 프로젝트 로드 (M4-04 Step 3)
 *
 * /editor?projectId=xxx 로 진입 시 /api/projects/[id] 에서 서버 저장 데이터를 불러온다.
 * EditorShell 의 기존 localStorage 복구 로직보다 우선 실행된다.
 *
 * 반환:
 *   { isLoading, error, loadedProjectId }
 *
 * 사용:
 *   const { isLoading } = useProjectImport(canvasRef, loadProject, showToast)
 *
 * 주의:
 *   - searchParams 는 Suspense boundary 안에서만 동작 (Next.js App Router)
 *   - 이 훅은 EditorShell 에서 canvasRef + readyTick 이 준비된 이후 실행
 */

import type { PageJsonV1 } from '@storywork/schema/editor'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { ProjectData } from '../store/usePageStore'

// ─── API 응답 타입 ────────────────────────────────────────────────────────────

interface ApiProjectPage {
  id: string
  index: number
  fabricJson: Record<string, unknown>
  thumbnail: string | null
}

interface ApiProjectResponse {
  project: {
    id: string
    title: string
    formatId: string
    status: string
  }
  pages: ApiProjectPage[]
}

// ─── 기본 포맷 폴백 ───────────────────────────────────────────────────────────

const FALLBACK_FORMAT = {
  name: 'B5 소설',
  widthMm: 128,
  heightMm: 182,
  dpi: 350,
  bleedMm: 3,
  safeMm: 5,
}

// ─── 훅 ──────────────────────────────────────────────────────────────────────

export interface UseProjectImportResult {
  isLoading: boolean
  error: string | null
  loadedProjectId: string | null
}

export function useProjectImport(
  canvasRef: React.RefObject<{ loadJson: (json: PageJsonV1) => Promise<void> } | null>,
  loadProject: (project: ProjectData) => void,
  showToast: (msg: string, variant?: 'success' | 'warning' | 'error' | 'info') => void,
  readyTick: number,
): UseProjectImportResult {
  // useSearchParams 는 Suspense boundary 필요 → window.location 으로 클라이언트 사이드 파싱
  const projectId =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('projectId')
      : null

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null)

  // 중복 실행 방지
  const loadingRef = useRef(false)

  const load = useCallback(
    async (id: string) => {
      if (loadingRef.current) return
      loadingRef.current = true
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/projects/${id}`)
        if (!res.ok) {
          const errData = (await res.json()) as { error?: string }
          throw new Error(errData.error ?? `HTTP ${res.status}`)
        }

        const data = (await res.json()) as ApiProjectResponse

        // ProjectData 로 변환
        const projectData: ProjectData = {
          id: data.project.id,
          title: data.project.title,
          formatId: data.project.formatId,
          format: FALLBACK_FORMAT,
          pages: data.pages.map((p) => ({
            id: p.id,
            index: p.index,
            fabricJson: p.fabricJson,
            thumbnail: p.thumbnail ?? undefined,
            updatedAt: Date.now(),
          })),
          currentPageIndex: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        loadProject(projectData)

        // 첫 페이지 캔버스에 로드
        const firstPage = data.pages[0]
        if (firstPage && canvasRef.current) {
          await canvasRef.current.loadJson(firstPage.fabricJson as PageJsonV1)
        }

        setLoadedProjectId(id)
        showToast(`"${data.project.title}" 불러오기 완료`, 'success')
      } catch (err) {
        const msg = err instanceof Error ? err.message : '프로젝트 로드 중 오류가 발생했습니다.'
        setError(msg)
        showToast(msg, 'error')
        console.error('[useProjectImport] 로드 실패:', err)
      } finally {
        setIsLoading(false)
        loadingRef.current = false
      }
    },
    [canvasRef, loadProject, showToast],
  )

  useEffect(() => {
    // canvas 미준비 시 대기
    if (!readyTick) return
    // projectId 없으면 패스
    if (!projectId) return
    // 이미 로드한 projectId 면 패스
    if (loadedProjectId === projectId) return

    void load(projectId)
  }, [readyTick, projectId, loadedProjectId, load])

  return { isLoading, error, loadedProjectId }
}
