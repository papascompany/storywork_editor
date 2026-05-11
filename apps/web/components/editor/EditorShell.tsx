'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

// ─────────────────────────────────────────────
// EditorShell — 편집기 최상위 레이아웃 + 조립
//
// M1-08c: ToolBar 11종 + FeatureSidebar 슬라이드 패널 통합
// M1-08d: RightPanel (ControlBar + LayerPanel 통합) 교체
// M1-08f: CommandPalette(⌘K) + KeyboardShortcutsModal(?) + 글로벌 단축키
//
// 레이아웃 (데스크톱 md+):
//   [TopBar                                          ]
//   [ToolBar(72px) | FeatureSidebar(0~290px) | Canvas | RightPanel(280px)]
//
// 모바일(md 미만): TopBar + Canvas + MobileBottomSheet
//
// 글로벌 keydown 핸들러:
//   ⌘K          → CommandPalette 열기
//   ?           → KeyboardShortcutsModal 열기 (input focus 아닐 때)
//   V/T/P/B/Q/W/D/S/X/U/I → setActiveTool
//   storywork:open-shortcuts  → Custom Event (builtins.ts 에서 dispatch)
//   storywork:toggle-theme    → Custom Event
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import { AddObjectCommand } from '@storywork/editor-history'
import type { LayerNodeJson, LayerTree } from '@storywork/editor-layers'
import type { PageJsonV1 } from '@storywork/schema/editor'
import { useTheme, useToast } from '@storywork/ui'
import { FabricImage, Rect } from 'fabric'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { ResourceSummary } from '../../app/api/_lib/search-types'
import {
  AUTOSAVE_STORAGE_KEY,
  DEFAULT_FORMAT,
  SEED_BACKGROUND_FILL,
  SEED_POSE_PNG_DATA_URL,
} from '../../lib/editor/seed'

import { CommandPalette } from './CommandPalette'
import { EditorCanvas } from './EditorCanvas'
import { EditorContext } from './EditorContext'
import { FeatureSidebar } from './FeatureSidebar'
import { Footer } from './Footer'
import { useAutosave } from './hooks/useAutosave'
import { useHistory } from './hooks/useHistory'
import { useSelection } from './hooks/useSelection'
import type { EditorRefs } from './hooks/useStoryCanvas'
import { useStoryCanvas } from './hooks/useStoryCanvas'
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal'
import { MobileBottomSheet } from './MobileBottomSheet'
import { RightPanel } from './RightPanel'
import { type ToolId, useToolStore } from './store/useToolStore'
import { ToolBar } from './ToolBar'
import { TopBar } from './TopBar'
import type { HistoryRef as History } from './types'

// 도구 단축키 맵
const TOOL_SHORTCUTS: Record<string, ToolId> = {
  v: 'select',
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
}

