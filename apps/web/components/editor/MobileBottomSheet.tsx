'use client'

// ─────────────────────────────────────────────
// MobileBottomSheet — 모바일 편집기 하단 시트
//
// 3 탭 (Tools / Inspector / Layers) 을 BottomSheet 로 노출한다.
// SELECT-1 함정 회피: position: fixed 사용 — main 레이아웃에 영향 없음.
// 캔버스 위에 떠있는 구조이므로 캔버스 ResizeObserver 를 트리거하지 않는다.
//
// 높이 스냅:
//   peek  → 56px  (핸들 + 탭바 요약 노출)
//   half  → 50dvh
//   full  → 90dvh
//
// 드래그 핸들 두 번 탭 또는 키보드 Space/Enter 로 half → full → peek 순환.
// Esc 키로 peek 복귀.
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import type { History } from '@storywork/editor-history'
import type { LayerTree } from '@storywork/editor-layers'
import { cn } from '@storywork/ui'
import { ImageIcon, Layers, MousePointer2, RectangleHorizontal, Settings2 } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import type { ObjectProps } from './hooks/useSelection'
import { Inspector } from './Inspector'
import { LayerPanel } from './LayerPanel'
import type { ToolId } from './ToolPalette'

// ── 타입 ─────────────────────────────────────
export type SheetSnap = 'peek' | 'half' | 'full'

type Tab = 'tools' | 'inspector' | 'layers'

type MobileBottomSheetProps = {
  // 탭 액션
  activeTool: ToolId
  onToolChange: (tool: ToolId) => void
  onAddPose: () => void
  onAddBackground: () => void
  // Inspector 연동
  selectionProps: ObjectProps | null
  onUpdateProps: (patch: Partial<Omit<ObjectProps, 'id'>>) => void
  // LayerPanel 연동
  layerTree: LayerTree | null
  canvas: StoryCanvas | null
  history: History | null
  selectedIds: string[]
  // 시트 외부에서 닫기 요청 (포즈 추가 후)
  closeRequest?: number
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

// ── ToolsTab — 포즈/배경/텍스트 추가 ──────────
type ToolsTabProps = {
  activeTool: ToolId
  onToolChange: (t: ToolId) => void
  onAddPose: () => void
  onAddBackground: () => void
}

type ToolDef = {
  id: ToolId
  label: string
  Icon: React.ComponentType<{ className?: string }>
}

const TOOL_DEFS: ToolDef[] = [
  { id: 'select', label: '선택', Icon: MousePointer2 },
  { id: 'pose', label: '포즈 추가', Icon: ImageIcon },
  { id: 'background', label: '배경 추가', Icon: RectangleHorizontal },
]

function ToolsTab({ activeTool, onToolChange, onAddPose, onAddBackground }: ToolsTabProps) {
  const handleClick = (tool: ToolDef) => {
    onToolChange(tool.id)
    if (tool.id === 'pose') onAddPose()
    if (tool.id === 'background') onAddBackground()
  }

  return (
    <div className="grid grid-cols-3 gap-3 p-4" role="toolbar" aria-label="편집 도구">
      {TOOL_DEFS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          aria-label={tool.label}
          aria-pressed={activeTool === tool.id}
          onClick={() => handleClick(tool)}
          className={cn(
            'flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-[var(--radius-md)]',
            'border border-[var(--color-border)]',
            'text-[var(--color-text-muted)] transition-colors',
            'hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
            // touch target: 최소 44×44 (실제 72px)
            activeTool === tool.id &&
              'border-[var(--color-brand-500)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] dark:bg-[var(--color-brand-950)] dark:text-[var(--color-brand-400)]',
          )}
        >
          <tool.Icon className="size-6" />
          <span className="text-xs font-medium leading-tight">{tool.label}</span>
        </button>
      ))}
    </div>
  )
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
            'min-h-[44px]', // 터치 타겟
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand-500)]',
            activeTab === tab.id
              ? 'text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
          )}
        >
          <tab.icon />
          <span>{tab.label}</span>
          {/* 활성 탭 underline */}
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

