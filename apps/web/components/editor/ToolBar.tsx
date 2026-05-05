'use client'

// ─────────────────────────────────────────────
// ToolBar — 좌측 11종 도구 팔레트 (72px 컬럼)
//
// 디자인:
//   - 너비 72px, 높이 100% (TopBar 아래)
//   - 각 버튼 56×56px 클릭 영역, 아이콘 24px + 라벨 11px
//   - 활성 도구: var(--editor-active) 배경 + 좌측 3px 액센트 바
//   - 비활성(미구현): 50% opacity + 작은 Lock 표시
//   - 호버: var(--editor-hover) + Tooltip (라벨 + 단축키)
//   - 모바일 (md 미만): 숨김 → MobileBottomSheet 의 Tools 탭
//   - 다크모드 자동
// ─────────────────────────────────────────────

import { Tooltip, cn, showToast } from '@storywork/ui'
import {
  Image,
  LayoutTemplate,
  Lock,
  MessageCircle,
  MousePointer2,
  Shapes,
  Sparkles,
  Stars,
  Type,
  Upload,
  UserSquare2,
  Wand2,
} from 'lucide-react'
import React, { useCallback, useEffect } from 'react'

import { ACTIVE_TOOLS, TOOL_MILESTONE, type ToolId, useToolStore } from './store/useToolStore'

// ─── 도구 정의 ────────────────────────────────────────────────────────────────

type ToolDef = {
  id: ToolId
  label: string
  Icon: React.ComponentType<{ className?: string }>
  shortcut: string
}

const TOOL_DEFS: ToolDef[] = [
  { id: 'template', label: '템플릿', Icon: LayoutTemplate, shortcut: 'T' },
  { id: 'pose', label: '포즈', Icon: UserSquare2, shortcut: 'P' },
  { id: 'background', label: '배경', Icon: Image, shortcut: 'B' },
  { id: 'bubble', label: '말풍선', Icon: MessageCircle, shortcut: 'Q' },
  { id: 'wordfx', label: '워드효과', Icon: Sparkles, shortcut: 'W' },
  { id: 'decoration', label: '꾸미기', Icon: Stars, shortcut: 'D' },
  { id: 'shape', label: '도형', Icon: Shapes, shortcut: 'S' },
  { id: 'text', label: '텍스트', Icon: Type, shortcut: 'X' },
  { id: 'upload', label: '업로드', Icon: Upload, shortcut: 'U' },
  { id: 'ai', label: 'AI 자동배치', Icon: Wand2, shortcut: 'I' },
]

const SELECT_DEF: ToolDef = {
  id: 'select',
  label: '선택',
  Icon: MousePointer2,
  shortcut: 'V',
}

// ─── ToolButton ───────────────────────────────────────────────────────────────

type ToolButtonProps = {
  def: ToolDef
  isActive: boolean
  isEnabled: boolean
  onClick: () => void
}

function ToolButton({ def, isActive, isEnabled, onClick }: ToolButtonProps) {
  const { Icon, label, shortcut } = def
  const tooltipContent = isEnabled ? label : `${label} (${TOOL_MILESTONE[def.id] ?? '향후'} 활성화)`

  return (
    <Tooltip content={tooltipContent} shortcut={shortcut} side="right" sideOffset={8}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={isActive}
        aria-disabled={!isEnabled}
        onClick={onClick}
        className={cn(
          // 기본 레이아웃
          'relative flex w-14 flex-col items-center justify-center gap-0.5',
          'h-14 rounded-[var(--radius-md)]',
          // 전환
          'transition-colors duration-[var(--duration-fast)]',
          // 포커스
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
          // 비활성 도구 스타일
          !isEnabled && 'opacity-50',
          // 호버 (비활성이어도 호버는 동작 — 클릭 시 Toast 표시)
          'hover:bg-[var(--editor-hover)]',
          // 활성 도구 스타일
          isActive
            ? 'bg-[var(--editor-active)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
        )}
      >
        {/* 활성 인디케이터 바 (좌측 3px) */}
        {isActive && (
          <span
            aria-hidden="true"
            className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--color-brand-500)]"
          />
        )}

        {/* 아이콘 */}
        <Icon className="size-6" aria-hidden="true" />

        {/* 라벨 */}
        <span className="text-[11px] font-medium leading-tight">{label}</span>

        {/* 비활성 Lock 뱃지 */}
        {!isEnabled && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 flex size-3.5 items-center justify-center rounded-full bg-[var(--color-surface-muted)]"
          >
            <Lock className="size-2.5 text-[var(--color-text-muted)]" />
          </span>
        )}
      </button>
    </Tooltip>
  )
}

// ─── ToolBar ─────────────────────────────────────────────────────────────────

export function ToolBar() {
  const { active, tapTool } = useToolStore()

  // 도구 클릭 핸들러
  const handleToolClick = useCallback(
    (def: ToolDef) => {
      if (!ACTIVE_TOOLS.has(def.id)) {
        // 비활성 도구 → Toast 안내
        const milestone = TOOL_MILESTONE[def.id] ?? '향후'
        showToast(`${def.label}은 ${milestone}에서 활성화 예정입니다.`, 'info')
        return
      }
      tapTool(def.id)
    },
    [tapTool],
  )

  // 단축키 바인딩 (input/textarea 포커스 시 무시)
  useEffect(() => {
    const SHORTCUT_MAP: Record<string, ToolId> = {
      t: 'template',
      p: 'pose',
      b: 'background',
      q: 'bubble',
      w: 'wordfx',
      d: 'decoration',
      s: 'shape',
      x: 'text',
      u: 'upload',
      i: 'ai',
      v: 'select',
    }

    const onKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl 수식키가 있으면 무시 (브라우저 단축키 충돌 방지)
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const target = e.target as HTMLElement | null
      if (!target) return
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
        return
      }

      const tool = SHORTCUT_MAP[e.key.toLowerCase()]
      if (!tool) return

      e.preventDefault()

      if (!ACTIVE_TOOLS.has(tool)) {
        const def = [...TOOL_DEFS, SELECT_DEF].find((d) => d.id === tool)
        const milestone = TOOL_MILESTONE[tool] ?? '향후'
        showToast(`${def?.label ?? tool}은 ${milestone}에서 활성화 예정입니다.`, 'info')
        return
      }
      tapTool(tool)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [tapTool])

  return (
    <aside
      aria-label="도구 팔레트"
      className={cn(
        // 모바일: 숨김 (MobileBottomSheet 의 Tools 탭으로 대체)
        'hidden md:flex',
        // 레이아웃
        'w-[72px] shrink-0 flex-col items-center',
        'border-r border-[var(--editor-border)]',
        'bg-[var(--editor-panel)]',
        'py-2 gap-1',
        'overflow-y-auto',
        // z-index (FeatureSidebar 보다 위)
        'z-[101]',
      )}
      role="toolbar"
    >
      {/* 선택 도구 (항상 맨 위) */}
      <ToolButton
        def={SELECT_DEF}
        isActive={active === 'select'}
        isEnabled
        onClick={() => handleToolClick(SELECT_DEF)}
      />

      {/* 구분선 */}
      <div aria-hidden="true" className="my-1 h-px w-10 bg-[var(--editor-border)]" />

      {/* 나머지 10종 도구 */}
      {TOOL_DEFS.map((def) => (
        <ToolButton
          key={def.id}
          def={def}
          isActive={active === def.id}
          isEnabled={ACTIVE_TOOLS.has(def.id)}
          onClick={() => handleToolClick(def)}
        />
      ))}
    </aside>
  )
}
