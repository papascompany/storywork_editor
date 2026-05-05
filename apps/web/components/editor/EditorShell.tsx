'use client'

// ─────────────────────────────────────────────
// EditorShell — 편집기 최상위 레이아웃 + 조립
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import { AddObjectCommand } from '@storywork/editor-history'
import type { History } from '@storywork/editor-history'
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
import { ExportMenu } from './ExportMenu'
import { useAutosave } from './hooks/useAutosave'
import { useHistory } from './hooks/useHistory'
import { useSelection } from './hooks/useSelection'
import type { EditorRefs } from './hooks/useStoryCanvas'
import { useStoryCanvas } from './hooks/useStoryCanvas'
import { Inspector } from './Inspector'
import { LayerPanel } from './LayerPanel'
import { MobileBottomSheet } from './MobileBottomSheet'
import { ToolPalette } from './ToolPalette'
import type { ToolId } from './ToolPalette'
import { TopBar } from './TopBar'

/**
 * EditorShell
 *
 * M1-06 편집기 셸: 헤드리스 패키지 4개를 React UI 로 조립.
 *
 * 레이아웃:
 *   [TopBar                          ]
 *   [ToolPalette | Canvas | Inspector]
 *   [LayerPanel                      ]
 *
 * 모바일(md 이하): TopBar + Canvas 만 — 다른 패널은 M1-07 에서 BottomSheet
 *
 * H5: canvas / layerTree / history 인스턴스는 useRef 로 보유.
 * React state 에 넣으면 fabric 내부 상태 변경마다 리렌더가 발생하고
 * React StrictMode 이중 마운트 시 이중 dispose 위험이 있다.
 * 자식 컴포넌트로는 EditorContext + readyTick 으로 필요한 시점에만 전달한다.
 *
 * H8: window.unhandledrejection 글로벌 핸들러를 /editor 진입 시점에만 활성화.
 */
