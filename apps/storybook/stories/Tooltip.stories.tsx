import type { Meta, StoryObj } from '@storybook/react'
import { Tooltip } from '@storywork/ui'
import { Bold, Download, Redo, Undo } from 'lucide-react'
import * as React from 'react'

/**
 * Tooltip 스토리
 *
 * side: top / right / bottom / left
 * shortcut: 단축키 표시
 */

const meta = {
  title: 'UI/Tooltip',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Radix UI Tooltip 베이스. 200ms 지연, 빠른 호버 전환(skipDelayDuration=0). shortcut prop으로 단축키를 kbd 스타일로 표시합니다.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ─── 공통 trigger 스타일 ─────────────────────────────────────────────────────

function IconBtn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="size-11 flex items-center justify-center rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors"
    >
      {children}
    </button>
  )
}

// ─── 4방향 ────────────────────────────────────────────────────────────────────

export const AllSides: Story = {
  name: '4방향 (top / right / bottom / left)',
  render: () => (
    <div className="grid grid-cols-2 gap-6 p-8">
      <div className="flex flex-col items-center gap-2">
        <Tooltip content="위쪽 툴팁" side="top">
          <IconBtn label="위">
            <Undo className="size-5" />
          </IconBtn>
        </Tooltip>
        <span className="text-xs text-[var(--color-text-muted)]">top</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <Tooltip content="오른쪽 툴팁" side="right">
          <IconBtn label="오른쪽">
            <Redo className="size-5" />
          </IconBtn>
        </Tooltip>
        <span className="text-xs text-[var(--color-text-muted)]">right</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <Tooltip content="아래쪽 툴팁" side="bottom">
          <IconBtn label="아래">
            <Bold className="size-5" />
          </IconBtn>
        </Tooltip>
        <span className="text-xs text-[var(--color-text-muted)]">bottom</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <Tooltip content="왼쪽 툴팁" side="left">
          <IconBtn label="왼쪽">
            <Download className="size-5" />
          </IconBtn>
        </Tooltip>
        <span className="text-xs text-[var(--color-text-muted)]">left</span>
      </div>
    </div>
  ),
}

// ─── 단축키 ──────────────────────────────────────────────────────────────────

export const WithShortcut: Story = {
  name: '단축키 표시 (shortcut prop)',
  render: () => (
    <div className="flex gap-4 p-8">
      <Tooltip content="실행 취소" shortcut="Cmd+Z" side="bottom">
        <IconBtn label="실행 취소">
          <Undo className="size-5" />
        </IconBtn>
      </Tooltip>

      <Tooltip content="다시 실행" shortcut="Cmd+Shift+Z" side="bottom">
        <IconBtn label="다시 실행">
          <Redo className="size-5" />
        </IconBtn>
      </Tooltip>

      <Tooltip content="다운로드" shortcut="Cmd+S" side="bottom">
        <IconBtn label="다운로드">
          <Download className="size-5" />
        </IconBtn>
      </Tooltip>
    </div>
  ),
}

// ─── 긴 텍스트 ───────────────────────────────────────────────────────────────

export const LongContent: Story = {
  name: '긴 텍스트 (max-width 280px)',
  render: () => (
    <Tooltip
      content="AI가 대본을 분석해 장면별로 포즈와 배경을 자동 배치합니다. 결과는 편집기에서 수정할 수 있습니다."
      side="top"
    >
      <IconBtn label="AI 자동 배치">
        <Bold className="size-5" />
      </IconBtn>
    </Tooltip>
  ),
}

// ─── 도구 팔레트 시뮬레이션 ──────────────────────────────────────────────────

export const ToolPalette: Story = {
  name: '도구 팔레트 시뮬레이션',
  render: () => (
    <div className="flex flex-col gap-1 p-2 bg-[var(--color-surface-raised)] rounded-xl border border-[var(--color-border)] w-12">
      <Tooltip content="실행 취소" shortcut="Cmd+Z" side="right">
        <IconBtn label="실행 취소">
          <Undo className="size-4" />
        </IconBtn>
      </Tooltip>
      <Tooltip content="다시 실행" shortcut="Cmd+Y" side="right">
        <IconBtn label="다시 실행">
          <Redo className="size-4" />
        </IconBtn>
      </Tooltip>
      <Tooltip content="내보내기" shortcut="Cmd+E" side="right">
        <IconBtn label="내보내기">
          <Download className="size-4" />
        </IconBtn>
      </Tooltip>
    </div>
  ),
}
