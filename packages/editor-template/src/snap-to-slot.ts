// ─────────────────────────────────────────────
// snap-to-slot.ts — 드래그 중 슬롯 자동 스냅
//
// 사용자가 자산을 드래그할 때 가장 가까운 슬롯을 찾아
// 자동으로 스냅시키는 유틸리티.
//
// FOLLOWUP-16 패턴: bound 메서드 + dispose off + getContext 가드
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'

import type { Slot } from './slot-types.js'
import type { SlotMap } from './template-types.js'

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface SnapResult {
  slotId: string
  slot: Slot
  /** 중심점 거리 (px) */
  distance: number
}

export interface SnapToSlotOptions {
  /** 스냅 임계값 (px). 기본값: 40 */
  threshold?: number
  /** 스냅 대상 슬롯 kind 필터 (미설정 시 모든 kind) */
  allowedKinds?: Slot['kind'][]
}

// ─── 거리 계산 ────────────────────────────────────────────────────────────────

/**
 * 점과 슬롯 중심 사이의 거리를 반환한다.
 */
function distanceToSlotCenter(
  point: { x: number; y: number },
  slot: Slot,
  canvasW: number,
  canvasH: number,
): number {
  const cx = (slot.x + slot.w / 2) * canvasW
  const cy = (slot.y + slot.h / 2) * canvasH
  const dx = point.x - cx
  const dy = point.y - cy
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 주어진 점에서 가장 가까운 슬롯을 찾는다.
 *
 * @param slotMap  현재 활성 SlotMap
 * @param slots    전체 Slot 배열 (SlotMap 의 slotId → Slot 매핑용)
 * @param point    드래그 객체의 중심 좌표 (px)
 * @param canvasW  캔버스 너비 (px)
 * @param canvasH  캔버스 높이 (px)
 * @param threshold 스냅 임계값 (px)
 * @param allowedKinds 스냅 허용 kind 필터
 */
export function findNearestSlot(
  slotMap: SlotMap,
  slots: Slot[],
  point: { x: number; y: number },
  canvasW: number,
  canvasH: number,
  threshold = 40,
  allowedKinds?: Slot['kind'][],
): SnapResult | null {
  let nearest: SnapResult | null = null

  for (const slot of slots) {
    // 이미 채워진 슬롯은 스냅 대상 제외
    const placeholder = slotMap.get(slot.id)
    if (placeholder?.filled) continue

    // kind 필터
    if (allowedKinds && !allowedKinds.includes(slot.kind)) continue

    const distance = distanceToSlotCenter(point, slot, canvasW, canvasH)

    if (distance <= threshold) {
      if (!nearest || distance < nearest.distance) {
        nearest = { slotId: slot.id, slot, distance }
      }
    }
  }

  return nearest
}

// ─── attachSnapToSlot ─────────────────────────────────────────────────────────

/**
 * 캔버스 이벤트에 스냅 동작을 연결한다.
 *
 * 동작:
 * 1. object:moving → 가장 가까운 슬롯 찾기 → 임계값 내이면 placeholder 강조
 * 2. object:modified → 스냅 확정 → fillSlot 콜백 호출
 *
 * @returns dispose() 함수 (이벤트 해제)
 */
export function attachSnapToSlot(
  canvas: StoryCanvas,
  slotMap: SlotMap,
  slots: Slot[],
  onSnap: (slotId: string, slot: Slot, fabricObject: unknown) => void,
  options?: SnapToSlotOptions,
): { dispose(): void } {
  const threshold = options?.threshold ?? 40
  const allowedKinds = options?.allowedKinds

  const fc = canvas._fabricCanvas

  /** 현재 강조 중인 placeholder objectId */
  let highlightedObjectId: string | null = null

  // FOLLOWUP-16: bound 멤버 핸들러
  const onObjectMoving = (e: { target?: unknown }): void => {
    // dispose 후 호출 방지 (StoryCanvas 에서 off 가 되지만 혹시 모를 경우)
    if (!e.target) return

    const obj = e.target as {
      left?: number
      top?: number
      width?: number
      height?: number
      scaleX?: number
      scaleY?: number
      getCenterPoint?: () => { x: number; y: number }
    }

    // 드래그 중 객체 중심 좌표
    let cx: number
    let cy: number

    if (obj.getCenterPoint) {
      const cp = obj.getCenterPoint()
      cx = cp.x
      cy = cp.y
    } else {
      const w = (obj.width ?? 0) * (obj.scaleX ?? 1)
      const h = (obj.height ?? 0) * (obj.scaleY ?? 1)
      cx = (obj.left ?? 0) + w / 2
      cy = (obj.top ?? 0) + h / 2
    }

    // 실제 페이지 px 크기 (canvas.format 기반 — fc.getWidth() 는 뷰포트 크기를 반환하므로 사용 금지)
    const format = canvas.format
    const canvasW = canvas.mmToPx(format.widthMm)
    const canvasH = canvas.mmToPx(format.heightMm)

    const snap = findNearestSlot(
      slotMap,
      slots,
      { x: cx, y: cy },
      canvasW,
      canvasH,
      threshold,
      allowedKinds,
    )

    // 강조 상태 업데이트
    if (snap) {
      const placeholder = slotMap.get(snap.slotId)
      if (placeholder && placeholder.objectId !== highlightedObjectId) {
        // 이전 강조 해제
        if (highlightedObjectId) {
          const prevObj = canvas.getObject(highlightedObjectId)
          if (prevObj) {
            ;(prevObj as { set?: (p: Record<string, unknown>) => void }).set?.({ opacity: 0.15 })
          }
        }
        // 새 강조
        const snapObj = canvas.getObject(placeholder.objectId)
        if (snapObj) {
          ;(snapObj as { set?: (p: Record<string, unknown>) => void }).set?.({ opacity: 0.45 })
          fc.requestRenderAll()
        }
        highlightedObjectId = placeholder.objectId
      }
    } else {
      // 강조 해제
      if (highlightedObjectId) {
        const prevObj = canvas.getObject(highlightedObjectId)
        if (prevObj) {
          ;(prevObj as { set?: (p: Record<string, unknown>) => void }).set?.({ opacity: 0.15 })
          fc.requestRenderAll()
        }
        highlightedObjectId = null
      }
    }
  }

  const onObjectModified = (e: { target?: unknown }): void => {
    if (!e.target) return
    if (!highlightedObjectId) return

    const obj = e.target as {
      left?: number
      top?: number
      width?: number
      height?: number
      scaleX?: number
      scaleY?: number
      getCenterPoint?: () => { x: number; y: number }
    }

    let cx: number
    let cy: number

    if (obj.getCenterPoint) {
      const cp = obj.getCenterPoint()
      cx = cp.x
      cy = cp.y
    } else {
      const w = (obj.width ?? 0) * (obj.scaleX ?? 1)
      const h = (obj.height ?? 0) * (obj.scaleY ?? 1)
      cx = (obj.left ?? 0) + w / 2
      cy = (obj.top ?? 0) + h / 2
    }

    // 실제 페이지 px 크기 (canvas.format 기반 — fc.getWidth() 는 뷰포트 크기를 반환하므로 사용 금지)
    const format = canvas.format
    const canvasW = canvas.mmToPx(format.widthMm)
    const canvasH = canvas.mmToPx(format.heightMm)

    const snap = findNearestSlot(
      slotMap,
      slots,
      { x: cx, y: cy },
      canvasW,
      canvasH,
      threshold,
      allowedKinds,
    )

    if (snap) {
      onSnap(snap.slotId, snap.slot, e.target)
    }

    // 강조 해제
    if (highlightedObjectId) {
      const prevObj = canvas.getObject(highlightedObjectId)
      if (prevObj) {
        ;(prevObj as { set?: (p: Record<string, unknown>) => void }).set?.({ opacity: 0.15 })
        fc.requestRenderAll()
      }
      highlightedObjectId = null
    }
  }

  // FOLLOWUP-16: 이벤트 등록
  fc.on('object:moving', onObjectMoving)
  fc.on('object:modified', onObjectModified)

  return {
    dispose() {
      fc.off('object:moving', onObjectMoving)
      fc.off('object:modified', onObjectModified)
      highlightedObjectId = null
    },
  }
}
