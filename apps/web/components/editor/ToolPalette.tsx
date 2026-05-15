'use client'

// ─────────────────────────────────────────────
// ToolPalette — 좌측 툴 (Select / Pose / Background)
// ─────────────────────────────────────────────

import { cn } from '@storywork/ui'
import { ImageIcon, MousePointer2, RectangleHorizontal } from 'lucide-react'

export type ToolId = 'select' | 'pose' | 'background'

type ToolPaletteProps = {
  activeTool: ToolId
  onToolChange: (tool: ToolId) => void
  onAddPose: () => void
  onAddBackground: () => void
}

type ToolDef = {
  id: ToolId
  label: string
  icon: React.ReactNode
  shortcut?: string
}

const TOOLS: ToolDef[] = [
  { id: 'select', label: '선택', icon: <MousePointer2 className="size-5" />, shortcut: 'V' },
  { id: 'pose', label: '포즈 추가', icon: <ImageIcon className="size-5" /> },
  { id: 'background', label: '배경 추가', icon: <RectangleHorizontal className="size-5" /> },
]

export function ToolPalette({
  activeTool,
  onToolChange,
  onAddPose,
  onAddBackground,
}: ToolPaletteProps) {
  const handleClick = (tool: ToolDef) => {
    onToolChange(tool.id)
    if (tool.id === 'pose') onAddPose()
    if (tool.id === 'background') onAddBackground()
  }

  return (
    <aside
      aria-label="도구 팔레트"
      className={cn(
        'hidden md:flex',
        'w-16 shrink-0 flex-col items-center gap-1 border-r border-[var(--color-border)]',
        'bg-[var(--color-surface)] py-3',
      )}
    >
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          onClick={() => handleClick(tool)}
          aria-label={tool.label}
          aria-pressed={activeTool === tool.id}
          title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
          className={cn(
            'flex size-11 flex-col items-center justify-center rounded-[var(--radius-md)]',
            'text-[var(--color-text-muted)] transition-colors',
            'hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--editor-focus)]',
            activeTool === tool.id && 'bg-[var(--editor-active)] text-[var(--editor-selected-fg)]',
          )}
        >
          {tool.icon}
          <span className="mt-0.5 text-[10px] leading-tight">{tool.label.split(' ')[0]}</span>
        </button>
      ))}
    </aside>
  )
}
