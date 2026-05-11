'use client'

// ─────────────────────────────────────────────
// AlignControlBar — 다중 선택 시 노출되는 정렬/분배 컨트롤
//
// 6 정렬 버튼 + 2 분배 버튼 (3개 이상 선택 시만 활성)
// 각 동작은 TransformObjectCommand 로 undo 가능.
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import { TransformObjectCommand, snapshotFromFabricObject } from '@storywork/editor-history'
import { Tooltip } from '@storywork/ui'
import type { FabricObject } from 'fabric'
import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
} from 'lucide-react'
import React from 'react'

import type { HistoryRef as History } from './types'

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type AlignControlBarProps = {
  canvas: StoryCanvas | null
  history: History | null
  selectedIds: string[]
}

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

type BBox = { left: number; top: number; width: number; height: number }

function getObjectBBox(obj: FabricObject): BBox {
  const left = obj.left ?? 0
  const top = obj.top ?? 0
  const width = (obj.width ?? 0) * (obj.scaleX ?? 1)
  const height = (obj.height ?? 0) * (obj.scaleY ?? 1)
  return { left, top, width, height }
}

// ─── 정렬 함수 ────────────────────────────────────────────────────────────────

type AlignType =
  | 'left'
  | 'center-h'
  | 'right'
  | 'top'
  | 'center-v'
  | 'bottom'
  | 'distribute-h'
  | 'distribute-v'

function applyAlign(
  canvas: StoryCanvas,
  history: History,
  selectedIds: string[],
  type: AlignType,
): void {
  const fc = canvas._fabricCanvas
  const objs = selectedIds
    .map((id) => canvas.getObject(id))
    .filter((o): o is FabricObject => Boolean(o))

  if (objs.length < 2) return

  const bboxes = objs.map(getObjectBBox)

  // 전체 union bounding box
  const minLeft = Math.min(...bboxes.map((b) => b.left))
  const minTop = Math.min(...bboxes.map((b) => b.top))
  const maxRight = Math.max(...bboxes.map((b) => b.left + b.width))
  const maxBottom = Math.max(...bboxes.map((b) => b.top + b.height))
  const unionWidth = maxRight - minLeft
  const unionHeight = maxBottom - minTop

  // before snapshots
  const befores = objs.map((obj) => snapshotFromFabricObject(obj))

  switch (type) {
    case 'left':
      objs.forEach((obj) => obj.set({ left: minLeft }))
      break
    case 'center-h':
      objs.forEach((obj, i) => {
        const b = bboxes[i]
        if (!b) return
        obj.set({ left: minLeft + unionWidth / 2 - b.width / 2 })
      })
      break
    case 'right':
      objs.forEach((obj, i) => {
        const b = bboxes[i]
        if (!b) return
        obj.set({ left: maxRight - b.width })
      })
      break
    case 'top':
      objs.forEach((obj) => obj.set({ top: minTop }))
      break
    case 'center-v':
      objs.forEach((obj, i) => {
        const b = bboxes[i]
        if (!b) return
        obj.set({ top: minTop + unionHeight / 2 - b.height / 2 })
      })
      break
    case 'bottom':
      objs.forEach((obj, i) => {
        const b = bboxes[i]
        if (!b) return
        obj.set({ top: maxBottom - b.height })
      })
      break
    case 'distribute-h': {
      if (objs.length < 3) return
      const sorted = objs
        .map((obj, i) => {
          const bbox = bboxes[i]
          return bbox ? { obj, bbox } : null
        })
        .filter((x): x is { obj: FabricObject; bbox: BBox } => x !== null)
        .sort((a, b) => a.bbox.left - b.bbox.left)
      const totalObjWidth = sorted.reduce((acc, { bbox }) => acc + bbox.width, 0)
      const gap = (maxRight - minLeft - totalObjWidth) / (sorted.length - 1)
      let cursor = minLeft
      sorted.forEach(({ obj, bbox }) => {
        obj.set({ left: cursor })
        cursor += bbox.width + gap
      })
      break
    }
    case 'distribute-v': {
      if (objs.length < 3) return
      const sorted = objs
        .map((obj, i) => {
          const bbox = bboxes[i]
          return bbox ? { obj, bbox } : null
        })
        .filter((x): x is { obj: FabricObject; bbox: BBox } => x !== null)
        .sort((a, b) => a.bbox.top - b.bbox.top)
      const totalObjHeight = sorted.reduce((acc, { bbox }) => acc + bbox.height, 0)
      const gap = (maxBottom - minTop - totalObjHeight) / (sorted.length - 1)
      let cursor = minTop
      sorted.forEach(({ obj, bbox }) => {
        obj.set({ top: cursor })
        cursor += bbox.height + gap
      })
      break
    }
  }

  objs.forEach((obj) => obj.setCoords())
  fc.requestRenderAll()

  // after snapshots → TransformObjectCommand 들 push
  objs.forEach((obj, i) => {
    const id = selectedIds[i]
    if (!id) return
    const after = snapshotFromFabricObject(obj)
    const before = befores[i]
    if (!before) return
    history.push(new TransformObjectCommand({ canvas, id, before, after }))
  })
}

