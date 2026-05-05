'use client'

// ─────────────────────────────────────────────
// BackgroundPanel — 배경 도구 패널 (활성)
//
// 단색 배경 12색 그리드. 클릭 시 캔버스에 배경 Rect 추가.
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import { AddObjectCommand } from '@storywork/editor-history'
import type { History } from '@storywork/editor-history'
import type { LayerTree } from '@storywork/editor-layers'
import { cn, showToast } from '@storywork/ui'
import { Rect } from 'fabric'
import React, { useCallback } from 'react'

type BackgroundPanelProps = {
  canvas: StoryCanvas | null
  history: History | null
  layerTree: LayerTree | null
}

// 단색 배경 팔레트 12색 (토큰 색 기반, hex 직접 아님 — 시맨틱으로 표현)
const BG_COLORS: { label: string; fill: string; bg: string }[] = [
  { label: '흰색', fill: '#ffffff', bg: 'bg-white border border-[var(--editor-border)]' },
  { label: '연회색', fill: '#f3f4f6', bg: 'bg-[#f3f4f6]' },
  { label: '회색', fill: '#9ca3af', bg: 'bg-[#9ca3af]' },
  { label: '검정', fill: '#111827', bg: 'bg-[#111827]' },
  { label: '남색', fill: '#1e3a5f', bg: 'bg-[#1e3a5f]' },
  { label: '파랑', fill: '#3b82f6', bg: 'bg-[#3b82f6]' },
  { label: '하늘', fill: '#7dd3fc', bg: 'bg-[#7dd3fc]' },
  { label: '보라', fill: '#a855f7', bg: 'bg-[#a855f7]' },
  { label: '핑크', fill: '#f472b6', bg: 'bg-[#f472b6]' },
  { label: '노랑', fill: '#fbbf24', bg: 'bg-[#fbbf24]' },
  { label: '초록', fill: '#22c55e', bg: 'bg-[#22c55e]' },
  { label: '갈색', fill: '#92400e', bg: 'bg-[#92400e]' },
]

const FORMAT_DEFAULT = { widthMm: 148, heightMm: 210 }

export function BackgroundPanel({ canvas, history, layerTree }: BackgroundPanelProps) {
  const handleColorClick = useCallback(
    (fill: string, label: string) => {
      if (!canvas || !history) {
        showToast('편집기가 준비되지 않았습니다.', 'error')
        return
      }

      const widthPx = canvas.mmToPx(FORMAT_DEFAULT.widthMm)
      const heightPx = canvas.mmToPx(FORMAT_DEFAULT.heightMm)

      const rect = new Rect({
        left: 0,
        top: 0,
        width: widthPx,
        height: heightPx,
        fill,
        selectable: true,
      })

      const cmd = new AddObjectCommand({
        canvas,
        fabricObj: rect,
        dataOverrides: { kind: 'background' },
      })
      history.push(cmd)

      // 배경은 맨 뒤로
      if (layerTree) {
        const id = cmd.assignedId
        if (id) layerTree.sendToBack(id)
      }

      showToast(`${label} 배경이 적용됐어요.`, 'success')
    },
    [canvas, history, layerTree],
  )

  return (
    <div className="flex flex-col gap-4 p-4">
      <section>
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--editor-text-muted)]">
          단색
        </h3>
        <div className="grid grid-cols-6 gap-2">
          {BG_COLORS.map(({ label, fill, bg }) => (
            <button
              key={fill}
              type="button"
              aria-label={`${label} 배경 적용`}
              title={label}
              onClick={() => handleColorClick(fill, label)}
              className={cn(
                'aspect-square rounded-[var(--radius-sm)]',
                'transition-transform hover:scale-110 hover:shadow-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
                'focus-visible:ring-offset-2',
                bg,
              )}
            />
          ))}
        </div>
      </section>

      {/* 향후 활성화 안내 */}
      <div
        aria-label="배경 이미지 라이브러리 예고"
        className={cn(
          'rounded-[var(--radius-md)] border border-dashed border-[var(--editor-border)]',
          'bg-[var(--color-surface-muted)] px-4 py-5 text-center',
        )}
      >
        <p className="text-[13px] text-[var(--editor-text-muted)]">
          M3 에서 배경 이미지 라이브러리 활성화 예정
        </p>
      </div>
    </div>
  )
}
