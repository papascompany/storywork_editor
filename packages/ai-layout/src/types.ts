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
// 페이지 그룹 (page-split → capacity → compose)
// ─────────────────────────────────────────────

/**
 * 한 페이지가 담당하는 장면의 대사 구간 (LAYOUT-03).
 * 장면 대사가 페이지 수용량을 넘어 여러 페이지로 나뉠 때만 생긴다.
 * `[start, end)` — Array.slice 규약.
 */
export interface SceneLineRange {
  sceneIndex: number
  start: number
  end: number
}

export interface PageGroup {
  pageIndex: number
  sceneIndices: number[]
  templateHint: TemplateHint
  /** 수용량 패스가 확정한 Template ID (LAYOUT-03). 없으면 compose 가 직접 매칭 */
  templateId?: string
  /** 장면별 대사 구간 (LAYOUT-03). 없으면 장면의 전체 대사를 담당한다 */
  lineRanges?: SceneLineRange[]
}

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
  /**
   * 이 페이지가 담당하는 대사 구간 (LAYOUT-03).
   * 한 장면이 여러 페이지로 나뉜 경우에만 존재하며, 없으면 장면 전체를 담당한다.
   * 채택률 측정(adoption.ts)이 "이 페이지가 책임지는 대사"를 판정하는 근거다.
   */
  lineRanges?: SceneLineRange[]
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

/** M4-05 컷 교체용 포즈 후보 — layer.data.meta.alternatives 계약(RawAlternative)과 호환.
 *  reasoning 은 추천 엔진 내부 정보라 영속하지 않는다(보안 리뷰 후속).
 *  thumbnail 은 full-pipeline 이 Resource 파생본 URL 로 주입(캔버스 적용 소스). */
export interface PoseAlternativeMeta {
  resourceId: string
  poseAction?: string
  confidence: number
  characterName?: string
  thumbnail?: string
}

export interface SlotAssignment {
  slotId: string
  slot: LayoutSlot
  /** 배치된 자원 종류 ('caption' = 내레이션/지문 박스, SCRIPT-KO-04) */
  kind: 'pose' | 'background' | 'bubble' | 'text' | 'caption' | 'empty'
  resourceId?: string
  /** 캐릭터 이름 (pose 종류일 때) */
  characterName?: string
  /** 텍스트 내용 (bubble/text/caption 종류일 때 — 캡션은 묶인 줄을 이어붙인 표시 문자열) */
  text?: string
  /**
   * 캡션 박스가 묶은 원본 라인들 (caption 종류일 때).
   * 채택률 측정이 "이 줄이 실제로 실렸는가"를 판정하는 근거 — 병합 문자열만으로는 대조가 깨진다.
   */
  captionLines?: string[]
  /** lowDpi 위반 여부 */
  lowDpiViolation?: boolean
  /** effectiveDpi 계산값 */
  effectiveDpi?: number
  /** 포즈 후보 목록 (CONTI-03 2차: 편집기 컷 교체 UI 데이터 소스) */
  poseAlternatives?: PoseAlternativeMeta[]
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
