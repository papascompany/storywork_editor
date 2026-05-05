/**
 * editor.smoke.test.tsx — M1-06 편집기 셸 스모크 테스트
 *
 * 전략:
 * - EditorShell React 컴포넌트는 Next.js App Router 환경 의존성이 많아
 *   헤드리스 패키지(editor-core/layers/history/export)를 직접 사용하는
 *   통합 테스트로 핵심 흐름을 검증한다.
 * - "포즈 추가 → LayerPanel 에 1개" / "undo → 0개" / "exportJson 트리거" 흐름을 커버.
 */

import { StoryCanvas } from '@storywork/editor-core'
import { exportJson } from '@storywork/editor-export'
import { DirtyTracker } from '@storywork/editor-export'
import { History, AddObjectCommand, RemoveObjectCommand } from '@storywork/editor-history'
import { LayerTree } from '@storywork/editor-layers'
import { Rect } from 'fabric'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { DEFAULT_FORMAT, AUTOSAVE_STORAGE_KEY } from '../lib/editor/seed'

// ── 공유 픽스처 ────────────────────────────────────────────────────────────

function buildEditorRig() {
  const canvas = new StoryCanvas({ format: DEFAULT_FORMAT })
  const layerTree = new LayerTree({ canvas })
  const history = new History({ capacity: 200 })
  return { canvas, layerTree, history }
}

function addBackgroundRect(canvas: StoryCanvas, history: History) {
  const widthPx = canvas.mmToPx(DEFAULT_FORMAT.widthMm)
  const heightPx = canvas.mmToPx(DEFAULT_FORMAT.heightMm)
  const rect = new Rect({ left: 0, top: 0, width: widthPx, height: heightPx, fill: '#f3f4f6' })
  const cmd = new AddObjectCommand({
    canvas,
    fabricObj: rect,
    dataOverrides: { kind: 'background' },
  })
  history.push(cmd)
  return cmd
}

// ── 테스트 ─────────────────────────────────────────────────────────────────

