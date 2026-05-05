'use client'

// ─────────────────────────────────────────────
// useSelection — 캔버스 선택 상태 훅
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import { useCallback, useEffect, useState } from 'react'

export type SelectionState = {
  /** 선택된 객체 id 배열 */
  selectedIds: string[]
  /** 단일 선택 시 객체 속성 (mm 단위) */
  props: ObjectProps | null
}

export type ObjectProps = {
  id: string
  x: number
  y: number
  width: number
  height: number
  angle: number
}

/**
 * useSelection
 *
 * - editor-core 의 selection:changed 이벤트를 구독해 React 상태로 변환한다.
 * - updateProps: Inspector 에서 객체 속성을 mm 단위로 수정할 때 사용한다.
 */
export function useSelection(canvas: StoryCanvas | null) {
  const [state, setState] = useState<SelectionState>({ selectedIds: [], props: null })

  useEffect(() => {
    if (!canvas) return

    const readProps = (ids: string[]): ObjectProps | null => {
      if (ids.length !== 1) return null
      const id = ids[0]
      if (!id) return null
      const obj = canvas.getObject(id)
      if (!obj) return null
      // fabric 좌표 → mm 변환
      const left = obj.left ?? 0
      const top = obj.top ?? 0
      const width = (obj.width ?? 0) * (obj.scaleX ?? 1)
      const height = (obj.height ?? 0) * (obj.scaleY ?? 1)
      const angle = obj.angle ?? 0
      return {
        id,
        x: canvas.pxToMm(left),
        y: canvas.pxToMm(top),
        width: canvas.pxToMm(width),
        height: canvas.pxToMm(height),
        angle,
      }
    }

    const unsub = canvas.on('selection:changed', ({ ids }) => {
      setState({ selectedIds: ids, props: readProps(ids) })
    })

    // object:changed (transform 후) 도 props 갱신
    const unsubChanged = canvas.on('object:changed', ({ id }) => {
      setState((prev) => {
        if (!prev.selectedIds.includes(id)) return prev
        return { ...prev, props: readProps(prev.selectedIds) }
      })
    })

    return () => {
      unsub()
      unsubChanged()
    }
  }, [canvas])

  const updateProps = useCallback(
    (patch: Partial<Omit<ObjectProps, 'id'>>) => {
      if (!canvas || !state.props) return
      const obj = canvas.getObject(state.props.id)
      if (!obj) return

      if (patch.x !== undefined) obj.set({ left: canvas.mmToPx(patch.x) })
      if (patch.y !== undefined) obj.set({ top: canvas.mmToPx(patch.y) })
      if (patch.width !== undefined) {
        const currentWidth = obj.width ?? 1
        obj.set({ scaleX: canvas.mmToPx(patch.width) / currentWidth })
      }
      if (patch.height !== undefined) {
        const currentHeight = obj.height ?? 1
        obj.set({ scaleY: canvas.mmToPx(patch.height) / currentHeight })
      }
      if (patch.angle !== undefined) obj.set({ angle: patch.angle })

      obj.setCoords()
      canvas._fabricCanvas.requestRenderAll()
      canvas._fabricCanvas.fire('object:modified', { target: obj })
    },
    [canvas, state.props],
  )

  const clearSelection = useCallback(() => {
    if (!canvas) return
    canvas._fabricCanvas.discardActiveObject()
    canvas._fabricCanvas.requestRenderAll()
  }, [canvas])

  const deleteSelected = useCallback(() => {
    if (!canvas || state.selectedIds.length === 0) return
    canvas._fabricCanvas.discardActiveObject()
    for (const id of state.selectedIds) {
      canvas.removeObject(id)
    }
  }, [canvas, state.selectedIds])

  return { ...state, updateProps, clearSelection, deleteSelected }
}
