'use client'

// ─────────────────────────────────────────────
// PosePanel — 포즈 도구 패널 (M2 에서 활성화)
// ─────────────────────────────────────────────

import { cn } from '@storywork/ui'
import { UserSquare2 } from 'lucide-react'
import React from 'react'

export function PosePanel() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {/* 비활성 안내 카드 */}
      <div
        className={cn(
          'flex flex-col items-center gap-3 rounded-[var(--radius-lg)]',
          'border border-dashed border-[var(--color-pose-500)]',
          'bg-[var(--color-pose-500)]/5 px-6 py-8 text-center',
        )}
      >
        <UserSquare2 className="size-10 text-[var(--color-pose-500)]" aria-hidden="true" />
        <div>
          <p className="text-[14px] font-semibold text-[var(--editor-text)]">포즈 라이브러리</p>
          <p className="mt-1 text-[13px] text-[var(--editor-text-muted)]">
            M2 에서 1,260개 PNG 활성화 예정
          </p>
          <p className="mt-2 text-[12px] text-[var(--editor-text-muted)]">
            시점 · 감정 · 액션 · 체형별 검색 + 드래그 추가
          </p>
        </div>
      </div>
    </div>
  )
}
