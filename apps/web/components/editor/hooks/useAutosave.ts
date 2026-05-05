'use client'

// ─────────────────────────────────────────────
// useAutosave — DirtyTracker → localStorage 자동 저장 훅
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import { DirtyTracker, exportJson } from '@storywork/editor-export'
import type { LayerTree } from '@storywork/editor-layers'
import { useEffect, useState } from 'react'

import { AUTOSAVE_STORAGE_KEY } from '../../../lib/editor/seed'
import type { HistoryRef as History } from '../types'

const AUTOSAVE_DEBOUNCE_MS = 5000

/**
 * SaveStatus — 자동 저장 상태
 * - clean: 변경 없음 (초기 또는 저장 직후 안정 상태)
 * - dirty: 미저장 변경 있음
 * - saving: 저장 진행 중
 * - saved: 저장 완료 (3초 후 clean 복귀)
 *
 * AutoSaveIndicator 의 5상태(idle/saving/saved/failed/offline) 와의 매핑:
 *   clean → idle, dirty → idle, saving → saving, saved → saved
 *   failed / offline 은 useAutosave 가 추가 상태 필드로 노출
 */
export type SaveStatus = 'clean' | 'dirty' | 'saving' | 'saved'

/**
 * useAutosave
 *
 * - DirtyTracker 를 생성해 history:applied → dirty 감지
 * - autosave:tick 시 exportJson → localStorage 저장
 * - isDirty 상태를 TopBar 의 저장 인디케이터에 노출
 */
export type AutosaveFailReason = 'saveFailed' | 'offline' | null

export function useAutosave(
  canvas: StoryCanvas | null,
  layerTree: LayerTree | null,
  history: History | null,
) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('clean')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [failReason, setFailReason] = useState<AutosaveFailReason>(null)

  useEffect(() => {
    if (!canvas || !history) return

    // 오프라인 감지
    const handleOffline = () => setFailReason('offline')
    const handleOnline = () => {
      if (failReason === 'offline') setFailReason(null)
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    // History 클래스와 HistoryRef 의 dist/src 충돌 회피용 cast
    // (실제 인스턴스는 동일하지만 Next.js webpack 이 다른 모듈로 인식)
    const tracker = new DirtyTracker({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      history: history as any,
      debounceMs: AUTOSAVE_DEBOUNCE_MS,
    })

    const unsubDirty = tracker.on('dirty:changed', (dirty) => {
      setSaveStatus(dirty ? 'dirty' : 'clean')
    })

    const unsubTick = tracker.on('autosave:tick', () => {
      if (!navigator.onLine) {
        setFailReason('offline')
        return
      }
      try {
        setSaveStatus('saving')
        setFailReason(null)
        const result = exportJson(canvas, layerTree ?? undefined)
        localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(result))
        tracker.markClean()
        setLastSavedAt(new Date())
        setSaveStatus('saved')
        // 3초 후 'clean' 으로 복귀
        setTimeout(() => setSaveStatus('clean'), 3000)
      } catch (err) {
        console.error('[useAutosave] autosave 실패:', err)
        setSaveStatus('dirty')
        setFailReason('saveFailed')
      }
    })

    return () => {
      unsubDirty()
      unsubTick()
      tracker.dispose()
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [canvas, layerTree, history])

  return { saveStatus, lastSavedAt, failReason }
}
