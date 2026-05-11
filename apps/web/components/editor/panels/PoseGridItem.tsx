'use client'

// ─────────────────────────────────────────────
// PoseGridItem — 포즈 그리드 한 칸
//
// - 정사각형 카드 (1:1 비율, max 132×132)
// - 썸네일 lazy loading + 드래그/클릭 지원
// - lowDpi 자산: 우상단 ⚠ 뱃지 (Tooltip "저해상도")
// - 키보드: Tab 포커스 + Enter/Space 로 추가
// - HTML5 dragstart: dataTransfer 에 application/x-storywork-pose JSON
// ─────────────────────────────────────────────

import { cn, Tooltip } from '@storywork/ui'
import { AlertTriangle, Plus } from 'lucide-react'
import Image from 'next/image'
import React, { useCallback } from 'react'

import type { ResourceSummary } from '../../../app/api/_lib/search-types'

// MIME 타입 상수 (EditorCanvas onDrop 에서도 동일하게 사용)
export const POSE_DRAG_MIME = 'application/x-storywork-pose'

export type PoseDragPayload = {
  id: string
  slug: string
  fileUrl: string | null
  masterDpi: number | null
  lowDpi: boolean
  meta: ResourceSummary['meta']
}

export type PoseGridItemProps = {
  pose: ResourceSummary
  onAddToCanvas: (pose: ResourceSummary) => void
}

export function PoseGridItem({ pose, onAddToCanvas }: PoseGridItemProps): React.JSX.Element {
  // 클릭 핸들러
  const handleClick = useCallback(() => {
    onAddToCanvas(pose)
  }, [onAddToCanvas, pose])

  // 키보드 핸들러 (Enter / Space)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onAddToCanvas(pose)
      }
    },
    [onAddToCanvas, pose],
  )

  // 드래그 시작: dataTransfer 에 MIME + JSON
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      const payload: PoseDragPayload = {
        id: pose.id,
        slug: pose.slug,
        fileUrl: pose.thumbUrl, // 드래그 시에는 thumbUrl 사용, 실제 추가 시 fileUrl 로 교체
        masterDpi: pose.masterDpi,
        lowDpi: pose.lowDpi,
        meta: pose.meta,
      }
      e.dataTransfer.setData(POSE_DRAG_MIME, JSON.stringify(payload))
      e.dataTransfer.effectAllowed = 'copy'
    },
    [pose],
  )

  const label = pose.slug.replace(/-/g, ' ')

  return (
    <button
      type="button"
      draggable
      aria-label={`${label} 캔버스에 추가`}
      title={label}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragStart={handleDragStart}
      className={cn(
        // 정사각형
        'group relative aspect-square w-full',
        // 최대 크기
        'max-w-[132px]',
        // 형태
        'overflow-hidden rounded-[var(--radius-md)]',
        // 테두리
        'border border-[var(--editor-border)]',
        // 배경
        'bg-[var(--color-surface-muted)]',
        // 포커스
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
        // 트랜지션
        'transition-all duration-[var(--duration-fast)]',
        'hover:border-[var(--color-brand-400)] hover:shadow-md',
        // 터치 타겟 ≥ 44px (aspect-square + width 보장)
        'min-h-[44px]',
      )}
    >
      {/* 썸네일 이미지 */}
      {pose.thumbUrl ? (
        <Image
          src={pose.thumbUrl}
          alt={label}
          fill
          sizes="132px"
          draggable={false}
          className={cn(
            'object-contain',
            'transition-transform duration-[var(--duration-fast)]',
            'group-hover:scale-105',
            // prefers-reduced-motion 존중
            'motion-reduce:transition-none motion-reduce:group-hover:scale-100',
          )}
        />
      ) : (
        // 썸네일 없음 — 플레이스홀더
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] text-[var(--editor-text-muted)]" aria-hidden="true">
            {pose.slug.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}

      {/* hover 오버레이 + 추가 버튼 */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 flex items-center justify-center',
          'bg-black/50',
          'opacity-0 transition-opacity duration-[var(--duration-fast)]',
          'group-hover:opacity-100 group-focus-visible:opacity-100',
          'motion-reduce:transition-none',
        )}
      >
        <Plus className="size-6 text-white drop-shadow-sm" aria-hidden="true" />
      </div>

      {/* lowDpi 뱃지 (우상단) */}
      {pose.lowDpi && (
        <Tooltip content="저해상도 자산 — 작은 슬롯 권장" side="top">
          <span
            aria-label="저해상도 자산"
            className={cn(
              'absolute right-1 top-1 z-10',
              'flex h-5 w-5 items-center justify-center',
              'rounded-full bg-[var(--color-warning-500,#f59e0b)]',
              'text-white shadow-sm',
            )}
          >
            <AlertTriangle className="size-3" aria-hidden="true" />
          </span>
        </Tooltip>
      )}
    </button>
  )
}
