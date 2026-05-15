'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

// ─────────────────────────────────────────────
// FeatureSidebar — 도구 클릭 시 슬라이드 패널 (290px)
//
// 레이아웃:
//   [ToolBar 72px] → [FeatureSidebar 0~290px] → [EditorCanvas]
//
// 동작:
//   - 도구 클릭 → 열림 (200ms ease-out 슬라이드)
//   - 같은 도구 재클릭 → 닫힘
//   - Esc 키 → 닫힘
//   - 우상단 X 버튼 → 닫힘
//   - 모바일(md 미만): 숨김
//
// 각 도구 패널은 lazy import 없이 직접 분기 (11종 소규모 = overhead 무관)
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import type { LayerTree } from '@storywork/editor-layers'
import { cn } from '@storywork/ui'
import {
  Image,
  LayoutTemplate,
  MessageCircle,
  MousePointer2,
  Search,
  Shapes,
  Sparkles,
  Stars,
  Type,
  Upload,
  UserSquare2,
  Wand2,
  X,
} from 'lucide-react'
import React, { useCallback, useEffect } from 'react'

import type { ResourceSummary } from '../../app/api/_lib/search-types'

import { BackgroundPanel } from './panels/BackgroundPanel'
import { BubblePanel } from './panels/BubblePanel'
import { PlaceholderPanel } from './panels/PlaceholderPanel'
import { PosePanel } from './panels/PosePanel'
import { ShapePanel } from './panels/ShapePanel'
import { TemplatePanel } from './panels/TemplatePanel'
import { TextPanel } from './panels/TextPanel'
import { WordFxPanel } from './panels/WordFxPanel'
import type { ToolId } from './store/useToolStore'
import { useToolStore } from './store/useToolStore'
import type { HistoryRef as History } from './types'

// ─── 도구별 메타 ─────────────────────────────────────────────────────────────

type ToolMeta = {
  label: string
  Icon: React.ComponentType<{ className?: string }>
  milestone?: string
  description?: string
}

const TOOL_META: Record<ToolId, ToolMeta> = {
  select: {
    label: '선택',
    Icon: MousePointer2,
  },
  template: {
    label: '템플릿',
    Icon: LayoutTemplate,
    milestone: 'M3',
    description: '추천 템플릿 + 즐겨찾기 페이지 레이아웃',
  },
  pose: {
    label: '포즈',
    Icon: UserSquare2,
    // M2-05 에서 활성화 — milestone 제거
  },
  background: {
    label: '배경',
    Icon: Image,
  },
  bubble: {
    label: '말풍선',
    Icon: MessageCircle,
    // M5-02 에서 활성화됨 — milestone 제거
    description: '꼬리 방향 자동 화자 추적 · 5종 모양 · 한글 텍스트',
  },
  wordfx: {
    label: '워드효과',
    Icon: Sparkles,
    // M5-03 에서 활성화됨 — milestone 제거
    description: '45종 워드 효과 — 그림자, 외곽선, 글로우, 그라디언트, 금속, 변형 등',
  },
  decoration: {
    label: '꾸미기',
    Icon: Stars,
    milestone: 'M3',
    description: '스티커 · 프레임 · 배지',
  },
  shape: {
    label: '도형',
    Icon: Shapes,
  },
  text: {
    label: '텍스트',
    Icon: Type,
    // M5-01 에서 활성화됨 (Phase 2) — milestone 제거
    description: '한글 줄바꿈 · 금칙어 처리 · 말풍선 대사 자동 흐름',
  },
  upload: {
    label: '업로드',
    Icon: Upload,
    milestone: 'M7',
    description: '크리에이터 구독 후 마이데이터 업로드 가능',
  },
  ai: {
    label: 'AI 자동배치',
    Icon: Wand2,
    milestone: 'M4',
    description: '대본 붙여넣기 → 장면 분리 → 포즈/배경 자동 배치',
  },
}

// ─── 패널 검색창 (패널 내부 공통 상단) ───────────────────────────────────────

type PanelSearchProps = {
  label: string
  disabled?: boolean
}

