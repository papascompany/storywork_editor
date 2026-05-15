'use client'

// ─────────────────────────────────────────────
// ShapePanel — 도형 도구 패널 (활성)
//
// Rectangle / Circle / Line / Triangle 4종.
// 클릭 시 캔버스 중앙에 추가 + 자동 선택.
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import { AddObjectCommand } from '@storywork/editor-history'
import { cn, showToast } from '@storywork/ui'
import {
  Circle as FabricCircle,
  type Canvas as FabricCanvas,
  Line,
  Rect,
  Triangle as FabricTriangle,
} from 'fabric'
import { Circle, Minus, Square, Triangle } from 'lucide-react'
import React, { useCallback } from 'react'

import type { HistoryRef as History } from '../types'

type ShapePanelProps = {
  canvas: StoryCanvas | null
  history: History | null
}

type ShapeId = 'rect' | 'circle' | 'line' | 'triangle'

const SHAPE_DEFS: {
  id: ShapeId
  label: string
  Icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: 'rect', label: '사각형', Icon: Square },
  { id: 'circle', label: '원', Icon: Circle },
  { id: 'line', label: '선', Icon: Minus },
  { id: 'triangle', label: '삼각형', Icon: Triangle },
]

function createShape(
  id: ShapeId,
  cx: number,
  cy: number,
  size: number,
): Rect | FabricCircle | Line | FabricTriangle {
  switch (id) {
    case 'rect':
      return new Rect({
        left: cx - size / 2,
        top: cy - size / 2,
        width: size,
        height: size,
        fill: '#c4c4fe',
        stroke: '#6366f1',
        strokeWidth: 2,
      })
    case 'circle':
      return new FabricCircle({
        left: cx - size / 2,
        top: cy - size / 2,
        radius: size / 2,
        fill: '#a5f3fc',
        stroke: '#06b6d4',
        strokeWidth: 2,
      })
    case 'line':
      return new Line([cx - size, cy, cx + size, cy], {
        stroke: '#111827',
        strokeWidth: 3,
        selectable: true,
      })
    case 'triangle':
      return new FabricTriangle({
        left: cx - size / 2,
        top: cy - size / 2,
        width: size,
        height: size,
        fill: '#ec4899',
        stroke: '#db2777',
        strokeWidth: 2,
      })
  }
}

export function ShapePanel({ canvas, history }: ShapePanelProps) {
  const handleShapeClick = useCallback(
    (id: ShapeId) => {
      if (!canvas || !history) {
        showToast('편집기가 준비되지 않았습니다.', 'error')
        return
      }

      // canvas.format 으로 실제 판형 기준 중앙 좌표 계산 (하드코드 제거)
      const format = canvas.format
      const cx = canvas.mmToPx(format.widthMm / 2)
      const cy = canvas.mmToPx(format.heightMm / 2)
      const size = canvas.mmToPx(30)
      const fabricObj = createShape(id, cx, cy, size)

      const cmd = new AddObjectCommand({
        canvas,
        fabricObj,
        // 'prop' 은 ObjectKind 에 정의된 범용 도형 종류
        dataOverrides: { kind: 'prop' },
      })
      history.push(cmd)

      // 추가 후 해당 객체 자동 선택 (_fabricCanvas 는 editor-core 내부 접근자)
      const fabricCanvas = (canvas as unknown as { _fabricCanvas: FabricCanvas })._fabricCanvas
      if (fabricCanvas) {
        fabricCanvas.setActiveObject(fabricObj)
        fabricCanvas.requestRenderAll()
      }
    },
    [canvas, history],
  )

  return (
    <div className="flex flex-col gap-5 px-6 py-5">
      <div className="grid grid-cols-2 gap-4">
        {SHAPE_DEFS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-label={`${label} 추가`}
            onClick={() => handleShapeClick(id)}
            className={cn(
              'flex flex-col items-center justify-center gap-2',
              'h-[72px] rounded-[var(--radius-md)]',
              'border border-[var(--editor-border)]',
              'bg-[var(--editor-panel)]',
              'text-[var(--editor-text-muted)]',
              'hover:border-[var(--color-brand-400)] hover:bg-[var(--editor-hover)] hover:text-[var(--editor-text)]',
              'transition-colors duration-[var(--duration-fast)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
            )}
          >
            <Icon className="size-6" aria-hidden="true" />
            <span className="text-[12px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
