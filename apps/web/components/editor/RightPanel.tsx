'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

// ─────────────────────────────────────────────
// RightPanel — 통합 우측 패널
//
// 구조:
//   [탭바: Properties | Layers]
//   Properties 탭: ControlBar (선택 객체 타입별 가변)
//   Layers 탭: LayerPanel (재작성)
//
// 동작:
//   - 객체 선택 → Properties 탭 자동 전환
//   - 사용자가 Layers 탭을 클릭하면 그 상태 유지
//   - 선택 해제 시 Properties 탭 빈 상태
//   - 데스크톱 전용 (hidden md:flex)
//   - 너비 280px
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import type { LayerTree } from '@storywork/editor-layers'
import { Tabs, TabsContent, TabsList, TabsTrigger, cn } from '@storywork/ui'
import { Layers, Settings2 } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

import { AlignControlBar } from './AlignControlBar'
import { ControlBar } from './ControlBar'
import type { ObjectProps } from './hooks/useSelection'
import { LayerPanel } from './LayerPanel'
import type { HistoryRef as History } from './types'

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type RightPanelProps = {
  props: ObjectProps | null
  canvas: StoryCanvas | null
  layerTree: LayerTree | null
  history: History | null
  selectedIds: string[]
}

type TabValue = 'properties' | 'layers'

// ─── RightPanel ───────────────────────────────────────────────────────────────

/**
 * RightPanel
 *
 * 객체 선택 시 Properties 탭 자동 전환 로직:
 * - 이전 선택 상태에서 새 선택이 들어오면 → Properties 탭 전환
 * - 단, 사용자가 이미 Layers 탭을 명시적으로 클릭한 상태라면 유지
 */
export function RightPanel({ props, canvas, layerTree, history, selectedIds }: RightPanelProps) {
  const [tab, setTab] = useState<TabValue>('properties')
  // 사용자가 수동으로 Layers 탭을 클릭했는지 추적
  const userManualTab = useRef(false)
  const prevSelectedIds = useRef<string[]>([])

  useEffect(() => {
    const prevIds = prevSelectedIds.current
    const currIds = selectedIds

    // 선택된 객체가 새로 생기거나 교체됨 → Properties 탭 자동 전환
    // (이전 선택이 없었거나 ID 목록이 달라진 경우)
    const selectionChanged =
      currIds.length > 0 &&
      (prevIds.length === 0 ||
        currIds.some((id) => !prevIds.includes(id)) ||
        prevIds.some((id) => !currIds.includes(id)))

    if (selectionChanged) {
      setTab('properties')
      userManualTab.current = false
    }

    // 선택 해제 시 userManualTab 리셋
    if (currIds.length === 0) {
      userManualTab.current = false
    }

    prevSelectedIds.current = currIds
  }, [selectedIds])

  const handleTabChange = (value: string) => {
    const v = value as TabValue
    setTab(v)
    // 사용자가 Layers 를 클릭 → 이후 선택에도 Properties 로 강제 전환 안 함
    if (v === 'layers') {
      userManualTab.current = true
    } else {
      userManualTab.current = false
    }
  }

  return (
    <aside
      aria-label="속성 및 레이어 패널"
      data-testid="right-panel"
      className={cn(
        'hidden md:flex md:flex-col',
        'w-[280px] shrink-0',
        'border-l border-[var(--color-border)]',
        'bg-[var(--color-surface)]',
        'overflow-hidden',
      )}
    >
      <Tabs
        value={tab}
        onValueChange={handleTabChange}
        className="flex flex-1 flex-col overflow-hidden"
      >
        {/* 탭바 */}
        <TabsList className="shrink-0">
          <TabsTrigger value="properties" className="gap-1.5">
            <Settings2 className="size-3.5" aria-hidden="true" />
            <span>속성</span>
          </TabsTrigger>
          <TabsTrigger value="layers" className="gap-1.5">
            <Layers className="size-3.5" aria-hidden="true" />
            <span>레이어</span>
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
      </Tabs>
    </aside>
  )
}
