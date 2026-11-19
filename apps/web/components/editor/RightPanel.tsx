'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

// ─────────────────────────────────────────────
// RightPanel — 통합 우측 패널
//
// 구조:
//   [탭바: Properties | Layers | Pages]
//   Properties 탭: ControlBar (선택 객체 타입별 가변)
//   Layers 탭: LayerPanel (재작성)
//   Pages 탭: PagePanel (다중 페이지 관리)
//
// 동작:
//   - 기본 탭은 Properties. 사용자가 고른 탭은 선택이 바뀌어도 유지(자동 전환 없음)
//   - 선택 해제 시 Properties 탭 빈 상태
//   - 데스크톱 전용 (hidden md:flex)
//   - 너비 280px
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import type { LayerTree } from '@storywork/editor-layers'
import { Tabs, TabsContent, TabsList, TabsTrigger, cn } from '@storywork/ui'
import { BookOpen, Layers, Settings2 } from 'lucide-react'
import React, { useState } from 'react'

import { AlignControlBar } from './AlignControlBar'
import { ControlBar } from './ControlBar'
import type { ObjectProps } from './hooks/useSelection'
import { LayerPanel } from './LayerPanel'
import { PagePanel } from './page-system/PagePanel'
import { AlternativesSection } from './panels/alternatives-section'
import type { AlternativeCandidate } from './store/useAlternativesStore'
import { selectHasAlternatives, useAlternativesStore } from './store/useAlternativesStore'
import type { HistoryRef as History } from './types'

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type RightPanelProps = {
  props: ObjectProps | null
  canvas: StoryCanvas | null
  layerTree: LayerTree | null
  history: History | null
  selectedIds: string[]
  onPageChange?: (index: number) => void
  /** 한 클릭 교체 콜백 — AlternativesSection 에서 후보 선택 시 호출 */
  onApplyAlternative?: (candidate: AlternativeCandidate) => void
}

type TabValue = 'properties' | 'layers' | 'pages'

// ─── RightPanel ───────────────────────────────────────────────────────────────

/**
 * RightPanel
 *
 * 탭: 기본 Properties, 이후 사용자가 고른 탭을 유지(선택 변경에 따른 자동 전환 없음).
 */
export function RightPanel({
  props,
  canvas,
  layerTree,
  history,
  selectedIds,
  onPageChange,
  onApplyAlternative,
}: RightPanelProps) {
  const hasAlternatives = useAlternativesStore(selectHasAlternatives)
  const [tab, setTab] = useState<TabValue>('properties')
  // 탭은 사용자가 고른 대로 유지한다 — 선택이 바뀌어도 자동 전환하지 않는다.
  // (레이어 탭에서 복제·삭제·실행 취소를 반복할 때 매번 속성 탭으로 튕기지 않도록)
  const handleTabChange = (value: string) => setTab(value as TabValue)

  return (
    <aside
      aria-label="속성 및 레이어 패널"
      data-testid="right-panel"
      className={cn(
        'hidden md:flex md:flex-col',
        'w-[308px] shrink-0',
        // editor-border 사용으로 토큰 통일
        'border-l border-[var(--editor-border,var(--color-border))]',
        'bg-[var(--editor-panel,var(--color-surface))]',
        'overflow-hidden',
      )}
    >
      <Tabs
        value={tab}
        onValueChange={handleTabChange}
        className="flex flex-1 flex-col overflow-hidden"
      >
        {/* 탭바 — px-4 로 좌우 호흡감 (탭이 컨테이너 끝과 붙지 않게) */}
        <TabsList className="shrink-0 px-4">
          <TabsTrigger value="properties" className="gap-1.5">
            <Settings2 className="size-3.5" aria-hidden="true" />
            <span>속성</span>
          </TabsTrigger>
          <TabsTrigger value="layers" className="gap-1.5">
            <Layers className="size-3.5" aria-hidden="true" />
            <span>레이어</span>
          </TabsTrigger>
          <TabsTrigger value="pages" className="gap-1.5" data-testid="right-panel-pages-tab">
            <BookOpen className="size-3.5" aria-hidden="true" />
            <span>페이지</span>
          </TabsTrigger>
        </TabsList>

        {/* Properties 탭 */}
        <TabsContent
          value="properties"
          className="overflow-y-auto data-[state=active]:flex data-[state=active]:flex-col"
        >
          {/* 다중 선택 시 AlignControlBar 노출 */}
          {selectedIds.length >= 2 && (
            <AlignControlBar canvas={canvas} history={history as any} selectedIds={selectedIds} />
          )}
          <ControlBar
            props={props}
            canvas={canvas}
            layerTree={layerTree}
            history={history as any}
          />

          {/* AI 추천 대안 후보 섹션 — pose/bubble/bg layer 선택 시만 표시 */}
          {hasAlternatives && onApplyAlternative && (
            <div className="border-t border-[var(--editor-border,var(--color-border))]">
              <AlternativesSection onApply={onApplyAlternative} />
            </div>
          )}
        </TabsContent>

        {/* Layers 탭 */}
        <TabsContent
          value="layers"
          className="overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
        >
          <LayerPanel
            layerTree={layerTree}
            canvas={canvas}
            history={history as any}
            selectedIds={selectedIds}
          />
        </TabsContent>

        {/* Pages 탭 */}
        <TabsContent
          value="pages"
          className="overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
        >
          <PagePanel onPageChange={onPageChange} />
        </TabsContent>
      </Tabs>
    </aside>
  )
}
