'use client'

// ─────────────────────────────────────────────
// useAutosave — DirtyTracker → localStorage 자동 저장 훅
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import { DirtyTracker, exportJson } from '@storywork/editor-export'
import type { History } from '@storywork/editor-history'
import type { LayerTree } from '@storywork/editor-layers'
import { useEffect, useState } from 'react'

import { AUTOSAVE_STORAGE_KEY } from '../../../lib/editor/seed'

const AUTOSAVE_DEBOUNCE_MS = 5000

export type SaveStatus = 'clean' | 'dirty' | 'saving' | 'saved'

/**
 * useAutosave
 *
 * - DirtyTracker 를 생성해 history:applied → dirty 감지
 * - autosave:tick 시 exportJson → localStorage 저장
 * - isDirty 상태를 TopBar 의 저장 인디케이터에 노출
 */
export function useAutosave(
  canvas: StoryCanvas | null,
  layerTree: LayerTree | null,
  history: History | null,
) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('clean')

  useEffect(() => {
    if (!canvas || !history) return

    const tracker = new DirtyTracker({ history, debounceMs: AUTOSAVE_DEBOUNCE_MS })

    const unsubDirty = tracker.on('dirty:changed', (dirty) => {
      setSaveStatus(dirty ? 'dirty' : 'clean')
    })

    const unsubTick = tracker.on('autosave:tick', () => {
      try {
        setSaveStatus('saving')
        const result = exportJson(canvas, layerTree ?? undefined)
        localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(result))
        tracker.markClean()
        setSaveStatus('saved')
        // 3초 후 'clean' 으로 복귀
        setTimeout(() => setSaveStatus('clean'), 3000)
      } catch (err) {
        console.error('[useAutosave] autosave 실패:', err)
        setSaveStatus('dirty')
      }
    })

    return () => {
      unsubDirty()
      unsubTick()
      tracker.dispose()
    }
  }, [canvas, layerTree, history])

  return { saveStatus }
}
