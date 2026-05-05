'use client'

// ─────────────────────────────────────────────
// EditorContext — 편집기 인스턴스 공유 Context
//
// H5: canvas / layerTree / history 인스턴스를 useRef 로 보유하고,
// React Context 로 자식에게 전달한다.
// 인스턴스 자체는 절대 useState 에 넣지 않는다 (fabric 내부 변경 시
// 불필요한 리렌더 + 이중 dispose 위험).
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import type { History } from '@storywork/editor-history'
import type { LayerTree } from '@storywork/editor-layers'
import { createContext } from 'react'

export type EditorContextValue = {
  /** StoryCanvas 인스턴스 (ref.current). dispose 후에는 null. */
  canvas: StoryCanvas | null
  layerTree: LayerTree | null
  history: History | null
  /**
   * 자식 컴포넌트가 re-render 가 필요할 때 이 값이 바뀐다.
   * canvas 인스턴스 자체는 바뀌지 않으므로 이 트리거만 구독한다.
   */
  readyTick: number
}

export const EditorContext = createContext<EditorContextValue>({
  canvas: null,
  layerTree: null,
  history: null,
  readyTick: 0,
})
