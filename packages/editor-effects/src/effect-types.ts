// ─────────────────────────────────────────────
// effect-types.ts — 워드효과 타입 정의
//
// React/DOM 의존 없음 — 노드 환경 테스트 가능.
// ─────────────────────────────────────────────

// ─── 카테고리 ──────────────────────────────────────────────────────────────────

export const EFFECT_CATEGORIES = [
  'shadow', // 그림자 (drop-shadow / inner / soft / hard)
  'outline', // 외곽선 (single / double / dashed)
  'glow', // 글로우 (neon / soft / pulse)
  'gradient', // 그라디언트 채움
  'metallic', // 금속 (gold / silver / copper / chrome)
  'transform', // 변형 (3d / curved / arc / wavy)
  'background', // 텍스트 뒤 배경 박스 (sticky / quote / banner)
  'pattern', // 패턴 채움 (dots / stripes / hatch)
] as const

export type EffectCategory = (typeof EFFECT_CATEGORIES)[number]

// ─── 옵션 ─────────────────────────────────────────────────────────────────────

export interface WordEffectOptions {
  /** 효과 강도 (0..1) */
  intensity?: number
  /** CSS 색상 (사용자 ColorPicker) */
  color?: string
  /** 크기 (px) */
  size?: number
}

// ─── fabric 객체 최소 인터페이스 (헤드리스 테스트 호환) ───────────────────────

/**
 * 워드효과가 접근하는 fabric 객체 속성 최소 인터페이스.
 * fabric.FabricObject 전체를 import 하지 않고 필요한 것만 추출한다.
 * 실제 런타임에는 fabric.Textbox / fabric.IText 인스턴스가 전달된다.
 */
export interface EffectTarget {
  set(props: Record<string, unknown>): void
  setCoords?(): void
  dirty?: boolean
  /** fabric 객체 메타 (ObjectData 확장) */
  data?: {
    id?: string
    kind?: string
    meta?: Record<string, unknown>
    appliedEffects?: string[]
  }
}

// ─── WordEffect ────────────────────────────────────────────────────────────────

export interface WordEffect {
  /** unique key */
  id: string
  /** 카테고리 */
  category: EffectCategory
  /** 한국어 표시명 */
  name: string
  /** 툴팁 설명 */
  description?: string
  /**
   * 효과 적용 함수 — 텍스트 객체에 fabric properties 설정.
   * fabric 모듈을 직접 import 하므로 반드시 비동기로 실행된다.
   */
  apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void>
  /**
   * 효과 제거 (속성 원복).
   */
  unapply(target: EffectTarget): Promise<void>
  /** 미리보기 SVG dataURL (인라인) */
  preview?: string
  /** 적용 가능한 객체 타입 */
  appliesTo: ('text' | 'textbox' | 'itext')[]
}
