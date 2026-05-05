'use client'

// ─────────────────────────────────────────────
// EditorShell — 편집기 최상위 레이아웃 + 조립
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import { AddObjectCommand } from '@storywork/editor-history'
import type { History } from '@storywork/editor-history'
import type { LayerNodeJson, LayerTree } from '@storywork/editor-layers'
import type { PageJsonV1 } from '@storywork/schema/editor'
import { FabricImage, Rect } from 'fabric'
import { useCallback, useRef, useState } from 'react'

import {
  AUTOSAVE_STORAGE_KEY,
  DEFAULT_FORMAT,
  SEED_BACKGROUND_FILL,
  SEED_POSE_PNG_DATA_URL,
} from '../../lib/editor/seed'

import { EditorCanvas } from './EditorCanvas'
import { ExportMenu } from './ExportMenu'
import { useAutosave } from './hooks/useAutosave'
import { useHistory } from './hooks/useHistory'
import { useSelection } from './hooks/useSelection'
import type { EditorRefs } from './hooks/useStoryCanvas'
import { useStoryCanvas } from './hooks/useStoryCanvas'
import { Inspector } from './Inspector'
import { LayerPanel } from './LayerPanel'
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
 */
export function EditorShell() {
  const containerRef = useRef<HTMLDivElement>(null)

  // ── 에디터 인스턴스 ───────────────────────────────────
  const [canvas, setCanvas] = useState<StoryCanvas | null>(null)
  const [layerTree, setLayerTree] = useState<LayerTree | null>(null)
  const [history, setHistory] = useState<History | null>(null)

  const onReady = useCallback((refs: EditorRefs) => {
    if (!refs.canvas || !refs.layerTree || !refs.history) return
    setCanvas(refs.canvas)
    setLayerTree(refs.layerTree)
    setHistory(refs.history)
    // 로컬 저장 데이터 복원 시도
    restoreFromLocalStorage(refs.canvas, refs.layerTree)
  }, [])

  useStoryCanvas(containerRef, DEFAULT_FORMAT, onReady)

  // ── 도구/선택/히스토리/자동저장 ──────────────────────
  const [activeTool, setActiveTool] = useState<ToolId>('select')
  const { selectedIds, props: selectionProps, updateProps, clearSelection } = useSelection(canvas)
  const { canUndo, canRedo, undo, redo } = useHistory(history)
  const { saveStatus } = useAutosave(canvas, layerTree, history)

  // ── 포즈 추가 ─────────────────────────────────────────
  const handleAddPose = useCallback(async () => {
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
    }

    setActiveTool('select')
  }, [canvas, history])

  // ── 배경 추가 ─────────────────────────────────────────
  const handleAddBackground = useCallback(() => {
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
  }, [canvas, history, layerTree])

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-[var(--color-surface)]"
      role="application"
      aria-label="StoryWork 편집기"
    >
      {/* TopBar */}
      <TopBar
        fileName="제목 없음"
        saveStatus={saveStatus}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        exportMenu={<ExportMenu canvas={canvas} layerTree={layerTree} />}
      />

      {/* 중앙 영역: ToolPalette | Canvas | Inspector */}
      <div className="flex flex-1 overflow-hidden">
        {/* ToolPalette (데스크톱 only) */}
        <ToolPalette
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onAddPose={handleAddPose}
          onAddBackground={handleAddBackground}
        />

        {/* Canvas */}
        <EditorCanvas
          containerRef={containerRef}
          canvas={canvas}
          history={history}
          selectedIds={selectedIds}
          onClearSelection={clearSelection}
        />

        {/* Inspector (데스크톱 only) */}
        <Inspector props={selectionProps} onUpdate={updateProps} />
      </div>

      {/* LayerPanel (데스크톱/태블릿) */}
      <LayerPanel layerTree={layerTree} canvas={canvas} selectedIds={selectedIds} />
    </div>
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
