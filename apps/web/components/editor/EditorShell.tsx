'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

// ─────────────────────────────────────────────
// EditorShell — 편집기 최상위 레이아웃 + 조립
//
// M1-08c: ToolBar 11종 + FeatureSidebar 슬라이드 패널 통합
// M1-08d: RightPanel (ControlBar + LayerPanel 통합) 교체
//
// 레이아웃 (데스크톱 md+):
//   [TopBar                                          ]
//   [ToolBar(72px) | FeatureSidebar(0~290px) | Canvas | RightPanel(280px)]
//
// 모바일(md 미만): TopBar + Canvas + MobileBottomSheet
//
// H5: canvas / layerTree / history 인스턴스는 useRef 로 보유.
// React state 에 넣으면 fabric 내부 상태 변경마다 리렌더가 발생하고
// React StrictMode 이중 마운트 시 이중 dispose 위험이 있다.
// 자식 컴포넌트로는 EditorContext + readyTick 으로 필요한 시점에만 전달한다.
//
// H8: window.unhandledrejection 글로벌 핸들러를 /editor 진입 시점에만 활성화.
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import { AddObjectCommand } from '@storywork/editor-history'
import type { LayerNodeJson, LayerTree } from '@storywork/editor-layers'
import type { PageJsonV1 } from '@storywork/schema/editor'
import { useToast } from '@storywork/ui'
import { FabricImage, Rect } from 'fabric'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  AUTOSAVE_STORAGE_KEY,
  DEFAULT_FORMAT,
  SEED_BACKGROUND_FILL,
  SEED_POSE_PNG_DATA_URL,
} from '../../lib/editor/seed'

import { EditorCanvas } from './EditorCanvas'
import { EditorContext } from './EditorContext'
import { FeatureSidebar } from './FeatureSidebar'
import { Footer } from './Footer'
import { useAutosave } from './hooks/useAutosave'
import { useHistory } from './hooks/useHistory'
import { useSelection } from './hooks/useSelection'
import type { EditorRefs } from './hooks/useStoryCanvas'
import { useStoryCanvas } from './hooks/useStoryCanvas'
import { MobileBottomSheet } from './MobileBottomSheet'
import { RightPanel } from './RightPanel'
import { useToolStore } from './store/useToolStore'
import { ToolBar } from './ToolBar'
import { TopBar } from './TopBar'
import type { HistoryRef as History } from './types'

// MobileBottomSheet 는 useToolStore 의 ToolId 를 직접 사용 (M1-08d: ToolPalette 제거)
type LegacyToolId = 'select' | 'pose' | 'background'

/**
 * EditorShell
 *
 * M1-08c: ToolBar + FeatureSidebar 통합
 */