// ─── AlignButton ─────────────────────────────────────────────────────────────

type AlignButtonProps = {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}

function AlignButton({ label, disabled = false, onClick, children }: AlignButtonProps) {
  return (
    <Tooltip content={label} side="top">
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className="flex size-7 items-center justify-center rounded-[var(--radius-sm,4px)] border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
      >
        {children}
      </button>
    </Tooltip>
  )
}

// ─── AlignControlBar ──────────────────────────────────────────────────────────

export function AlignControlBar({ canvas, history, selectedIds }: AlignControlBarProps) {
  // 2개 미만이면 숨김
  if (selectedIds.length < 2) return null
  if (!canvas || !history) return null

  const canDistribute = selectedIds.length >= 3

  const handleAlign = (type: AlignType) => {
    applyAlign(canvas, history, selectedIds, type)
  }

  return (
    <section aria-label="정렬 및 분배" className="px-4 py-3">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        정렬
      </h3>

      {/* 수평 정렬 */}
      <div className="mb-2 flex gap-1">
        <AlignButton label="왼쪽 정렬" onClick={() => handleAlign('left')}>
          <AlignLeft className="size-3.5" aria-hidden="true" />
        </AlignButton>
        <AlignButton label="가로 중앙 정렬" onClick={() => handleAlign('center-h')}>
          <AlignCenter className="size-3.5" aria-hidden="true" />
        </AlignButton>
        <AlignButton label="오른쪽 정렬" onClick={() => handleAlign('right')}>
          <AlignRight className="size-3.5" aria-hidden="true" />
        </AlignButton>
      </div>

      {/* 수직 정렬 */}
      <div className="mb-2 flex gap-1">
        <AlignButton label="위쪽 정렬" onClick={() => handleAlign('top')}>
          <AlignStartVertical className="size-3.5" aria-hidden="true" />
        </AlignButton>
        <AlignButton label="세로 중앙 정렬" onClick={() => handleAlign('center-v')}>
          <AlignCenterHorizontal className="size-3.5" aria-hidden="true" />
        </AlignButton>
        <AlignButton label="아래쪽 정렬" onClick={() => handleAlign('bottom')}>
          <AlignEndVertical className="size-3.5" aria-hidden="true" />
        </AlignButton>
      </div>

      {/* 분배 (3개 이상) */}
      <div className="flex gap-1">
        <AlignButton
          label="가로 균등 분배 (3개 이상)"
          disabled={!canDistribute}
          onClick={() => handleAlign('distribute-h')}
        >
          <AlignStartHorizontal className="size-3.5" aria-hidden="true" />
        </AlignButton>
        <AlignButton
          label="세로 균등 분배 (3개 이상)"
          disabled={!canDistribute}
          onClick={() => handleAlign('distribute-v')}
        >
          <AlignEndHorizontal className="size-3.5" aria-hidden="true" />
        </AlignButton>
      </div>
    </section>
  )
}
