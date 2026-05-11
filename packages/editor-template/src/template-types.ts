// ─────────────────────────────────────────────
// template-types.ts — 템플릿 도메인 타입
//
// editor-core / editor-history 에만 의존.
// React/UI 의존 없음.
// ─────────────────────────────────────────────

import type { Slot } from './slot-types.js'

/**
 * 캔버스에 적용할 완전한 템플릿 명세.
 * admin Template DB 레코드 또는 인라인 프리셋 모두 이 인터페이스로 매핑한다.
 */
export interface TemplateSpec {
  id: string
  name: string
  formatId: string
  format: {
    widthMm: number
    heightMm: number
    bleedMm: number
    safeMm: number
  }
  slots: Slot[]
  thumbnail?: string
  /** 페이지 제작 의도 (예: "1대1 대화 장면", "풍경 단독") */
  intent?: string
}

/**
 * 캔버스 위 슬롯 placeholder 의 런타임 상태.
 * slotId → FabricObject(Rect placeholder) + 채움 여부.
 */
export interface SlotPlaceholder {
  slotId: string
  /** placeholder 로 사용되는 Rect 의 editor-core objectId */
  objectId: string
  /** 채워진 경우 자산 objectId */
  filledObjectId?: string
  filled: boolean
}

/** 슬롯 ID → SlotPlaceholder 매핑 */
export type SlotMap = Map<string, SlotPlaceholder>

/** applyTemplate 반환값 + 컨텍스트 */
export interface ApplyTemplateResult {
  slotMap: SlotMap
  templateSpec: TemplateSpec
}
