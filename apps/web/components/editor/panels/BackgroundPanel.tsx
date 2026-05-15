'use client'

// ─────────────────────────────────────────────
// BackgroundPanel — 배경 도구 패널 (활성)
//
// 단색 배경 12색 그리드. 클릭 시:
//   - 기존 kind='background' 객체가 있으면 fill 만 교체 (누적 방지)
//   - 없으면 새 Rect 생성 후 맨 뒤로 배치
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import { AddObjectCommand } from '@storywork/editor-history'
import type { LayerTree } from '@storywork/editor-layers'
import { cn, showToast } from '@storywork/ui'
import { Rect } from 'fabric'
import React, { useCallback } from 'react'

import type { HistoryRef as History } from '../types'

type BackgroundPanelProps = {
  canvas: StoryCanvas | null
  history: History | null
  layerTree: LayerTree | null
}

// 단색 배경 팔레트 14색 (토큰 색 기반, hex 직접 아님 — 시맨틱으로 표현)
const BG_COLORS: { label: string; fill: string; bg: string }[] = [
  { label: '흰색', fill: '#ffffff', bg: 'bg-white border border-[var(--editor-border)]' },
  { label: '연회색', fill: '#f3f4f6', bg: 'bg-[#f3f4f6] border border-[var(--editor-border)]' },
  { label: '회색', fill: '#9ca3af', bg: 'bg-[#9ca3af]' },
  { label: '검정', fill: '#111827', bg: 'bg-[#111827]' },
  { label: '남색', fill: '#1e3a5f', bg: 'bg-[#1e3a5f]' },
  { label: '파랑', fill: '#3b82f6', bg: 'bg-[#3b82f6]' },
  { label: '하늘', fill: '#7dd3fc', bg: 'bg-[#7dd3fc]' },
  { label: '청록', fill: '#06b6d4', bg: 'bg-[#06b6d4]' },
  { label: '보라', fill: '#a855f7', bg: 'bg-[#a855f7]' },
  { label: '핑크', fill: '#f472b6', bg: 'bg-[#f472b6]' },
  { label: '빨강', fill: '#ef4444', bg: 'bg-[#ef4444]' },
  { label: '노랑', fill: '#fbbf24', bg: 'bg-[#fbbf24]' },
  { label: '초록', fill: '#22c55e', bg: 'bg-[#22c55e]' },
  { label: '갈색', fill: '#92400e', bg: 'bg-[#92400e]' },
]

export function BackgroundPanel({ canvas, history, layerTree }: BackgroundPanelProps) {
  const handleColorClick = useCallback(
    (fill: string, label: string) => {
      if (!canvas || !history) {
        showToast('편집기가 준비되지 않았습니다.', 'error')
        return
      }

      // B.1 fix: 기존 background 객체가 있으면 fill 만 교체 (누적 방지)
      const existingBg = canvas._fabricCanvas
        .getObjects()
        .find((o) => (o as { data?: { kind?: string } }).data?.kind === 'background')

      if (existingBg) {
        // 기존 배경 객체 fill 만 교체 — 새 객체 추가 없음
        existingBg.set({ fill })
        canvas._fabricCanvas.sendObjectToBack(existingBg)
        canvas._fabricCanvas.requestRenderAll()
        showToast(`${label} 배경이 적용됐어요.`, 'success')
        return
      }

      // 배경 없음 → 새로 생성 (canvas.format 으로 실제 판형 크기 사용)
      const format = canvas.format
      const widthPx = canvas.mmToPx(format.widthMm)
      const heightPx = canvas.mmToPx(format.heightMm)

      const rect = new Rect({
        left: 0,
        top: 0,
        width: widthPx,
        height: heightPx,
        fill,
        selectable: true,
        evented: true,
      })

      const cmd = new AddObjectCommand({
        canvas,
        fabricObj: rect,
        dataOverrides: { kind: 'background' },
      })
      history.push(cmd)

      // 배경은 맨 뒤로 — fabric API + layerTree 양쪽 동기화
      const id = cmd.assignedId
      if (id) {
        // fabric 직접 sendToBack (즉시 반영 보장)
        canvas._fabricCanvas.sendObjectToBack(rect)
        canvas._fabricCanvas.requestRenderAll()
        // layerTree 도 동기화 (레이어 패널 반영)
        if (layerTree) layerTree.sendToBack(id)
      }

      showToast(`${label} 배경이 적용됐어요.`, 'success')
    },
    [canvas, history, layerTree],
  )

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <section>
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--editor-text-muted)]">
          단색
        </h3>
        <div className="grid grid-cols-7 gap-2.5">
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
