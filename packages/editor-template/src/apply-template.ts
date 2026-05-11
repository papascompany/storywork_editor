// ─────────────────────────────────────────────
// apply-template.ts — 핵심 템플릿 적용 로직
//
// StoryCanvas 에 TemplateSpec 을 적용해 슬롯 placeholder 를 생성한다.
// fabric 은 dynamic import (헤드리스 환경 대응).
// React/UI 의존 없음.
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'

import type { Slot } from './slot-types.js'
import { SLOT_KIND_COLORS, SLOT_KIND_LABELS } from './slot-types.js'
import type { SlotMap, SlotPlaceholder, TemplateSpec } from './template-types.js'

// ─── 옵션 ─────────────────────────────────────────────────────────────────────

export interface PlaceholderStyle {
  /** 배경 투명도 (0~1). 디폴트: 0.15 */
  fillOpacity?: number
  /** 점선 패턴. 디폴트: [6, 4] */
  strokeDashArray?: number[]
  /** 테두리 두께. 디폴트: 2 */
  strokeWidth?: number
}

export interface ApplyTemplateOptions {
  /** 슬롯 placeholder 의 시각 스타일 */
  placeholderStyle?: PlaceholderStyle
  /**
   * 기존 객체 처리:
   * - 'keep': 기존 객체 모두 유지
   * - 'clear': 기존 객체 모두 제거
   * - 'preserve-user': 기존 placeholder 만 제거, 사용자 자산은 유지 (기본값)
   */
  existingObjects?: 'keep' | 'clear' | 'preserve-user'
}

// ─── 내부 헬퍼 ────────────────────────────────────────────────────────────────

/**
 * 슬롯 placeholder 에 저장하는 data 속성.
 * editor-core ObjectData 호환.
 */
interface PlaceholderData {
  id: string
  kind: Slot['kind']
  slotId: string
  isPlaceholder: true
  locked: boolean
  meta?: Record<string, unknown>
}

/** 캔버스 절대 px 좌표 계산 (정규화 0..1 → px) */
function slotToAbsolutePx(
  slot: Slot,
  canvasW: number,
  canvasH: number,
): { left: number; top: number; width: number; height: number } {
  return {
    left: slot.x * canvasW,
    top: slot.y * canvasH,
    width: slot.w * canvasW,
    height: slot.h * canvasH,
  }
}

/** 캔버스 px 크기 조회 (fabric v6 호환) */
function getCanvasSize(canvas: StoryCanvas): { w: number; h: number } {
  const fc = canvas._fabricCanvas
  // fabric v6: getWidth/getHeight
  const w =
    typeof fc.getWidth === 'function'
      ? fc.getWidth()
      : ((fc as unknown as { width: number }).width ?? 600)
  const h =
    typeof fc.getHeight === 'function'
      ? fc.getHeight()
      : ((fc as unknown as { height: number }).height ?? 800)
  return { w, h }
}

/** nanoid-lite (crypto.randomUUID 폴백) */
function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ─── 기존 객체 제거 ───────────────────────────────────────────────────────────

function clearExistingObjects(canvas: StoryCanvas, mode: 'keep' | 'clear' | 'preserve-user'): void {
  if (mode === 'keep') return

  const fc = canvas._fabricCanvas
  const objects = fc.getObjects()

  for (const obj of objects) {
    const data = (obj as { data?: PlaceholderData | Record<string, unknown> }).data

    if (mode === 'clear') {
      // 모두 제거
      const id = (data as PlaceholderData | undefined)?.id
      if (id) {
        canvas.removeObject(id)
      } else {
        fc.remove(obj)
      }
    } else if (mode === 'preserve-user') {
      // placeholder 만 제거
      const isPlaceholder = (data as PlaceholderData | undefined)?.isPlaceholder === true
      if (isPlaceholder) {
        const id = (data as PlaceholderData).id
        canvas.removeObject(id)
      }
    }
  }
}

// ─── 핵심 함수 ────────────────────────────────────────────────────────────────

/**
 * TemplateSpec 을 캔버스에 적용한다.
 *
 * - 각 슬롯 → fabric.Rect placeholder 생성 (kind 별 색상 + 점선 테두리)
 * - placeholder 의 data 속성에 { slotId, kind, isPlaceholder: true } 저장
 * - 회전 적용
 * - SlotMap 반환 (slotId → SlotPlaceholder)
 *
 * @returns SlotMap
 */
export function applyTemplate(
  canvas: StoryCanvas,
  template: TemplateSpec,
  options?: ApplyTemplateOptions,
): SlotMap {
  const mode = options?.existingObjects ?? 'preserve-user'
  const style = options?.placeholderStyle ?? {}

  const fillOpacity = style.fillOpacity ?? 0.15
  const strokeDashArray = style.strokeDashArray ?? [6, 4]
  const strokeWidth = style.strokeWidth ?? 2

  // 기존 객체 처리
  clearExistingObjects(canvas, mode)

  const { w: canvasW, h: canvasH } = getCanvasSize(canvas)
  const slotMap: SlotMap = new Map()

  // fabric 모듈은 동기 import (Node 환경에서는 테스트 mock)

  const fabric = require('fabric') as {
    Rect: new (opts: Record<string, unknown>) => unknown
  }

  for (const slot of template.slots) {
    const { left, top, width, height } = slotToAbsolutePx(slot, canvasW, canvasH)
    const kindColor = SLOT_KIND_COLORS[slot.kind] ?? '#888888'
    const kindLabel = SLOT_KIND_LABELS[slot.kind] ?? slot.kind
    const id = genId()

    const placeholderData: PlaceholderData = {
      id,
      kind: slot.kind,
      slotId: slot.id,
      isPlaceholder: true,
      locked: slot.locked,
    }

    const rect = new fabric.Rect({
      left,
      top,
      width,
      height,
      angle: slot.rotation,
      fill: kindColor,
      opacity: fillOpacity,
      stroke: kindColor,
      strokeWidth,
      strokeDashArray,
      selectable: !slot.locked,
      evented: !slot.locked,
      data: placeholderData,
      // hint 텍스트는 canvas tooltip / 인스펙터 영역에서 처리 (fabric Text 오버헤드 회피)
      _hint: slot.hint ?? kindLabel,
      _slotKind: slot.kind,
    })

    const objectId = canvas.addObject(
      { kind: slot.kind, slotId: slot.id, locked: slot.locked },
      rect as Parameters<typeof canvas.addObject>[1],
    )

    const placeholder: SlotPlaceholder = {
      slotId: slot.id,
      objectId,
      filled: false,
    }

    slotMap.set(slot.id, placeholder)
  }

  canvas._fabricCanvas.requestRenderAll()

  return slotMap
}