describe('EditorShell 통합 — 헤드리스 코어 흐름', () => {
  let canvas: StoryCanvas
  let layerTree: LayerTree
  let history: History

  beforeEach(() => {
    ;({ canvas, layerTree, history } = buildEditorRig())
  })

  afterEach(() => {
    layerTree.dispose()
    canvas.dispose()
    history.dispose()
  })

  // ─── 1. 빈 셸 초기화 ───────────────────────────────────────────────────
  it('초기 상태: 레이어가 없다', () => {
    expect(layerTree.getRootNodes()).toHaveLength(0)
    expect(history.canUndo()).toBe(false)
    expect(history.canRedo()).toBe(false)
  })

  // ─── 2. 포즈 추가 → LayerPanel 1개 ────────────────────────────────────
  it('포즈(Rect 임시) 추가 → 레이어 1개 등록', () => {
    const rect = new Rect({ left: 10, top: 10, width: 50, height: 50, fill: 'blue' })
    const cmd = new AddObjectCommand({
      canvas,
      fabricObj: rect,
      dataOverrides: { kind: 'pose' },
    })
    history.push(cmd)

    const nodes = layerTree.getRootNodes()
    expect(nodes).toHaveLength(1)
    expect(nodes[0]?.kind).toBe('pose')
    expect(history.canUndo()).toBe(true)
  })

  // ─── 3. 포즈 추가 후 undo → 0개 ──────────────────────────────────────
  it('undo: 레이어 0개로 복원', () => {
    const rect = new Rect({ left: 10, top: 10, width: 50, height: 50, fill: 'blue' })
    const cmd = new AddObjectCommand({ canvas, fabricObj: rect, dataOverrides: { kind: 'pose' } })
    history.push(cmd)
    expect(layerTree.getRootNodes()).toHaveLength(1)

    history.undo()
    expect(layerTree.getRootNodes()).toHaveLength(0)
    expect(history.canUndo()).toBe(false)
    expect(history.canRedo()).toBe(true)
  })

  // ─── 4. redo → 다시 1개 ────────────────────────────────────────────────
  it('redo: undo 이후 다시 레이어 1개 복원', () => {
    const rect = new Rect({ left: 10, top: 10, width: 50, height: 50, fill: 'blue' })
    history.push(new AddObjectCommand({ canvas, fabricObj: rect, dataOverrides: { kind: 'pose' } }))
    history.undo()
    history.redo()

    expect(layerTree.getRootNodes()).toHaveLength(1)
  })

  // ─── 5. 배경 추가 + 포즈 추가 → 2개 ──────────────────────────────────
  it('배경 + 포즈 추가 → 레이어 2개', () => {
    addBackgroundRect(canvas, history)
    const rect2 = new Rect({ left: 20, top: 20, width: 40, height: 40, fill: 'red' })
    history.push(
      new AddObjectCommand({ canvas, fabricObj: rect2, dataOverrides: { kind: 'pose' } }),
    )

    expect(layerTree.getRootNodes()).toHaveLength(2)
  })

  // ─── 6. exportJson 트리거 → 모킹된 다운로드 검증 ──────────────────────
  it('exportJson: canvas + layerTree 직렬화 결과에 page/layers 포함', () => {
    addBackgroundRect(canvas, history)
    const result = exportJson(canvas, layerTree)

    expect(result).toHaveProperty('page')
    expect(result).toHaveProperty('layers')
    expect(result.page.v).toBe(1)
    expect(Array.isArray(result.layers)).toBe(true)
    expect(result.layers).toHaveLength(1)
  })

  // ─── 7. localStorage autosave round-trip ───────────────────────────────
  it('autosave: localStorage 저장 후 다시 로드', async () => {
    addBackgroundRect(canvas, history)
    const result = exportJson(canvas, layerTree)
    const json = JSON.stringify(result)

    // localStorage 에 저장
    localStorage.setItem(AUTOSAVE_STORAGE_KEY, json)

    // 새 canvas 에 복원
    const { canvas: canvas2, layerTree: layerTree2 } = buildEditorRig()
    const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY)
    expect(raw).not.toBeNull()

    if (!raw) throw new Error('raw should not be null')
    const data = JSON.parse(raw) as typeof result
    await canvas2.loadJson(data.page)
    layerTree2.loadJson(data.layers)

    expect(layerTree2.getRootNodes()).toHaveLength(1)

    layerTree2.dispose()
    canvas2.dispose()
    localStorage.removeItem(AUTOSAVE_STORAGE_KEY)
  })

  // ─── 8. RemoveObjectCommand → 레이어 삭제 ─────────────────────────────
  it('RemoveObjectCommand: 삭제 후 레이어 0개', () => {
    const rect = new Rect({ left: 10, top: 10, width: 50, height: 50 })
    const addCmd = new AddObjectCommand({
      canvas,
      fabricObj: rect,
      dataOverrides: { kind: 'pose' },
    })
    history.push(addCmd)

    const id = addCmd.assignedId
    if (!id) throw new Error('assignedId should not be null')
    const fabricObj = canvas.getObject(id)
    if (!fabricObj) throw new Error('fabricObj should exist')
    const data = canvas.getObjectData(id)
    if (!data) throw new Error('objectData should exist')
    const removeCmd = new RemoveObjectCommand({ canvas, id, fabricObj, objectData: data })
    history.push(removeCmd)

    expect(layerTree.getRootNodes()).toHaveLength(0)
  })

  // ─── 9. DirtyTracker — history:applied 시 dirty 전환 ──────────────────
  it('DirtyTracker: history push 후 dirty=true', () => {
    const tracker = new DirtyTracker({ history, debounceMs: 60000 })
    expect(tracker.isDirty()).toBe(false)

    addBackgroundRect(canvas, history)
    expect(tracker.isDirty()).toBe(true)

    tracker.dispose()
  })

  // ─── 10. 잠금/숨김 toggle ─────────────────────────────────────────────
  it('LayerTree: lock/hidden 토글', () => {
    const rect = new Rect({ left: 0, top: 0, width: 100, height: 100 })
    history.push(new AddObjectCommand({ canvas, fabricObj: rect, dataOverrides: { kind: 'pose' } }))

    const node = layerTree.getRootNodes()[0]
    if (!node) throw new Error('node should exist')
    expect(node.locked).toBe(false)
    expect(node.hidden).toBe(false)

    layerTree.setLock(node.id, true)
    layerTree.setHidden(node.id, true)

    const updated = layerTree.getNode(node.id)
    if (!updated) throw new Error('updated node should exist')
    expect(updated.locked).toBe(true)
    expect(updated.hidden).toBe(true)
  })
})
