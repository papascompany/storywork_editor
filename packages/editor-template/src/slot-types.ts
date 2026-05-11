// ─────────────────────────────────────────────
// slot-types.ts — 슬롯 타입 정의
//
// admin/lib/schemas/template.ts 의 Zod 스키마와 호환.
// Runtime 검증은 호출자가 Zod 로 처리.
// DOM/Node 양쪽에서 import 가능.
// ─────────────────────────────────────────────

export const SLOT_KINDS = [
  'pose',
  'background',
  'mise-en-scene',
  'prop',
  'speech-bubble',
  'word-fx',
  'decoration',
  'text',
] as const

export type SlotKind = (typeof SLOT_KINDS)[number]

/**
 * 슬롯 = 페이지 위 직사각형 영역 + 무엇이 들어갈지 힌트.
 * 좌표는 정규화 (0..1, Format widthMm/heightMm 기준).
 */
export interface Slot {
  id: string
  kind: SlotKind
  /** 정규화 x 좌표 (0..1) */
  x: number
  /** 정규화 y 좌표 (0..1) */
  y: number
  /** 정규화 너비 (0..1) */
  w: number
  /** 정규화 높이 (0..1) */
  h: number
  /** 회전 각도 (도, 0~360) */
  rotation: number
  /** 자유 텍스트 힌트 */
  hint?: string
  /** 이 슬롯에 우선 매핑할 태그 (M4 ai-layout 가 활용) */
  preferredTags: string[]
  /** locked = true 시 자동 배치 제외 */
  locked: boolean
}

/** kind 별 기본 색상 (hex) — placeholder 시각화용 */
export const SLOT_KIND_COLORS: Record<SlotKind, string> = {
  pose: '#6366f1',
  background: '#10b981',
  'mise-en-scene': '#f59e0b',
  prop: '#8b5cf6',
  'speech-bubble': '#3b82f6',
  'word-fx': '#ef4444',
  decoration: '#ec4899',
  text: '#6b7280',
}

/** kind 별 한글 라벨 */
export const SLOT_KIND_LABELS: Record<SlotKind, string> = {
  pose: '포즈',
  background: '배경',
  'mise-en-scene': '미장센',
  prop: '소품',
  'speech-bubble': '말풍선',
  'word-fx': '워드효과',
  decoration: '꾸미기',
  text: '텍스트',
}
