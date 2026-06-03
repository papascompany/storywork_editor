/**
 * @storywork/ai-layout — 타입 정의 (M4-03)
 *
 * compose(analyzed, recommended, opts) → ComposeResult
 *
 * 결정론 원칙: 같은 seed + 같은 입력 → 같은 출력 (CLAUDE.md §5.1)
 * mm 단위 전용 — 픽셀 하드코딩 금지 (CLAUDE.md §8)
 */

import type { RecommendResult } from '@storywork/ai-recommend'
import type { AnalyzeResult } from '@storywork/ai-script'

// re-export for convenience
export type { AnalyzeResult, RecommendResult }

// ─────────────────────────────────────────────
// Format 경량 타입 (shared-schema Format 의 필요 필드만)
// ─────────────────────────────────────────────

export interface LayoutFormat {
  id: string
  widthMm: number
  heightMm: number
  dpi: number
  bleedMm: number
  safeMm: number
}

// ─────────────────────────────────────────────
// Slot 경량 타입 (shared-schema Slot 의 필요 필드만)
// ─────────────────────────────────────────────

export interface LayoutSlot {
  id: string
  /** 허용 ResourceKind 목록 ('pose' | 'bg' | 'bubble' | 'text' 등) */
  allowedKinds: string[]
  /** 0..1 정규화 좌표 (판형 기준) */
  x: number
  y: number
  w: number
  h: number
  zIndex: number
  optional: boolean
}

// ─────────────────────────────────────────────
// Template 경량 타입
// ─────────────────────────────────────────────

export interface LayoutTemplate {
  id: string
  name: string
  slots: LayoutSlot[]
}

// ─────────────────────────────────────────────
// 페이지 분할 힌트
// ─────────────────────────────────────────────

export type TemplateHint =
  | '1on1-talk'
  | 'full-shot-solo'
  | 'closeup'
  | 'four-cut'
  | 'wide'
  | 'default'

// ─────────────────────────────────────────────
// compose() 입력 옵션
// ─────────────────────────────────────────────

export interface ComposeOptions {
  /** 사용할 Format ID 또는 Format 객체 */
  formatId: string
  /** Format 객체 직접 주입 (DB 없이 테스트 시 사용) */
  format?: LayoutFormat
  /** 결정론 시드 (기본: 0) */
  seed?: number
  /** 우선 Template ID 목록 (배치 힌트) */
  preferredTemplateIds?: string[]
  /** 페이지 자동 분할/합병 활성 (기본: true) */
  enableSplitMerge?: boolean
  /** Template 후보 목록 주입 (테스트/오버라이드용) */
  _templates?: LayoutTemplate[]
  /** Resource lowDpi 태그 조회 어댑터 (테스트/mock용) */
  _resourceTagAdapter?: ResourceTagAdapter
}

// ─────────────────────────────────────────────
// lowDpi 태그 조회 어댑터 (ADR-0011a)
// ─────────────────────────────────────────────

export interface ResourceTagAdapter {
  /** resourceId → tags 반환. lowDpi 여부 확인용 */
  getTags(resourceId: string): Promise<string[]>
  /** resourceId → 마스터 픽셀 크기 반환 */
  getMasterSize(resourceId: string): Promise<{ w: number; h: number } | null>
}

// ─────────────────────────────────────────────
// 페이지 초안 (compose() 출력 단위)
// ─────────────────────────────────────────────

export interface PageDraft {
  /** 0-indexed 페이지 번호 */
  pageIndex: number
  /** 매칭된 Template ID (없으면 자유 배치) */
  templateId?: string
  /** editor-core Schema v1 fabricJson */
  fabricJson: PageFabricJson
  /** 이 페이지에 포함된 scene 인덱스 목록 */
  sceneIndices: number[]
  /** 페이지별 경고 (lowDpi 경고 등) */
  warnings: string[]
}

// ─────────────────────────────────────────────
// fabricJson — editor-core Schema v1 PageJsonV1 호환
// ─────────────────────────────────────────────

export interface FabricLayerData {
  resourceId?: string
  slotId?: string
  locked?: boolean
  visible?: boolean
  meta?: Record<string, unknown>
}

export interface FabricLayer {
  id: string
  /** LayerKind: 'pose' | 'bg' | 'bubble' | 'prop' | 'text' | 'fx' | 'group' | 'decoration' */
  kind: string
  data: FabricLayerData
  fabric: Record<string, unknown>
  children?: FabricLayer[]
}

export interface PageFabricJson {
  v: 1
  format: {
    id: string
    widthMm: number
    heightMm: number
    dpi: number
  }
  layers: FabricLayer[]
  /** ai-layout 메타 — editor-core 가 무시해도 무방한 확장 필드 */
  _aiMeta?: {
    generatedBy: 'ai-layout'
    seed: number
    schemaVersion: 1
    templateId?: string
    sceneIndices: number[]
  }
}

// ─────────────────────────────────────────────
// 슬롯 배치 결과 (내부용)
// ─────────────────────────────────────────────

export interface SlotAssignment {
  slotId: string
  slot: LayoutSlot
  /** 배치된 자원 종류 */
  kind: 'pose' | 'background' | 'bubble' | 'text' | 'empty'
  resourceId?: string
  /** 캐릭터 이름 (pose 종류일 때) */
  characterName?: string
  /** 텍스트 내용 (bubble/text 종류일 때) */
  text?: string
  /** lowDpi 위반 여부 */
  lowDpiViolation?: boolean
  /** effectiveDpi 계산값 */
  effectiveDpi?: number
}

// ─────────────────────────────────────────────
// compose() 최종 결과
// ─────────────────────────────────────────────

export interface ComposeResult {
  formatId: string
  pages: PageDraft[]
  /** 전체 경고 */
  warnings: string[]
  seed: number
}
