'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

// ─────────────────────────────────────────────
// MobileBottomSheet — 모바일 편집기 하단 시트
//
// M1-08f: 3 탭 유지 (도구 / 속성 / 레이어),
//         "도구" 탭 콘텐츠를 11종 그리드로 확장.
//         도구 클릭 → 패널 전환 + "← 뒤로" 버튼.
//         peek 상태에서 줌 컨트롤 인라인 노출.
//
// 높이 스냅:
//   peek  → 56px  (핸들 + 탭바 + 줌 인라인)
//   half  → 50dvh
//   full  → 90dvh
//
// 드래그 핸들 클릭 또는 Space/Enter 로 half → full → peek 순환.
// Esc 키로 peek 복귀.
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import type { LayerTree } from '@storywork/editor-layers'
import { cn } from '@storywork/ui'
import {
  BookOpen,
  ChevronLeft,
  Image,
  LayoutTemplate,
  Layers,
  MessageCircle,
  Minus,
  MousePointer2,
  Plus,
  Settings2,
  Shapes,
  Sparkles,
  Stars,
  Type,
  Upload,
  UserSquare2,
  Wand2,
} from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { ControlBar } from './ControlBar'
import { applyZoom, fitToViewport, getZoomPercent, MIN_ZOOM, MAX_ZOOM } from './Footer'
import type { ObjectProps } from './hooks/useSelection'
import { LayerPanel } from './LayerPanel'
import { PagePanel } from './page-system/PagePanel'
import { AlternativesSection } from './panels/alternatives-section'
import { BackgroundPanel } from './panels/BackgroundPanel'
import { PlaceholderPanel } from './panels/PlaceholderPanel'
import { ShapePanel } from './panels/ShapePanel'
import type { AlternativeCandidate } from './store/useAlternativesStore'
import { selectHasAlternatives, useAlternativesStore } from './store/useAlternativesStore'
import { ACTIVE_TOOLS, TOOL_MILESTONE, type ToolId, useToolStore } from './store/useToolStore'
import type { HistoryRef as History } from './types'

// ── 타입 ─────────────────────────────────────
export type SheetSnap = 'peek' | 'half' | 'full'

type Tab = 'tools' | 'inspector' | 'layers' | 'pages'

export type MobileBottomSheetProps = {
  activeTool: ToolId
  onToolChange: (tool: ToolId) => void
  onAddPose: () => void
  onAddBackground: () => void
  selectionProps: ObjectProps | null
  /** @deprecated ControlBar 로 교체됨, 하위 호환 유지 */
  onUpdateProps?: (patch: Partial<Omit<ObjectProps, 'id'>>) => void
  layerTree: LayerTree | null
  canvas: StoryCanvas | null
  history: History | null
  selectedIds: string[]
  closeRequest?: number
  /** 페이지 전환 콜백 (FOLLOWUP-46) */
  onPageChange?: (index: number) => void
  /** M4-05: 한 클릭 교체 콜백 */
  onApplyAlternative?: (candidate: AlternativeCandidate) => void
}

// ── 높이 상수 ─────────────────────────────────
const PEEK_HEIGHT = 56
const HALF_HEIGHT_CSS = '50dvh'
const FULL_HEIGHT_CSS = '90dvh'

function snapToHeight(snap: SheetSnap): string {
  if (snap === 'peek') return `${PEEK_HEIGHT}px`
  if (snap === 'half') return HALF_HEIGHT_CSS
  return FULL_HEIGHT_CSS
}

function nextSnap(current: SheetSnap): SheetSnap {
  if (current === 'peek') return 'half'
  if (current === 'half') return 'full'
  return 'peek'
}

// ── 도구 정의 ─────────────────────────────────
type ToolDef = {
  id: ToolId
  label: string
  Icon: React.ComponentType<{ className?: string }>
}

const TOOL_DEFS_GRID: ToolDef[] = [
  { id: 'select', label: '선택', Icon: MousePointer2 },
  { id: 'template', label: '템플릿', Icon: LayoutTemplate },
  { id: 'pose', label: '포즈', Icon: UserSquare2 },
  { id: 'background', label: '배경', Icon: Image },
  { id: 'bubble', label: '말풍선', Icon: MessageCircle },
  { id: 'wordfx', label: '워드효과', Icon: Sparkles },
  { id: 'decoration', label: '꾸미기', Icon: Stars },
  { id: 'shape', label: '도형', Icon: Shapes },
  { id: 'text', label: '텍스트', Icon: Type },
  { id: 'upload', label: '업로드', Icon: Upload },
  { id: 'ai', label: 'AI', Icon: Wand2 },
]