// ─── fillSlot ─────────────────────────────────────────────────────────────────

/**
 * 슬롯 placeholder 를 실제 자산으로 교체한다.
 *
 * 1. placeholder Rect 를 canvas 에서 제거
 * 2. fabricObject 를 슬롯 위치/크기로 조정
 * 3. canvas 에 추가
 * 4. SlotPlaceholder.filled = true, filledObjectId 기록
 */
export function fillSlot(
  slotMap: SlotMap,
  slotId: string,
  fabricObject: Parameters<StoryCanvas['addObject']>[1],
  canvas: StoryCanvas,
  slot: Slot,
): string {
  const placeholder = slotMap.get(slotId)
  if (!placeholder) {
    throw new Error(`[editor-template] fillSlot: slotId "${slotId}" not found in SlotMap`)
  }

  // 기존 placeholder 제거
  if (!placeholder.filled) {
    canvas.removeObject(placeholder.objectId)
  } else if (placeholder.filledObjectId) {
    // 이미 채워진 경우 기존 자산 제거
    canvas.removeObject(placeholder.filledObjectId)
  }

  // 슬롯 위치/크기로 자산 이동
  const { w: canvasW, h: canvasH } = getCanvasSize(canvas)
  const { left, top, width, height } = slotToAbsolutePx(slot, canvasW, canvasH)

  const obj = fabricObject as {
    set: (props: Record<string, unknown>) => void
    setCoords: () => void
  }
  obj.set({
    left,
    top,
    angle: slot.rotation,
    // 자산 크기를 슬롯에 맞게 스케일 (width/height 가 있는 경우)
    scaleX: width / ((fabricObject as { width?: number }).width ?? width),
    scaleY: height / ((fabricObject as { height?: number }).height ?? height),
  })
  obj.setCoords()

  const filledObjectId = canvas.addObject({ kind: slot.kind, slotId: slot.id }, fabricObject)

  // SlotMap 업데이트
  placeholder.filled = true
  placeholder.filledObjectId = filledObjectId

  canvas._fabricCanvas.requestRenderAll()

  return filledObjectId
}

// ─── clearSlot ────────────────────────────────────────────────────────────────

/**
 * 슬롯의 자산을 제거하고 placeholder 를 복원한다.
 */
export function clearSlot(
  slotMap: SlotMap,
  slotId: string,
  canvas: StoryCanvas,
  slot: Slot,
  options?: Pick<ApplyTemplateOptions, 'placeholderStyle'>,
): void {
  const placeholder = slotMap.get(slotId)
  if (!placeholder) return

  // 채워진 자산 제거
  if (placeholder.filled && placeholder.filledObjectId) {
    canvas.removeObject(placeholder.filledObjectId)
    placeholder.filledObjectId = undefined
    placeholder.filled = false
  }

  // placeholder 복원
  const style = options?.placeholderStyle ?? {}
  const fillOpacity = style.fillOpacity ?? 0.15
  const strokeDashArray = style.strokeDashArray ?? [6, 4]
  const strokeWidth = style.strokeWidth ?? 2

  const { w: canvasW, h: canvasH } = getCanvasSize(canvas)
  const { left, top, width, height } = slotToAbsolutePx(slot, canvasW, canvasH)
  const kindColor = SLOT_KIND_COLORS[slot.kind] ?? '#888888'
  const id = genId()

  const placeholderData: PlaceholderData = {
    id,
    kind: slot.kind,
    slotId: slot.id,
    isPlaceholder: true,
    locked: slot.locked,
  }

  const fabric = require('fabric') as {
    Rect: new (opts: Record<string, unknown>) => unknown
  }

  const rect = new fabric.Rect({
    left,
    top,
    width,
    height,
    angle: slot.rotation,
    fill: kindColor,
    opacity: fillOpacity,
    stroke: kindColor,
    strokeWidth,
    strokeDashArray,
    selectable: !slot.locked,
    evented: !slot.locked,
    data: placeholderData,
    _hint: slot.hint ?? SLOT_KIND_LABELS[slot.kind] ?? slot.kind,
    _slotKind: slot.kind,
  })

  const newObjectId = canvas.addObject(
    { kind: slot.kind, slotId: slot.id, locked: slot.locked },
    rect as Parameters<typeof canvas.addObject>[1],
  )

  placeholder.objectId = newObjectId
  placeholder.filled = false

  canvas._fabricCanvas.requestRenderAll()
}