// ── MobileBottomSheet (메인) ──────────────────
export function MobileBottomSheet({
  activeTool,
  onToolChange,
  onAddPose,
  onAddBackground,
  selectionProps,
  onUpdateProps,
  layerTree,
  canvas,
  selectedIds,
  closeRequest,
}: MobileBottomSheetProps) {
  const [snap, setSnap] = useState<SheetSnap>('peek')
  const [activeTab, setActiveTab] = useState<Tab>('tools')
  const sheetRef = useRef<HTMLDivElement>(null)
  // 포커스 복귀 대상 (시트 닫힘 시 캔버스에 반환)
  const canvasFocusRef = useRef<HTMLElement | null>(null)

  const isOpen = snap !== 'peek'

  // ── 외부 closeRequest 트리거 ─────────────────
  // 포즈/배경 추가 후 EditorShell 이 closeRequest 를 올리면 peek 로 복귀
  useEffect(() => {
    if (closeRequest !== undefined && closeRequest > 0) {
      setSnap('peek')
      // 캔버스 포커스 복귀
      const canvasEl = canvasFocusRef.current
      if (canvasEl) {
        requestAnimationFrame(() => canvasEl.focus())
      }
    }
  }, [closeRequest])

  // ── 키보드 핸들러 ─────────────────────────────
  const handleHandleKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setSnap((prev) => nextSnap(prev))
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setSnap('peek')
      // 캔버스 포커스 복귀
      const canvasEl = canvasFocusRef.current
      if (canvasEl) {
        requestAnimationFrame(() => canvasEl.focus())
      }
    }
  }, [])

  // ── Esc 전역 키보드 (시트가 열려있을 때) ────────
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSnap('peek')
        const canvasEl = canvasFocusRef.current
        if (canvasEl) {
          requestAnimationFrame(() => canvasEl.focus())
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  // ── 시트 열릴 때 첫 인터랙티브 요소 포커스 ─────
  useEffect(() => {
    if (!isOpen) return
    // 탭바 첫 버튼 포커스
    const sheet = sheetRef.current
    if (!sheet) return
    const firstFocusable = sheet.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (firstFocusable) {
      requestAnimationFrame(() => firstFocusable.focus())
    }
  }, [isOpen])

  // ── C-3: visualViewport 동기화 (키패드 충돌 회피) ──
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return
    const vv = window.visualViewport
    const adjust = () => {
      const sheet = sheetRef.current
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
      const sheet = sheetRef.current
      if (sheet) sheet.style.transform = ''
    }
  }, [])

  // ── 캔버스 포커스 대상 등록 ──────────────────
  // EditorCanvas 의 wrapper div (role="region" aria-label="편집 캔버스") 를 찾아 저장
  useEffect(() => {
    const canvasEl = document.querySelector<HTMLElement>('[aria-label="편집 캔버스"]')
    canvasFocusRef.current = canvasEl
  }, [])

  // ── 탭 변경 핸들러 ────────────────────────────
  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab)
    // peek 상태에서 탭 클릭하면 half 로 열기
    setSnap((prev) => (prev === 'peek' ? 'half' : prev))
  }, [])

  // ── 핸들 클릭 ─────────────────────────────────
  const handleHandleClick = useCallback(() => {
    setSnap((prev) => nextSnap(prev))
  }, [])

  return (
    <>
      {/* 배경 오버레이 — half/full 시 반투명 */}
      {isOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setSnap('peek')}
        />
      )}

      {/* BottomSheet 본체 — SELECT-1: position: fixed 필수 */}
      <div
        ref={sheetRef}
        data-testid="mobile-bottom-sheet"
        data-snap={snap}
        role="complementary"
        aria-label="편집기 패널"
        className={cn(
          // SELECT-1: fixed 고정 — 레이아웃 플로우에서 제외
          'fixed inset-x-0 bottom-0 z-50',
          'flex flex-col',
          'rounded-t-2xl',
          'bg-[var(--color-surface-raised)]',
          'shadow-[var(--shadow-xl,0_-4px_24px_rgba(0,0,0,0.12))]',
          'border-t border-[var(--color-border)]',
          'transition-[height] duration-300 ease-out',
          // 모션 절감 지원
          'motion-reduce:transition-none',
        )}
        style={{ height: snapToHeight(snap) }}
      >
        {/* ── 드래그 핸들 (snap 순환 버튼) ── */}
        <button
          type="button"
          aria-label={isOpen ? '패널 닫기' : '패널 열기'}
          aria-expanded={isOpen}
          onClick={handleHandleClick}
          onKeyDown={handleHandleKeyDown}
          className={cn(
            'flex w-full shrink-0 items-center justify-center pb-1 pt-2',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand-500)]',
            // 터치 타겟 ≥ 44px
            'min-h-[44px]',
          )}
        >
          <span
            aria-hidden="true"
            className="h-1 w-9 rounded-full bg-[var(--color-text-muted)] opacity-40"
          />
        </button>

        {/* ── 탭바 (peek 에서도 표시) ── */}
        <div className="shrink-0">
          <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* ── 탭 콘텐츠 (half/full 시만 표시) ── */}
        {isOpen && (
          <div
            id={`mobile-sheet-panel-${activeTab}`}
            role="tabpanel"
            aria-label={TABS.find((t) => t.id === activeTab)?.label}
            className={cn(
              'flex-1 overflow-y-auto',
              // 내부 스크롤만 허용 (캔버스는 touch-action: none)
              '[touch-action:pan-y]',
            )}
          >
            {activeTab === 'tools' && (
              <ToolsTab
                activeTool={activeTool}
                onToolChange={onToolChange}
                onAddPose={onAddPose}
                onAddBackground={onAddBackground}
              />
            )}
            {activeTab === 'inspector' && (
              // Inspector 숫자 입력 — inputmode="decimal" 로 키패드 최소화
              <div className="p-0">
                <Inspector props={selectionProps} onUpdate={onUpdateProps} isMobile />
              </div>
            )}
            {activeTab === 'layers' && (
              <LayerPanel layerTree={layerTree} canvas={canvas} selectedIds={selectedIds} />
            )}
          </div>
        )}
      </div>
    </>
  )
}