// ── 도구 → 패널 매핑 ─────────────────────────
type ToolPanelProps = {
  canvas: StoryCanvas | null
  history: History | null
  layerTree: LayerTree | null
}

function ToolPanel({ toolId, canvas, history, layerTree }: ToolPanelProps & { toolId: ToolId }) {
  switch (toolId) {
    case 'background':
      return <BackgroundPanel canvas={canvas} history={history} layerTree={layerTree} />
    case 'shape':
      return <ShapePanel canvas={canvas} history={history as any} />
    case 'template':
      return (
        <PlaceholderPanel
          label="템플릿"
          icon={<LayoutTemplate />}
          milestone="M3"
          description="판형 템플릿으로 빠르게 레이아웃을 구성합니다."
        />
      )
    case 'pose':
      return (
        <PlaceholderPanel
          label="포즈"
          icon={<UserSquare2 />}
          milestone="M2"
          description="1,000개 이상의 포즈 라이브러리에서 캐릭터를 배치합니다."
        />
      )
    case 'bubble':
      return (
        <PlaceholderPanel
          label="말풍선"
          icon={<MessageCircle />}
          milestone="M5"
          description="대화 말풍선과 꼬리 자동 추적 기능을 제공합니다."
        />
      )
    case 'wordfx':
      return (
        <PlaceholderPanel
          label="워드효과"
          icon={<Sparkles />}
          milestone="M5"
          description="50종의 워드효과로 감정을 표현합니다."
        />
      )
    case 'decoration':
      return (
        <PlaceholderPanel
          label="꾸미기"
          icon={<Stars />}
          milestone="M3"
          description="스티커, 아이콘 등 꾸미기 요소를 추가합니다."
        />
      )
    case 'text':
      return (
        <PlaceholderPanel
          label="텍스트"
          icon={<Type />}
          milestone="M5"
          description="한글 최적화 텍스트 편집과 금칙어 처리를 지원합니다."
        />
      )
    case 'upload':
      return (
        <PlaceholderPanel
          label="업로드"
          icon={<Upload />}
          milestone="M7"
          description="내 이미지와 리소스를 업로드하여 편집에 활용합니다."
        />
      )
    case 'ai':
      return (
        <PlaceholderPanel
          label="AI 자동배치"
          icon={<Wand2 />}
          milestone="M4"
          description="대본을 입력하면 AI가 장면과 포즈를 자동으로 배치합니다."
        />
      )
    default:
      return null
  }
}

// ── 11종 도구 그리드 탭 ──────────────────────────
type ToolsTabContentProps = {
  activeTool: ToolId
  onToolSelect: (tool: ToolDef) => void
}

