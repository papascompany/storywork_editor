'use client'

/**
 * useSaveProject — 편집기 서버 저장 훅
 *
 * 역할:
 *  1. 저장 클릭 시 인증 상태 확인
 *  2. 미인증 → sessionStorage 백업 + 로그인 게이트 모달 트리거
 *  3. 인증 → POST /api/projects/save → projectId 받아 URL 업데이트
 *
 * 자동저장(로그인):
 *  - 30초 디바운스로 백그라운드 저장 (로그인 상태일 때만)
 *  - 미인증이면 localStorage 기반 자동저장만 (기존 동작 유지)
 *
 * sessionStorage 키: 'editor-pending-save'
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import type { ProjectData } from '../store/usePageStore'

import { createWebBrowserClient } from '@/lib/supabase/client'

// ─── 상수 ─────────────────────────────────────────────────────────────────────

/** 로그인 후 복원을 위한 sessionStorage 키 */
export const PENDING_SAVE_KEY = 'editor-pending-save'

/** 서버 자동저장 디바운스 (로그인 상태) */
const SERVER_AUTOSAVE_DEBOUNCE_MS = 30_000

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export type ServerSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export type UseSaveProjectReturn = {
  /** 서버 저장 상태 */
  serverSaveStatus: ServerSaveStatus
  /** 현재 서버에 저장된 projectId (없으면 null — 익명 편집 중) */
  serverProjectId: string | null
  /** 수동 저장 트리거 — 미인증이면 게이트 모달 요청 */
  triggerSave: () => Promise<void>
  /** 로그인 게이트 모달 표시 여부 */
  showLoginGate: boolean
  /** 로그인 게이트 닫기 */
  closeLoginGate: () => void
  /** 현재 로그인 상태 */
  isAuthenticated: boolean
}

// ─── 직렬화 헬퍼 ─────────────────────────────────────────────────────────────

/**
 * ProjectData 를 sessionStorage 에 백업한다.
 * 로그인 후 복원 시 사용.
 */
export function backupToSessionStorage(project: ProjectData): void {
  try {
    sessionStorage.setItem(PENDING_SAVE_KEY, JSON.stringify(project))
  } catch (e) {
    console.warn('[useSaveProject] sessionStorage 백업 실패:', e)
  }
}

/**
 * sessionStorage 에서 pending save 데이터를 읽고 제거한다.
 * 복원 성공 시 반환, 없으면 null.
 */
export function consumePendingSave(): ProjectData | null {
  try {
    const raw = sessionStorage.getItem(PENDING_SAVE_KEY)
    if (!raw) return null
    sessionStorage.removeItem(PENDING_SAVE_KEY)
    return JSON.parse(raw) as ProjectData
  } catch {
    return null
  }
}

/**
 * sessionStorage 에 pending save 데이터가 있는지 확인한다 (읽기 전용).
 */
export function hasPendingSave(): boolean {
  try {
    return sessionStorage.getItem(PENDING_SAVE_KEY) !== null
  } catch {
    return false
  }
}

// ─── 서버 저장 함수 ──────────────────────────────────────────────────────────

type SavePayload = {
  projectId?: string
  title: string
  formatId: string
  pages: Array<{
    index: number
    fabricJson: Record<string, unknown>
    thumbnail?: string
  }>
}

async function callSaveApi(payload: SavePayload): Promise<{ projectId: string; savedAt: string }> {
  const res = await fetch('/api/projects/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const data = (await res.json().catch(() => ({ error: 'unknown' }))) as { error?: string }
    throw new Error(data.error ?? `저장 실패 (${res.status})`)
  }

  return res.json() as Promise<{ projectId: string; savedAt: string }>
}

// ─── useSaveProject ───────────────────────────────────────────────────────────

export function useSaveProject(project: ProjectData | null): UseSaveProjectReturn {
  const [serverSaveStatus, setServerSaveStatus] = useState<ServerSaveStatus>('idle')
  const [serverProjectId, setServerProjectId] = useState<string | null>(null)
  const [showLoginGate, setShowLoginGate] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // 서버 자동저장 타이머 ref
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 인증 상태 초기 확인 ───────────────────────────────────────────────────
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createWebBrowserClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setIsAuthenticated(!!user)
      } catch {
        setIsAuthenticated(false)
      }
    }

    void checkAuth()

    // 탭 포커스 시 재확인 (로그인 후 돌아온 경우 대비)
    const onFocus = () => void checkAuth()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // ── 수동 저장 트리거 ─────────────────────────────────────────────────────
  const triggerSave = useCallback(async () => {
    if (!project) return

    // 인증 상태 재확인 (세션 만료 가드)
    let authed = false
    try {
      const supabase = createWebBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      authed = !!user
      setIsAuthenticated(authed)
    } catch {
      authed = false
    }

    if (!authed) {
      // 미인증 → sessionStorage 백업 + 게이트 모달
      backupToSessionStorage(project)
      setShowLoginGate(true)
      return
    }

    // 인증됨 → 서버 저장
    setServerSaveStatus('saving')
    try {
      const payload: SavePayload = {
        projectId: serverProjectId ?? undefined,
        title: project.title,
        formatId: project.formatId,
        pages: project.pages.map((p) => ({
          index: p.index,
          fabricJson: p.fabricJson,
          thumbnail: p.thumbnail,
        })),
      }
      const result = await callSaveApi(payload)
      setServerProjectId(result.projectId)
      setServerSaveStatus('saved')

      // URL 에 projectId 반영 (북마크/새로고침 대비)
      const url = new URL(window.location.href)
      url.searchParams.set('projectId', result.projectId)
      window.history.replaceState(null, '', url.toString())

      // 3초 후 idle 복귀
      setTimeout(() => setServerSaveStatus('idle'), 3000)
    } catch (err) {
      console.error('[useSaveProject] 서버 저장 실패:', err)
      setServerSaveStatus('error')
    }
  }, [project, serverProjectId])

  // ── 로그인 상태일 때 서버 자동저장 (30초 디바운스) ──────────────────────
  useEffect(() => {
    if (!isAuthenticated || !project) return

    // 이전 타이머 취소
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setTimeout(() => {
      // 백그라운드 자동저장 — 실패해도 UI 방해 안 함
      const payload: SavePayload = {
        projectId: serverProjectId ?? undefined,
        title: project.title,
        formatId: project.formatId,
        pages: project.pages.map((p) => ({
          index: p.index,
          fabricJson: p.fabricJson,
          thumbnail: p.thumbnail,
        })),
      }
      void callSaveApi(payload)
        .then((result) => {
          setServerProjectId(result.projectId)
          // URL 반영
          const url = new URL(window.location.href)
          url.searchParams.set('projectId', result.projectId)
          window.history.replaceState(null, '', url.toString())
        })
        .catch((err) => {
          console.warn('[useSaveProject] 백그라운드 자동저장 실패:', err)
        })
    }, SERVER_AUTOSAVE_DEBOUNCE_MS)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [isAuthenticated, project, serverProjectId])

  const closeLoginGate = useCallback(() => {
    setShowLoginGate(false)
  }, [])

  return {
    serverSaveStatus,
    serverProjectId,
    triggerSave,
    showLoginGate,
    closeLoginGate,
    isAuthenticated,
  }
}
