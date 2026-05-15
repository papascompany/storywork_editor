'use client'

// ─────────────────────────────────────────────
// BubblePanel — 말풍선 도구 패널 (FeatureSidebar 내부)
//
// 5종 모양 그리드:
//   rounded-rect / cloud / spike / oval / caption
//
// 클릭 → AddBubbleCommand 실행 (자동 화자 감지 + 꼬리 자동 향함)
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import { cn, showToast } from '@storywork/ui'
import React, { useCallback } from 'react'

import type { HistoryRef as History } from '../types'

// ─── 모양 정의 ───────────────────────────────────────────────────────────────

type ShapeDef = {
  id: string
  label: string
  Icon: React.ComponentType<{ className?: string }>
}

// SVG 아이콘 (인라인) — 말풍선 5종
function RoundedRectIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 36"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="44" height="26" rx="6" />
      <path d="M16 28 L20 34 L24 28" fill="currentColor" stroke="none" />
    </svg>
  )
}

function CloudIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 36"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M6 22 Q2 22 2 18 Q2 14 6 14 Q6 8 12 8 Q14 4 20 4 Q26 4 28 8 Q34 8 34 14 Q38 14 38 18 Q38 22 34 22 Z" />
      <circle cx="14" cy="27" r="2" fill="currentColor" stroke="none" />
      <circle cx="20" cy="31" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="26" cy="34" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function SpikeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <polygon points="24,2 30,10 40,6 36,16 46,18 38,24 46,30 36,32 40,42 30,38 24,46 18,38 8,42 12,32 2,30 10,24 2,18 12,16 8,6 18,10" />
    </svg>
  )
}

function OvalIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 36"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <ellipse cx="24" cy="15" rx="22" ry="13" />
      <path d="M20 28 L24 34 L28 28" fill="currentColor" stroke="none" />
    </svg>
  )
}

function CaptionIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 36"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeDasharray="4 2"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="44" height="26" />
      <line x1="8" y1="11" x2="40" y2="11" />
      <line x1="8" y1="18" x2="30" y2="18" />
    </svg>
  )
}

const BUBBLE_SHAPE_DEFS: ShapeDef[] = [
  { id: 'rounded-rect', label: '둥근 사각', Icon: RoundedRectIcon },
  { id: 'cloud', label: '구름', Icon: CloudIcon },
  { id: 'spike', label: '외침', Icon: SpikeIcon },
  { id: 'oval', label: '타원', Icon: OvalIcon },
  { id: 'caption', label: '내레이션', Icon: CaptionIcon },
]

// ─── BubblePanel ─────────────────────────────────────────────────────────────

export type BubblePanelProps = {
  canvas: StoryCanvas | null
  history: History | null
}

export function BubblePanel({ canvas, history }: BubblePanelProps) {
  const handleShapeClick = useCallback(
    async (shapeId: string) => {
      if (!canvas || !history) {
        showToast('편집기가 준비되지 않았습니다.', 'error')
        return
      }

      const fc = canvas._fabricCanvas
      // 페이지 px 기준 좌표 계산 (fc.getWidth() 는 canvas DOM 크기이므로 사용 불가)
      const format = canvas.format
      const pageW = canvas.mmToPx(format.widthMm)
      const pageH = canvas.mmToPx(format.heightMm)

      // 페이지 정중앙에 배치
      const bubbleW = canvas.mmToPx(60) // 60mm
      const bubbleH = canvas.mmToPx(25) // 25mm
      const left = (pageW - bubbleW) / 2
      const top = (pageH - bubbleH) / 2

      try {
        const { AddBubbleCommand } = await import('@storywork/editor-bubble')
        const cmd = new AddBubbleCommand({
          canvas,
          bubbleOpts: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            shape: shapeId as any,
            left,
            top,
            width: bubbleW,
            height: bubbleH,
            text: '',
          },
          autoDetectSpeaker: true,
        })
        history.push(cmd)

        // 추가 후 자동 선택
        const addedId = cmd.assignedId
        if (addedId) {
          const fabricObj = canvas.getObject(addedId)
          if (fabricObj) {
            fc.setActiveObject(fabricObj)
            fc.requestRenderAll()
          }
        }

        showToast('말풍선이 추가되었습니다.', 'success')
      } catch (err) {
        console.error('[BubblePanel] 말풍선 추가 실패:', err)
        showToast('말풍선 추가에 실패했습니다.', 'error')
      }
    },
    [canvas, history],
  )

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      {/* 설명 */}
      <p className="text-[12px] text-[var(--editor-text-muted)] leading-relaxed">
        모양을 선택하면 캔버스 중앙에 말풍선이 추가됩니다.
        <br />
        포즈가 있으면 꼬리가 가장 가까운 캐릭터의 입을 자동으로 향합니다.
      </p>

      {/* 5종 모양 그리드 */}
      <section aria-label="말풍선 모양 선택">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--editor-text-muted)]">
          모양
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {BUBBLE_SHAPE_DEFS.map((def) => (
            <button
              key={def.id}
              type="button"
              aria-label={`${def.label} 말풍선 추가`}
              onClick={() => void handleShapeClick(def.id)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-[var(--radius-md)]',
                'border border-[var(--editor-border)]',
                'px-3 py-4',
                'bg-[var(--color-surface)] text-[var(--editor-text)]',
                'hover:bg-[var(--editor-hover)] hover:border-[var(--color-brand-400)]',
                'hover:text-[var(--color-brand-600)]',
                'transition-colors duration-[var(--duration-fast)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
              )}
            >
              <def.Icon className="size-10 text-[var(--editor-text-muted)]" />
              <span className="text-[11px] font-medium">{def.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 안내 */}
      <div
        className={cn(
          'rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)]',
          'p-3 text-[11px] text-[var(--color-text-muted)]',
        )}
      >
        <p className="font-medium mb-1">꼬리 자동 추적</p>
        <p className="opacity-80">
          포즈 캐릭터를 이동하면 꼬리가 실시간으로 입(mouth)을 향합니다. ControlBar의 화자 섹션에서
          수동으로 변경할 수 있습니다.
        </p>
      </div>
    </div>
  )
}