function ToolsGridView({ activeTool, onToolSelect }: ToolsTabContentProps) {
  return (
    <div className="grid grid-cols-4 gap-2 p-4" role="toolbar" aria-label="편집 도구">
      {TOOL_DEFS_GRID.map((tool) => {
        const isActive = ACTIVE_TOOLS.has(tool.id)
        const milestone = TOOL_MILESTONE[tool.id]
        return (
          <button
            key={tool.id}
            type="button"
            aria-label={`${tool.label}${!isActive && milestone ? ` (${milestone} 예정)` : ''}`}
            aria-pressed={activeTool === tool.id}
            onClick={() => onToolSelect(tool)}
            className={cn(
              'relative flex min-h-[72px] flex-col items-center justify-center gap-1.5',
              'rounded-[var(--radius-md)]',
              'border border-[var(--color-border)]',
              'text-[var(--color-text-muted)] transition-colors',
              'hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
              // 터치 타겟 ≥ 44×44
              activeTool === tool.id &&
                'border-[var(--color-brand-500)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] dark:bg-[var(--color-brand-950)] dark:text-[var(--color-brand-400)]',
              !isActive && 'opacity-50',
            )}
          >
            <tool.Icon className="size-5" aria-hidden="true" />
            <span className="text-[11px] font-medium leading-tight">{tool.label}</span>
            {/* 비활성 마일스톤 배지 */}
            {!isActive && milestone && (
              <span
                className="absolute right-1 top-1 rounded-full bg-[var(--color-surface-muted)] px-1 text-[9px] leading-none text-[var(--color-text-muted)]"
                aria-hidden="true"
              >
                {milestone}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── ToolsTab (그리드 ↔ 패널 전환) ───────────────
type ToolsTabProps = {
  activeTool: ToolId
  canvas: StoryCanvas | null
  history: History | null
  layerTree: LayerTree | null
}

function ToolsTab({ activeTool, canvas, history, layerTree }: ToolsTabProps) {
  const { tapTool } = useToolStore()
  // 패널 보기 여부 — select 는 패널 없음
  const showPanel = activeTool !== 'select' && ACTIVE_TOOLS.has(activeTool)

  const handleToolSelect = useCallback(
    (tool: ToolDef) => {
      tapTool(tool.id)
    },
    [tapTool],
  )

  const handleBack = useCallback(() => {
    tapTool('select')
  }, [tapTool])

  if (showPanel) {
    return (
      <div className="flex flex-col">
        {/* 뒤로 버튼 */}
        <div className="flex items-center border-b border-[var(--color-border)] px-3 py-2">
          <button
            type="button"
            onClick={handleBack}
            aria-label="도구 목록으로 돌아가기"
            className={cn(
              'flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1.5',
              'text-sm text-[var(--color-text-muted)]',
              'hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
              'transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
              'min-h-[44px]',
            )}
            data-testid="mobile-tools-back"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            <span>도구 목록</span>
          </button>
          <span className="ml-auto text-sm font-medium text-[var(--color-text)]">
            {TOOL_DEFS_GRID.find((t) => t.id === activeTool)?.label ?? ''}
          </span>
        </div>
        {/* 패널 */}
        <ToolPanel toolId={activeTool} canvas={canvas} history={history} layerTree={layerTree} />
      </div>
    )
  }

  return <ToolsGridView activeTool={activeTool} onToolSelect={handleToolSelect} />
}

// ── 탭바 ──────────────────────────────────────
type TabBarProps = {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string; icon: () => React.ReactElement }[] = [
  { id: 'tools', label: '도구', icon: () => <MousePointer2 className="size-4" /> },
  { id: 'inspector', label: '속성', icon: () => <Settings2 className="size-4" /> },
  { id: 'layers', label: '레이어', icon: () => <Layers className="size-4" /> },
  // FOLLOWUP-46: 모바일 PagePanel 접근 — "페이지" 탭 추가
  { id: 'pages', label: '페이지', icon: () => <BookOpen className="size-4" /> },
]

function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div
      role="tablist"
      aria-label="편집기 패널"
      className="flex border-b border-[var(--color-border)]"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          type="button"
          aria-selected={activeTab === tab.id}
          aria-controls={`mobile-sheet-panel-${tab.id}`}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'relative flex flex-1 items-center justify-center gap-1.5 py-3',
            'text-sm font-medium transition-colors',
            'min-h-[44px]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand-500)]',
            activeTab === tab.id
              ? 'text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
          )}
        >
          <tab.icon />
          <span>{tab.label}</span>
          {activeTab === tab.id && (
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-[var(--color-brand-500)]"
            />
          )}
        </button>
      ))}
    </div>
  )
}

// ── Peek 상태 줌 컨트롤 ───────────────────────
type PeekZoomProps = {
  canvas: StoryCanvas | null
}

function PeekZoomControls({ canvas }: PeekZoomProps) {
  const [zoom, setZoom] = useState(100)

  useEffect(() => {
    if (!canvas) return
    const fc = canvas._fabricCanvas
    const sync = () => setZoom(getZoomPercent(canvas))
    fc.on('after:render', sync)
    sync()
    return () => {
      fc.off('after:render', sync)
    }
  }, [canvas])

  const handleOut = useCallback(() => {
    if (!canvas) return
    const next = Math.max(MIN_ZOOM, zoom - 10)
    applyZoom(canvas, next)
    setZoom(next)
  }, [canvas, zoom])

  const handleIn = useCallback(() => {
    if (!canvas) return
    const next = Math.min(MAX_ZOOM, zoom + 10)
    applyZoom(canvas, next)
    setZoom(next)
  }, [canvas, zoom])

  const handleFit = useCallback(() => {
    if (!canvas) return
    fitToViewport(canvas)
    setZoom(getZoomPercent(canvas))
  }, [canvas])

  return (
    <div className="flex items-center gap-1" role="group" aria-label="줌 컨트롤">
      <button
        type="button"
        onClick={handleOut}
        disabled={!canvas || zoom <= MIN_ZOOM}
        aria-label="축소"
        className={cn(
          'flex size-8 items-center justify-center rounded-[var(--radius-sm)]',
          'text-[var(--color-text-muted)]',
          'hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
          'disabled:pointer-events-none disabled:opacity-40',
          'transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
        )}
      >
        <Minus className="size-3.5" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => {
          if (canvas) {
            applyZoom(canvas, 100)
            setZoom(100)
          }
        }}
        disabled={!canvas}
        aria-label={`현재 줌 ${zoom}%. 클릭하여 100%로 리셋`}
        className={cn(
          'min-w-[40px] rounded-[var(--radius-sm)] px-1 py-0.5',
          'text-center text-xs tabular-nums text-[var(--color-text-muted)]',
          'hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
          'disabled:pointer-events-none disabled:opacity-40',
          'transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
        )}
      >
        {zoom}%
      </button>

      <button
        type="button"
        onClick={handleIn}
        disabled={!canvas || zoom >= MAX_ZOOM}
        aria-label="확대"
        className={cn(
          'flex size-8 items-center justify-center rounded-[var(--radius-sm)]',
          'text-[var(--color-text-muted)]',
          'hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
          'disabled:pointer-events-none disabled:opacity-40',
          'transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
        )}
      >
        <Plus className="size-3.5" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={handleFit}
        disabled={!canvas}
        aria-label="페이지 맞춤"
        className={cn(
          'h-7 rounded-[var(--radius-sm)] px-2',
          'text-xs text-[var(--color-text-muted)]',
          'hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
          'disabled:pointer-events-none disabled:opacity-40',
          'transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
        )}
      >
        맞춤
      </button>
    </div>
  )
}

