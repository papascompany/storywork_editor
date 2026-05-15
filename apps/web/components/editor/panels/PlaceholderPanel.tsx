'use client'

// ─────────────────────────────────────────────
// PlaceholderPanel — 미활성 도구 공통 플레이스홀더
//
// M2~M7 마일스톤에서 활성화 예정인 도구들의
// 임시 패널. 라벨/아이콘/마일스톤 안내만 노출.
// ─────────────────────────="────────────────────────

import { cn } from '@storywork/ui'
import React from 'react'

type PlaceholderPanelProps = {
  label: string
  icon: React.ReactNode
  milestone: string
  description?: string
}

export function PlaceholderPanel({ label, icon, milestone, description }: PlaceholderPanelProps) {
  return (
    <div className="flex flex-col gap-5 px-6 py-5">
      <div
        className={cn(
          'flex flex-col items-center gap-3 rounded-[var(--radius-lg)]',
          'border border-dashed border-[var(--editor-border)]',
          'bg-[var(--color-surface-muted)] px-6 py-8 text-center',
        )}
      >
        <div className="text-[var(--editor-text-muted)] [&>svg]:size-10" aria-hidden="true">
          {icon}
        </div>
        <div>
          <p className="text-[14px] font-semibold text-[var(--editor-text)]">{label}</p>
          <p className="mt-1 text-[13px] text-[var(--editor-text-muted)]">
            {milestone} 에서 활성화 예정
          </p>
          {description && (
            <p className="mt-2 text-[12px] text-[var(--editor-text-muted)]">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}
