'use client'

// ─────────────────────────────────────────────
// useHistory — Undo/Redo 상태 + 키보드 단축키 훅
// ─────────────────────────────────────────────

import type { History } from '@storywork/editor-history'
import { useCallback, useEffect, useState } from 'react'

export function useHistory(history: History | null) {
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  useEffect(() => {
    if (!history) return

    const sync = () => {
      setCanUndo(history.canUndo())
      setCanRedo(history.canRedo())
    }

    // history:pushed + history:applied 모두 구독
    const unsubPushed = history.on('history:pushed', sync)
    const unsubApplied = history.on('history:applied', sync)
    // cleared 이벤트는 payload 가 never 타입 — 직접 sync 호출
    const unsubCleared = history.on('history:cleared', sync)

    sync()

    return () => {
      unsubPushed()
      unsubApplied()
      unsubCleared()
    }
  }, [history])

  const undo = useCallback(() => {
    history?.undo()
  }, [history])

  const redo = useCallback(() => {
    history?.redo()
  }, [history])

  // 키보드 단축키: ⌘Z / ⌘⇧Z
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const ctrl = isMac ? e.metaKey : e.ctrlKey
      if (!ctrl) return

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        history?.undo()
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        history?.redo()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [history])

  return { canUndo, canRedo, undo, redo }
}