export function EditorShell() {
  const containerRef = useRef<HTMLDivElement>(null)

  // ── H5: 인스턴스는 ref 로 유지 (리렌더 트리거 X) ────────────────
  const canvasRef = useRef<StoryCanvas | null>(null)
  const layerTreeRef = useRef<LayerTree | null>(null)
  const historyRef = useRef<History | null>(null)

  /**
   * H5: 인스턴스 준비 완료 신호. 숫자 자체는 의미 없고 바뀌면 자식이 리렌더된다.
   * canvas 인스턴스 자체를 state 에 넣는 대신 이 숫자를 올린다.
   */
  const [readyTick, setReadyTick] = useState(0)

  const onReady = useCallback((refs: EditorRefs) => {
    if (!refs.canvas || !refs.layerTree || !refs.history) return
    canvasRef.current = refs.canvas
    layerTreeRef.current = refs.layerTree
    historyRef.current = refs.history
    // 로컬 저장 데이터 복원 시도
    restoreFromLocalStorage(refs.canvas, refs.layerTree)
    // 자식에게 준비 완료 알림 (tick 증가 → 리렌더)
    setReadyTick((t) => t + 1)
  }, [])

  useStoryCanvas(containerRef, DEFAULT_FORMAT, onReady)

  // ── 도구/선택/히스토리/자동저장 ──────────────────────
  const { show: showToast } = useToast()
  const [activeTool, setActiveTool] = useState<ToolId>('select')

  /**
   * 모바일 BottomSheet closeRequest 카운터.
   * 포즈/배경 추가 후 1씩 올리면 MobileBottomSheet 가 peek 로 복귀한다.
   * 숫자 자체는 의미 없고 변화만 의미가 있다.
   */
  const [mobileCloseRequest, setMobileCloseRequest] = useState(0)

  const requestMobileClose = useCallback(() => {
    setMobileCloseRequest((n) => n + 1)
  }, [])

  // H5: ref.current 를 직접 훅에 전달 — 인스턴스 동일성 보장
  const {
    selectedIds,
    props: selectionProps,
    updateProps,
    clearSelection,
  } = useSelection(canvasRef.current)
  const { canUndo, canRedo, undo, redo } = useHistory(historyRef.current)
  const { saveStatus } = useAutosave(canvasRef.current, layerTreeRef.current, historyRef.current)

  // ── H6: body[data-route="editor"] 설정 (/editor 전용 CSS 트리거) ──
  useEffect(() => {
    document.body.dataset.route = 'editor'
    return () => {
      delete document.body.dataset.route
    }
  }, [])

  // ── H8: unhandledrejection 글로벌 핸들러 (/editor 전용) ──────────
  useEffect(() => {
    const onReject = (e: PromiseRejectionEvent): void => {
      console.error('[unhandled]', e.reason)
      // M9 에서 Sentry 연결 예정. 현재는 콘솔만.
      // e.preventDefault() 로 React 트리 freeze 방지
      e.preventDefault()
    }
    window.addEventListener('unhandledrejection', onReject)
    return () => {
      window.removeEventListener('unhandledrejection', onReject)
    }
  }, [])

  // ── 포즈 추가 ─────────────────────────────────────────
  const handleAddPose = useCallback(async () => {
    const canvas = canvasRef.current
    const history = historyRef.current
    if (!canvas || !history) return

    try {
      const img = await FabricImage.fromURL(SEED_POSE_PNG_DATA_URL, {
        crossOrigin: 'anonymous',
      })

      // 캔버스 중앙 배치 (mm → px 변환)
      const centerXPx = canvas.mmToPx(DEFAULT_FORMAT.widthMm / 2)
      const centerYPx = canvas.mmToPx(DEFAULT_FORMAT.heightMm / 3)
      const widthPx = canvas.mmToPx(40) // 40mm
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

    setActiveTool('select')
    // 모바일: 시트를 peek 로 복귀 (캔버스 노출)
    requestMobileClose()
  }, [requestMobileClose])

  // ── 배경 추가 ─────────────────────────────────────────
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

    // 배경은 맨 뒤로 이동
    if (layerTree) {
      const id = cmd.assignedId
      if (id) {
        layerTree.sendToBack(id)
      }
    }

    setActiveTool('select')
    // 모바일: 시트를 peek 로 복귀 (캔버스 노출)
    requestMobileClose()
  }, [requestMobileClose])

  // ── Context 값 (메모이즈 없음 — readyTick 변경 시 자연스럽게 새 객체) ──
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
          fileName="제목 없음"
          saveStatus={saveStatus}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          exportMenu={<ExportMenu canvas={canvasRef.current} layerTree={layerTreeRef.current} />}
        />

        {/* 중앙 영역: ToolPalette | Canvas | Inspector */}
        <div className="flex flex-1 overflow-hidden">
          {/* ToolPalette — 데스크톱(md+) only. 모바일은 MobileBottomSheet 의 Tools 탭 */}
          <ToolPalette
            activeTool={activeTool}
            onToolChange={setActiveTool}
            onAddPose={handleAddPose}
            onAddBackground={handleAddBackground}
          />

          {/* Canvas — 모바일/데스크톱 공통 */}
          <EditorCanvas
            containerRef={containerRef}
            canvas={canvasRef.current}
            history={historyRef.current}
            selectedIds={selectedIds}
            onClearSelection={clearSelection}
          />

          {/* Inspector — 데스크톱(md+) only. DOM 자체 미렌더로 cost 0 */}
          <div className="hidden md:contents">
            <Inspector props={selectionProps} onUpdate={updateProps} />
          </div>
        </div>

        {/* LayerPanel — 데스크톱(md+) only */}
        <div className="hidden md:contents">
          <LayerPanel
            layerTree={layerTreeRef.current}
            canvas={canvasRef.current}
            selectedIds={selectedIds}
          />
        </div>

        {/* MobileBottomSheet — 모바일(md 미만) only */}
        <div className="md:hidden">
          <MobileBottomSheet
            activeTool={activeTool}
            onToolChange={setActiveTool}
            onAddPose={handleAddPose}
            onAddBackground={handleAddBackground}
            selectionProps={selectionProps}
            onUpdateProps={updateProps}
            layerTree={layerTreeRef.current}
            canvas={canvasRef.current}
            history={historyRef.current}
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

    // 비동기 loadJson 는 async 이므로 await 없이 fire-and-forget
    // 에러는 각자 catch 에서 처리
    canvas
      .loadJson(data.page)
      .then(() => {
        if (data.layers?.length) {
          layerTree.loadJson(data.layers)
        }
        // 복원 완료
      })
      .catch((err) => {
        console.warn('[EditorShell] 로컬 저장 데이터 복원 실패:', err)
      })
  } catch {
    console.warn('[EditorShell] localStorage 파싱 실패 — 초기 빈 캔버스로 시작')
  }
}