/**
 * EditorShell
 *
 * M1-08f: CommandPalette + KeyboardShortcutsModal + 글로벌 단축키 통합
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
  const { show: showToastFn } = useToast()
  const { toggleTheme } = useTheme()

  const showToast = useCallback(
    (msg: string, variant?: 'success' | 'warning' | 'error' | 'info') => {
      showToastFn({ message: msg, variant: variant ?? 'info' })
    },
    [showToastFn],
  )

  const { active: activeTool, setActive: setActiveTool, tapTool } = useToolStore()

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

  // ── 모달 상태 ────────────────────────────────────────────────────
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false)

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

  // ── 글로벌 키보드 단축키 ─────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // ⌘K / Ctrl+K → CommandPalette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((v) => !v)
        return
      }

      // 모달이 열려있으면 하위 단축키 무시
      if (commandPaletteOpen || shortcutsModalOpen) return

      // ? → ShortcutsModal (input 아닐 때)
      if (!isInput && e.key === '?') {
        e.preventDefault()
        setShortcutsModalOpen(true)
        return
      }

      // input focus 중이면 나머지 무시
      if (isInput) return

      // 도구 단축키 (V/T/P/B/Q/W/D/S/X/U/I)
      const toolId = TOOL_SHORTCUTS[e.key.toLowerCase()]
      if (toolId && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        tapTool(toolId)
        return
      }

      // ⌘A / Ctrl+A → 전체 선택
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        const fc = canvasRef.current?._fabricCanvas
        if (fc) {
          const objs = fc.getObjects()
          if (objs.length > 0) {
            void import('fabric').then(({ ActiveSelection }) => {
              fc.discardActiveObject()
              const sel = new ActiveSelection(objs, { canvas: fc })
              fc.setActiveObject(sel)
              fc.requestRenderAll()
            })
          }
        }
        return
      }

      // ⌘C / Ctrl+C → 복사
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        const fc = canvasRef.current?._fabricCanvas
        if (fc?.getActiveObject()) {
          e.preventDefault()
          const canvas = canvasRef.current
          if (canvas) {
            void import('./lib/clipboard').then(({ copySelection }) => {
              void copySelection(canvas)
            })
          }
        }
        return
      }

      // ⌘V / Ctrl+V → 붙여넣기
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        const canvas = canvasRef.current
        const history = historyRef.current
        if (canvas && history) {
          e.preventDefault()
          void import('./lib/clipboard').then(({ paste }) => {
            void paste(canvas, history)
          })
        }
        return
      }

      // ⌘D / Ctrl+D → 복제
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault()
        const canvas = canvasRef.current
        const history = historyRef.current
        if (canvas && history) {
          void import('./lib/clipboard').then(({ duplicateSelection }) => {
            void duplicateSelection(canvas, history)
          })
        }
        return
      }

      // ⌘Z / Ctrl+Z → Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (historyRef.current?.canUndo()) historyRef.current.undo()
        return
      }

      // ⌘⇧Z / Ctrl+⇧Z → Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        if (historyRef.current?.canRedo()) historyRef.current.redo()
        return
      }

      // ⌘G / Ctrl+G → 그룹
      if ((e.metaKey || e.ctrlKey) && e.key === 'g' && !e.shiftKey) {
        e.preventDefault()
        const fc = canvasRef.current?._fabricCanvas
        const canvas = canvasRef.current
        const layerTree = layerTreeRef.current
        const history = historyRef.current
        if (fc && canvas && layerTree && history) {
          void import('fabric').then(({ ActiveSelection }) => {
            const active = fc.getActiveObject()
            if (!(active instanceof ActiveSelection)) return
            const objs = active.getObjects()
            const ids = objs
              .map((o) => (o as { data?: { id?: string } }).data?.id)
              .filter((id): id is string => Boolean(id))
            if (ids.length < 2) return
            void import('@storywork/editor-history').then(({ GroupCommand }) => {
              const cmd = new GroupCommand({ layerTree, ids })
              history.push(cmd)
              fc.discardActiveObject()
              fc.requestRenderAll()
            })
          })
        }
        return
      }

      // ⌘⇧G / Ctrl+⇧G → 그룹 해제
      if ((e.metaKey || e.ctrlKey) && e.key === 'g' && e.shiftKey) {
        e.preventDefault()
        const fc = canvasRef.current?._fabricCanvas
        const layerTree = layerTreeRef.current
        const history = historyRef.current
        if (fc && layerTree && history) {
          const active = fc.getActiveObject()
          if (active) {
            const groupId = (active as { data?: { id?: string } }).data?.id
            if (groupId) {
              const node = layerTree.getNode(groupId)
              if (node?.kind === 'group') {
                void import('@storywork/editor-history').then(({ UngroupCommand }) => {
                  const cmd = new UngroupCommand({
                    layerTree,
                    groupId,
                    groupNodeSnapshot: { ...node },
                  })
                  history.push(cmd)
                  fc.discardActiveObject()
                  fc.requestRenderAll()
                })
              }
            }
          }
        }
        return
      }

      // Del → 선택 객체 삭제
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const fc = canvasRef.current?._fabricCanvas
        const canvas = canvasRef.current
        const history = historyRef.current
        if (fc) {
          const active = fc.getActiveObject()
          if (active) {
            e.preventDefault()
            if (history && canvas) {
              void import('fabric').then(({ ActiveSelection }) => {
                void import('@storywork/editor-history').then(({ RemoveObjectCommand }) => {
                  const targets = active instanceof ActiveSelection ? active.getObjects() : [active]
                  fc.discardActiveObject()
                  for (const obj of targets) {
                    const dataTyped = (obj as { data?: { id?: string; kind?: string } }).data
                    const id = dataTyped?.id
                    const objectData = id ? canvas.getObjectData(id) : undefined
                    if (id && objectData) {
                      history.push(
                        new RemoveObjectCommand({ canvas, id, fabricObj: obj, objectData }),
                      )
                    } else {
                      fc.remove(obj)
                    }
                  }
                  fc.requestRenderAll()
                })
              })
            } else {
              fc.remove(active)
              fc.discardActiveObject()
              fc.requestRenderAll()
            }
          }
        }
        return
      }

      // 레이어 순서 단축키 (ZOrderCommand 기반)
      const fc = canvasRef.current?._fabricCanvas
      const layerTree = layerTreeRef.current
      const history = historyRef.current
      if (fc) {
        const obj = fc.getActiveObject()
        const id = obj ? (obj as { data?: { id?: string } }).data?.id : undefined
        if (obj && !e.metaKey && !e.ctrlKey) {
          if (e.key === ']') {
            if (layerTree && history && id) {
              void import('@storywork/editor-history').then(({ ZOrderCommand }) => {
                const parentId = layerTree.getNode(id)?.parentId ?? null
                const siblings = parentId
                  ? (layerTree.getNode(parentId)?.childrenIds ?? [])
                  : layerTree.getRootNodes().map((n) => n.id)
                history.push(
                  new ZOrderCommand({
                    layerTree,
                    id,
                    action: 'bringForward',
                    siblingsBefore: siblings,
                    parentId,
                  }),
                )
              })
            } else {
              fc.bringObjectForward(obj)
              fc.requestRenderAll()
            }
          }
          if (e.key === '[') {
            if (layerTree && history && id) {
              void import('@storywork/editor-history').then(({ ZOrderCommand }) => {
                const parentId = layerTree.getNode(id)?.parentId ?? null
                const siblings = parentId
                  ? (layerTree.getNode(parentId)?.childrenIds ?? [])
                  : layerTree.getRootNodes().map((n) => n.id)
                history.push(
                  new ZOrderCommand({
                    layerTree,
                    id,
                    action: 'sendBackward',
                    siblingsBefore: siblings,
                    parentId,
                  }),
                )
              })
            } else {
              fc.sendObjectBackwards(obj)
              fc.requestRenderAll()
            }
          }
        }
        if (obj && (e.metaKey || e.ctrlKey)) {
          if (e.key === ']') {
            e.preventDefault()
            if (layerTree && history && id) {
              void import('@storywork/editor-history').then(({ ZOrderCommand }) => {
                const parentId = layerTree.getNode(id)?.parentId ?? null
                const siblings = parentId
                  ? (layerTree.getNode(parentId)?.childrenIds ?? [])
                  : layerTree.getRootNodes().map((n) => n.id)
                history.push(
                  new ZOrderCommand({
                    layerTree,
                    id,
                    action: 'bringToFront',
                    siblingsBefore: siblings,
                    parentId,
                  }),
                )
              })
            } else {
              fc.bringObjectToFront(obj)
              fc.requestRenderAll()
            }
          }
          if (e.key === '[') {
            e.preventDefault()
            if (layerTree && history && id) {
              void import('@storywork/editor-history').then(({ ZOrderCommand }) => {
                const parentId = layerTree.getNode(id)?.parentId ?? null
                const siblings = parentId
                  ? (layerTree.getNode(parentId)?.childrenIds ?? [])
                  : layerTree.getRootNodes().map((n) => n.id)
                history.push(
                  new ZOrderCommand({
                    layerTree,
                    id,
                    action: 'sendToBack',
                    siblingsBefore: siblings,
                    parentId,
                  }),
                )
              })
            } else {
              fc.sendObjectToBack(obj)
              fc.requestRenderAll()
            }
          }
        }
      }

      // F → Fit to viewport
      if (e.key === 'f' || e.key === 'F') {
        const cv = canvasRef.current
        if (cv) {
          void import('./Footer').then(({ fitToViewport }) => {
            fitToViewport(cv)
          })
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [commandPaletteOpen, shortcutsModalOpen, tapTool])

  // ── Custom Events (builtins.ts 에서 dispatch) ────────────────
  useEffect(() => {
    const onOpenShortcuts = () => setShortcutsModalOpen(true)
    const onToggleTheme = () => toggleTheme()

    window.addEventListener('storywork:open-shortcuts', onOpenShortcuts)
    window.addEventListener('storywork:toggle-theme', onToggleTheme)
    return () => {
      window.removeEventListener('storywork:open-shortcuts', onOpenShortcuts)
      window.removeEventListener('storywork:toggle-theme', onToggleTheme)
    }
  }, [toggleTheme])

  // ── 포즈 리소스 → 캔버스 추가 (PosePanel + 드래그앤드롭 공통) ─────────────
  const addPoseFromResource = useCallback(
    async (pose: ResourceSummary) => {
      const canvas = canvasRef.current
      const history = historyRef.current
      if (!canvas || !history) {
        showToast('편집기가 준비되지 않았습니다.', 'error')
        return
      }

      // thumbUrl 을 우선 사용 (실제 고해상도 fileUrl 은 M3+에서 연결)
      const url = pose.thumbUrl
      if (!url) {
        showToast('포즈 이미지를 불러올 수 없습니다.', 'error')
        return
      }

      try {
        const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' })

        const canvasWidthPx = canvas.mmToPx(DEFAULT_FORMAT.widthMm)
        const canvasHeightPx = canvas.mmToPx(DEFAULT_FORMAT.heightMm)

        // ADR-0011a: lowDpi 자산은 페이지 한 변의 1/2 이하로 자동 크기 조정
        const maxFraction = pose.lowDpi ? 0.5 : 0.65
        const naturalW = img.width ?? 1
        const naturalH = img.height ?? 1
        const maxW = canvasWidthPx * maxFraction
        const maxH = canvasHeightPx * maxFraction
        const scale = Math.min(1, maxW / naturalW, maxH / naturalH)
        const scaledW = naturalW * scale
        const scaledH = naturalH * scale

        img.set({
          left: (canvasWidthPx - scaledW) / 2,
          top: (canvasHeightPx - scaledH) / 3,
          scaleX: scale,
          scaleY: scale,
        })

        const cmd = new AddObjectCommand({
          canvas,
          fabricObj: img,
          dataOverrides: {
            kind: 'pose',
            resourceId: pose.id,
          } as any,
        })
        history.push(cmd)

        // 추가 후 자동 선택
        const addedId = cmd.assignedId
        if (addedId) {
          const fabricObj = canvas.getObject(addedId)
          if (fabricObj) {
            canvas._fabricCanvas.setActiveObject(fabricObj)
            canvas._fabricCanvas.requestRenderAll()
          }
        }

        showToast(
          `${pose.slug.replace(/-/g, ' ')} 추가됨${pose.lowDpi ? ' (저해상도 — 작게 배치됨)' : ''}`,
          'success',
        )
      } catch (err) {
        console.error('[EditorShell] 포즈 추가 실패:', err)
        showToast('포즈 추가에 실패했습니다.', 'error')
      }
    },
    [showToast],
  )

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
      showToast('포즈 추가에 실패했습니다.', 'error')
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

  // ── CommandContext ─────────────────────────────────────────────
  const commandCtx = {
    canvas: canvasRef.current,
    layerTree: layerTreeRef.current,
    history: historyRef.current,
    setActiveTool,
    showToast,
  }

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
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenShortcuts={() => setShortcutsModalOpen(true)}
        />

        {/* 중앙 영역: ToolBar | FeatureSidebar | Canvas | RightPanel */}
        <div className="flex flex-1 overflow-hidden">
          {/* ToolBar — 데스크톱(md+) only */}
          <ToolBar />

          {/* FeatureSidebar — 데스크톱(md+) only */}
          <FeatureSidebar
            canvas={canvasRef.current}
            history={historyRef.current as any}
            layerTree={layerTreeRef.current}
            onAddPoseToCanvas={addPoseFromResource}
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
              onAddPoseToCanvas={addPoseFromResource}
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
            activeTool={activeTool}
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

        {/* CommandPalette — 글로벌 */}
        <CommandPalette
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          ctx={commandCtx}
        />

        {/* KeyboardShortcutsModal — 글로벌 */}
        <KeyboardShortcutsModal
          open={shortcutsModalOpen}
          onClose={() => setShortcutsModalOpen(false)}
        />
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