export function EditorShell() {
  const containerRef = useRef<HTMLDivElement>(null)

  // ── H5: 인스턴스는 ref 로 유지 (리렌더 트리거 X) ────────────────
  const canvasRef = useRef<StoryCanvas | null>(null)
  const layerTreeRef = useRef<LayerTree | null>(null)
  const historyRef = useRef<History | null>(null)

  const [readyTick, setReadyTick] = useState(0)

  const onReady = useCallback((refs: EditorRefs) => {
    if (!refs.canvas || !refs.layerTree || !refs.history) return
    canvasRef.current = refs.canvas
    layerTreeRef.current = refs.layerTree
    historyRef.current = refs.history
    restoreFromLocalStorage(refs.canvas, refs.layerTree)
    setReadyTick((t) => t + 1)
  }, [])

  useStoryCanvas(containerRef, DEFAULT_FORMAT, onReady)

  // ── 도구/선택/히스토리/자동저장 ──────────────────────
  const { show: showToast } = useToast()

  // useToolStore 에서 활성 도구 동기화 (MobileBottomSheet 레거시 호환용)
  const { active: activeTool } = useToolStore()
  const legacyActiveTool: LegacyToolId =
    activeTool === 'pose' || activeTool === 'background' ? activeTool : 'select'

  const [mobileCloseRequest, setMobileCloseRequest] = useState(0)

  const requestMobileClose = useCallback(() => {
    setMobileCloseRequest((n) => n + 1)
  }, [])

  const {
    selectedIds,
    props: selectionProps,
    updateProps,
    clearSelection,
  } = useSelection(canvasRef.current)
  const { canUndo, canRedo, undo, redo } = useHistory(historyRef.current)
  const { saveStatus, lastSavedAt, failReason } = useAutosave(
    canvasRef.current,
    layerTreeRef.current,
    historyRef.current,
  )
  const [fileName, setFileName] = useState('제목 없음')

  // ── H6: body[data-route="editor"] ──────────────────────────────
  useEffect(() => {
    document.body.dataset.route = 'editor'
    return () => {
      delete document.body.dataset.route
    }
  }, [])

  // ── H8: unhandledrejection 글로벌 핸들러 ─────────────────────
  useEffect(() => {
    const onReject = (e: PromiseRejectionEvent): void => {
      console.error('[unhandled]', e.reason)
      e.preventDefault()
    }
    window.addEventListener('unhandledrejection', onReject)
    return () => {
      window.removeEventListener('unhandledrejection', onReject)
    }
  }, [])

  // ── 포즈 추가 (MobileBottomSheet 레거시 핸들러) ───────────────
  const handleAddPose = useCallback(async () => {
    const canvas = canvasRef.current
    const history = historyRef.current
    if (!canvas || !history) return

    try {
      const img = await FabricImage.fromURL(SEED_POSE_PNG_DATA_URL, {
        crossOrigin: 'anonymous',
      })

      const centerXPx = canvas.mmToPx(DEFAULT_FORMAT.widthMm / 2)
      const centerYPx = canvas.mmToPx(DEFAULT_FORMAT.heightMm / 3)
      const widthPx = canvas.mmToPx(40)
      const heightPx = canvas.mmToPx(40)

      img.set({
        left: centerXPx - widthPx / 2,
        top: centerYPx - heightPx / 2,
        scaleX: widthPx / (img.width ?? 1),
        scaleY: heightPx / (img.height ?? 1),
      })

      const cmd = new AddObjectCommand({
        canvas,
        fabricObj: img,
        dataOverrides: { kind: 'pose' },
      })
      history.push(cmd)
    } catch (err) {
      console.error('[EditorShell] 포즈 추가 실패:', err)
      showToast({ message: '포즈 추가에 실패했습니다.', variant: 'error' })
    }

    requestMobileClose()
  }, [requestMobileClose, showToast])

  // ── 배경 추가 (MobileBottomSheet 레거시 핸들러) ───────────────
  const handleAddBackground = useCallback(() => {
    const canvas = canvasRef.current
    const history = historyRef.current
    const layerTree = layerTreeRef.current
    if (!canvas || !history) return

    const widthPx = canvas.mmToPx(DEFAULT_FORMAT.widthMm)
    const heightPx = canvas.mmToPx(DEFAULT_FORMAT.heightMm)

    const rect = new Rect({
      left: 0,
      top: 0,
      width: widthPx,
      height: heightPx,
      fill: SEED_BACKGROUND_FILL,
      selectable: true,
    })

    const cmd = new AddObjectCommand({
      canvas,
      fabricObj: rect,
      dataOverrides: { kind: 'background' },
    })
    history.push(cmd)

    if (layerTree) {
      const id = cmd.assignedId
      if (id) {
        layerTree.sendToBack(id)
      }
    }

    requestMobileClose()
  }, [requestMobileClose])

  // ── Context 값 ────────────────────────────────────────────────
  const ctxValue = {
    canvas: canvasRef.current,
    layerTree: layerTreeRef.current,
    history: historyRef.current,
    readyTick,
  }

  return (
    <EditorContext.Provider value={ctxValue}>
      <div
        className="flex h-dvh flex-col overflow-hidden bg-[var(--color-surface)]"
        role="application"
        aria-label="StoryWork 편집기"
      >
        {/* TopBar — 모바일/데스크톱 공통, 모바일 48px */}
        <TopBar
          fileName={fileName}
          onFileNameChange={setFileName}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          failReason={failReason}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          canvas={canvasRef.current}
          layerTree={layerTreeRef.current}
        />

        {/* 중앙 영역: ToolBar | FeatureSidebar | Canvas | RightPanel */}
        <div className="flex flex-1 overflow-hidden">
          {/* ToolBar — 데스크톱(md+) only. 모바일은 MobileBottomSheet 의 Tools 탭 */}
          <ToolBar />

          {/* FeatureSidebar — 데스크톱(md+) only */}
          <FeatureSidebar
            canvas={canvasRef.current}
            history={historyRef.current as any}
            layerTree={layerTreeRef.current}
          />

          {/* Canvas — 모바일/데스크톱 공통 */}
          <div className="relative flex flex-1 flex-col overflow-hidden">
            <EditorCanvas
              containerRef={containerRef}
              canvas={canvasRef.current}
              history={historyRef.current as any}
              layerTree={layerTreeRef.current}
              selectedIds={selectedIds}
              onClearSelection={clearSelection}
            />
            {/* Footer — 데스크톱(md+) 전용 */}
            <Footer canvas={canvasRef.current} />
          </div>

          {/* RightPanel (Inspector + LayerPanel 통합) — 데스크톱(md+) only */}
          <RightPanel
            props={selectionProps}
            canvas={canvasRef.current}
            layerTree={layerTreeRef.current}
            history={historyRef.current as any}
            selectedIds={selectedIds}
          />
        </div>

        {/* MobileBottomSheet — 모바일(md 미만) only */}
        <div className="md:hidden">
          <MobileBottomSheet
            activeTool={legacyActiveTool}
            onToolChange={() => {
              /* ToolStore 에서 관리 */
            }}
            onAddPose={handleAddPose}
            onAddBackground={handleAddBackground}
            selectionProps={selectionProps}
            onUpdateProps={updateProps}
            layerTree={layerTreeRef.current}
            canvas={canvasRef.current}
            history={historyRef.current as any}
            selectedIds={selectedIds}
            closeRequest={mobileCloseRequest}
          />
        </div>
      </div>
    </EditorContext.Provider>
  )
}

// ─────────────────────────────────────────────
// 로컬 저장 복원 헬퍼
// ─────────────────────────────────────────────

type SavedData = {
  page: PageJsonV1
  layers: LayerNodeJson[]
}

function restoreFromLocalStorage(canvas: StoryCanvas, layerTree: LayerTree): void {
  try {
    const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw) as SavedData
    if (!data?.page) return

    canvas
      .loadJson(data.page)
      .then(() => {
        if (data.layers?.length) {
          layerTree.loadJson(data.layers)
        }
      })
      .catch((err) => {
        console.warn('[EditorShell] 로컬 저장 데이터 복원 실패:', err)
      })
  } catch {
    console.warn('[EditorShell] localStorage 파싱 실패 — 초기 빈 캔버스로 시작')
  }
}