// ── MobileBottomSheet (메인) ──────────────────
export function MobileBottomSheet({
  activeTool,
  onToolChange: _onToolChange,
  onAddPose: _onAddPose,
  onAddBackground: _onAddBackground,
  selectionProps,
  onUpdateProps: _onUpdateProps,
  layerTree,
  canvas,
  history,
  selectedIds,
  closeRequest,
  onPageChange,
  onApplyAlternative,
}: MobileBottomSheetProps) {
  const hasAlternatives = useAlternativesStore(selectHasAlternatives)
  const [snap, setSnap] = useState<SheetSnap>('peek')
  const [activeTab, setActiveTab] = useState<Tab>('tools')
  const sheetRef = useRef<HTMLDivElement>(null)
  const canvasFocusRef = useRef<HTMLElement | null>(null)

  const isOpen = snap !== 'peek'

  // ── 외부 closeRequest ────────────────────────
  useEffect(() => {
    if (closeRequest !== undefined && closeRequest > 0) {
      setSnap('peek')
      const canvasEl = canvasFocusRef.current
      if (canvasEl) requestAnimationFrame(() => canvasEl.focus())
    }
  }, [closeRequest])

  // ── 핸들 키보드 ──────────────────────────────
  const handleHandleKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setSnap((prev) => nextSnap(prev))
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setSnap('peek')
      const canvasEl = canvasFocusRef.current
      if (canvasEl) requestAnimationFrame(() => canvasEl.focus())
    }
  }, [])

  // ── Esc 전역 (열려있을 때) ────────────────────
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSnap('peek')
        const canvasEl = canvasFocusRef.current
        if (canvasEl) requestAnimationFrame(() => canvasEl.focus())
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  // ── 열릴 때 포커스 ────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const sheet = sheetRef.current
    if (!sheet) return
    const firstFocusable = sheet.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (firstFocusable) requestAnimationFrame(() => firstFocusable.focus())
  }, [isOpen])

  // ── visualViewport (키패드 충돌 회피) ─────────
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return
    const vv = window.visualViewport
    // 시트 DOM 노드는 마운트 동안 고정 → effect 진입 시 1회 캡처해 cleanup 에서도 동일 노드 참조
    const sheet = sheetRef.current
    const adjust = () => {
      if (!sheet) return
      const overlap = window.innerHeight - vv.height - vv.offsetTop
      sheet.style.transform = overlap > 0 ? `translateY(-${overlap}px)` : ''
    }
    vv.addEventListener('resize', adjust)
    vv.addEventListener('scroll', adjust)
    adjust()
    return () => {
      vv.removeEventListener('resize', adjust)
      vv.removeEventListener('scroll', adjust)
      if (sheet) sheet.style.transform = ''
    }
  }, [])

  // ── 캔버스 포커스 대상 등록 ────────────────────
  useEffect(() => {
    const canvasEl = document.querySelector<HTMLElement>('[aria-label="편집 캔버스"]')
    canvasFocusRef.current = canvasEl
  }, [])

  // ── 탭 변경 ───────────────────────────────────
  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab)
    // 탭 클릭 시 최소 half 스냅으로 열기
    setSnap((prev) => (prev === 'peek' ? 'half' : prev))
  }, [])

  // ── 핸들 클릭 ─────────────────────────────────
  const handleHandleClick = useCallback(() => {
    setSnap((prev) => nextSnap(prev))
  }, [])

  return (
    <>
      {/* 배경 오버레이 */}
      {isOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setSnap('peek')}
        />
      )}

      {/* BottomSheet 본체 */}
      <div
        ref={sheetRef}
        data-testid="mobile-bottom-sheet"
        data-snap={snap}
        role="complementary"
        aria-label="편집기 패널"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50',
          'flex flex-col',
          'rounded-t-2xl',
          'bg-[var(--color-surface-raised)]',
          'shadow-[var(--shadow-xl,0_-4px_24px_rgba(0,0,0,0.12))]',
          'border-t border-[var(--color-border)]',
          'transition-[height] duration-300 ease-out',
          'motion-reduce:transition-none',
        )}
        style={{ height: snapToHeight(snap) }}
      >
        {/* 핸들 행 (줌 컨트롤 포함) — px-3 로 좌우 호흡감 */}
        <div className="flex shrink-0 items-center px-3">
          {/* 핸들 버튼 (왼쪽) */}
          <button
            type="button"
            aria-label={isOpen ? '패널 닫기' : '패널 열기'}
            aria-expanded={isOpen}
            onClick={handleHandleClick}
            onKeyDown={handleHandleKeyDown}
            className={cn(
              'flex flex-1 items-center justify-center pb-1 pt-2',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand-500)]',
              'min-h-[44px]',
            )}
          >
            <span
              aria-hidden="true"
              className="h-1 w-9 rounded-full bg-[var(--color-text-muted)] opacity-40"
            />
          </button>

          {/* peek 상태 줌 컨트롤 */}
          {!isOpen && (
            <div className="shrink-0 py-1">
              <PeekZoomControls canvas={canvas} />
            </div>
          )}
        </div>

        {/* 탭바 */}
        <div className="shrink-0">
          <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* 탭 콘텐츠 (열려있을 때만) */}
        {isOpen && (
          <div
            id={`mobile-sheet-panel-${activeTab}`}
            role="tabpanel"
            aria-label={TABS.find((t) => t.id === activeTab)?.label}
            className={cn('flex-1 overflow-y-auto', '[touch-action:pan-y]')}
          >
            {activeTab === 'tools' && (
              <ToolsTab
                activeTool={activeTool}
                canvas={canvas}
                history={history}
                layerTree={layerTree}
              />
            )}
            {activeTab === 'inspector' && (
              <div className="p-0">
                <ControlBar
                  props={selectionProps}
                  canvas={canvas}
                  layerTree={layerTree}
                  history={history as any}
                />
                {/* M4-05: AI 추천 대안 후보 섹션 */}
                {hasAlternatives && onApplyAlternative && (
                  <div className="border-t border-[var(--color-border)]">
                    <AlternativesSection onApply={onApplyAlternative} isMobile />
                  </div>
                )}
              </div>
            )}
            {activeTab === 'layers' && (
              <LayerPanel
                layerTree={layerTree}
                canvas={canvas}
                history={history as any}
                selectedIds={selectedIds}
                isMobile
              />
            )}
            {/* FOLLOWUP-46: 모바일 PagePanel — PagePanel 컴포넌트 재사용 */}
            {activeTab === 'pages' && <PagePanel onPageChange={onPageChange} className="min-h-0" />}
          </div>
        )}
      </div>
    </>
  )
}