function PanelSearch({ label, disabled = false }: PanelSearchProps) {
  // 검색창 영역 — 좌우 16px, 상하 12px 호흡감
  return (
    <div className="relative px-4 py-3.5 border-b border-[var(--editor-border)]">
      <Search
        className="absolute left-7 top-1/2 -translate-y-1/2 size-4 text-[var(--editor-text-muted)] pointer-events-none"
        aria-hidden="true"
      />
      <input
        type="search"
        aria-label={`${label} 검색`}
        placeholder={`${label} 검색...`}
        disabled={disabled}
        className={cn(
          'w-full rounded-[var(--radius-md)]',
          'border border-[var(--editor-border)]',
          'bg-[var(--color-surface-muted)]',
          'pl-8 pr-3 py-1.5',
          'text-[13px] text-[var(--editor-text)]',
          'placeholder:text-[var(--editor-text-muted)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--editor-focus)] focus:border-transparent',
          'transition-colors duration-[var(--duration-fast)]',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      />
    </div>
  )
}

// ─── 패널 콘텐츠 렌더 ─────────────────────────────────────────────────────────

type PanelContentProps = {
  tool: ToolId
  canvas: StoryCanvas | null
  history: History | null
  layerTree: LayerTree | null
  onAddPoseToCanvas?: (pose: ResourceSummary) => void
}

function PanelContent({ tool, canvas, history, layerTree, onAddPoseToCanvas }: PanelContentProps) {
  switch (tool) {
    case 'template':
      return <TemplatePanel canvas={canvas} />
    case 'background':
      return <BackgroundPanel canvas={canvas} history={history as any} layerTree={layerTree} />
    case 'shape':
      return <ShapePanel canvas={canvas} history={history as any} />
    case 'pose':
      return (
        <PosePanel
          canvas={canvas}
          history={history as any}
          onAddToCanvas={onAddPoseToCanvas ?? (() => {})}
        />
      )
    case 'text':
      return <TextPanel canvas={canvas} history={history as any} />
    case 'bubble':
      return <BubblePanel canvas={canvas} history={history as any} />
    case 'wordfx':
      return <WordFxPanel canvas={canvas} history={history as any} />
    default: {
      const meta = TOOL_META[tool]
      return (
        <PlaceholderPanel
          label={meta.label}
          icon={<meta.Icon className="size-10" />}
          milestone={meta.milestone ?? '향후'}
          description={meta.description}
        />
      )
    }
  }
}

// ─── FeatureSidebar ──────────────────────────────────────────────────────────

export type FeatureSidebarProps = {
  canvas: StoryCanvas | null
  history: History | null
  layerTree: LayerTree | null
  onAddPoseToCanvas?: (pose: ResourceSummary) => void
}

export function FeatureSidebar({
  canvas,
  history,
  layerTree,
  onAddPoseToCanvas,
}: FeatureSidebarProps) {
  const { active, sidebarOpen, setSidebarOpen } = useToolStore()

  // select 도구는 패널 없음 → 항상 닫힘
  const isVisible = sidebarOpen && active !== 'select'

  const handleClose = useCallback(() => {
    setSidebarOpen(false)
  }, [setSidebarOpen])

  // Esc 키 → 닫힘 (input/textarea 포커스 시 무시)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const target = e.target as HTMLElement | null
      if (!target) return
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
        return
      }
      handleClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleClose])

  const meta = TOOL_META[active as ToolId]
  const PanelIcon = meta.Icon
  const isSearchEnabled = active === 'background' || active === 'shape' || active === 'pose'
  // text/bubble/template 패널은 자체 UI 가 있으므로 검색창 숨김

  return (
    <aside
      aria-label={`${meta.label} 패널`}
      aria-hidden={!isVisible}
      data-testid="feature-sidebar"
      style={{
        width: isVisible ? '290px' : '0px',
        minWidth: isVisible ? '290px' : '0px',
      }}
      className={cn(
        // 모바일: 숨김
        'hidden md:flex',
        // 레이아웃
        'flex-col shrink-0 overflow-hidden',
        // 배경/테두리
        'bg-[var(--editor-panel)] border-r border-[var(--editor-border)]',
        // 그림자
        'shadow-[var(--elevation-e2)]',
        // 슬라이드 애니메이션 (prefers-reduced-motion 에서 비활성)
        'transition-[width,min-width] duration-200 ease-out',
        '@media(prefers-reduced-motion:reduce):transition-none',
        // z-index
        'z-[100]',
        // 열린 상태가 아닐 때 border 숨김
        !isVisible && 'border-r-0',
      )}
    >
      {/* 콘텐츠 — isVisible 일 때만 렌더 (w-0 상태에서 overflow-hidden 으로 가림) */}
      <div
        className={cn(
          'flex flex-col w-[290px] h-full',
          'transition-opacity duration-200',
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        aria-live="polite"
        aria-atomic="false"
      >
        {/* 패널 헤더 — px-4 py-3 → px-4 py-3.5 로 수직 호흡감 */}
        <div
          className={cn(
            'flex items-center justify-between',
            'px-4 py-3.5',
            'border-b border-[var(--editor-border)]',
            // 패널 헤더 미세 강조
            'bg-[var(--editor-panel)]',
            'shrink-0',
          )}
        >
          <div className="flex items-center gap-2">
            <PanelIcon className="size-4 text-[var(--editor-accent)]" aria-hidden="true" />
            <h2 className="text-[13px] font-semibold tracking-[-0.1px] text-[var(--editor-text)] truncate">
              {meta.label}
            </h2>
          </div>

          {/* 닫기 버튼 */}
          <button
            type="button"
            aria-label="패널 닫기"
            onClick={handleClose}
            className={cn(
              'flex size-7 items-center justify-center rounded-[var(--radius-sm)]',
              'text-[var(--editor-text-muted)]',
              'hover:bg-[var(--editor-hover)] hover:text-[var(--editor-text)]',
              'transition-colors duration-[var(--duration-fast)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--editor-focus)]',
            )}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* 검색창 — pose/text/bubble/template/wordfx 패널은 자체 UI 를 가지므로 숨김 */}
        {active !== 'pose' &&
          active !== 'text' &&
          active !== 'bubble' &&
          active !== 'template' &&
          active !== 'wordfx' && <PanelSearch label={meta.label} disabled={!isSearchEnabled} />}

        {/* 패널 콘텐츠 */}
        <div className="flex-1 overflow-hidden">
          {isVisible && (
            <PanelContent
              tool={active}
              canvas={canvas}
              history={history as any}
              layerTree={layerTree}
              onAddPoseToCanvas={onAddPoseToCanvas}
            />
          )}
        </div>
      </div>
    </aside>
  )
}
