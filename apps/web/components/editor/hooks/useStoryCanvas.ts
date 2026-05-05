'use client'

// ─────────────────────────────────────────────
// useStoryCanvas — StoryCanvas 수명 관리 훅
// ─────────────────────────────────────────────

import type { Format } from '@storywork/editor-core'
import { StoryCanvas } from '@storywork/editor-core'
import { attachAutoPush, History } from '@storywork/editor-history'
import { LayerTree } from '@storywork/editor-layers'
import { useEffect, useRef } from 'react'

export type EditorRefs = {
  canvas: StoryCanvas | null
  layerTree: LayerTree | null
  history: History | null
}

/**
 * useStoryCanvas
 *
 * - containerRef 를 fabric Canvas 의 마운트 포인트로 사용한다.
 * - StoryCanvas + LayerTree + History 를 init/dispose 한다.
 * - attachAutoPush 로 transform 변경을 자동으로 history 에 push 한다.
 * - onReady 콜백으로 외부에 인스턴스를 노출한다.
 */
export function useStoryCanvas(
  containerRef: React.RefObject<HTMLDivElement | null>,
  format: Format,
  onReady: (refs: EditorRefs) => void,
) {
  const refsRef = useRef<EditorRefs>({ canvas: null, layerTree: null, history: null })
  const disposeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 인스턴스 생성
    const canvas = new StoryCanvas({ format, container, backgroundColor: '#ffffff' })
    const layerTree = new LayerTree({ canvas })
    const history = new History({ capacity: 200 })

    // transform 자동 push
    const detachAutoPush = attachAutoPush({ history, canvas, layerTree })

    refsRef.current = { canvas, layerTree, history }
    onReady({ canvas, layerTree, history })

    disposeRef.current = () => {
      detachAutoPush()
      layerTree.dispose()
      canvas.dispose()
      history.dispose()
      refsRef.current = { canvas: null, layerTree: null, history: null }
    }

    return () => {
      disposeRef.current?.()
      disposeRef.current = null
    }
    // format 은 초기화 시 고정. 변경 시 remount 필요 (의존성 배열 의도적으로 비움)
  }, [])

  return refsRef
}
