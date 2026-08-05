/**
 * @storywork/ai-layout — Public API (M4-03)
 *
 * compose(analyzed, recommended, opts) → ComposeResult
 *
 * 각 단계는 개별 export 가능 (디버깅용)
 */

// ── 메인 함수 ──────────────────────────────────────────────────────────────
export { compose } from './compose.js'

// ── 타입 ───────────────────────────────────────────────────────────────────
export type {
  AnalyzeResult,
  RecommendResult,
  ComposeOptions,
  ComposeResult,
  FabricLayer,
  FabricLayerData,
  LayoutFormat,
  LayoutSlot,
  LayoutTemplate,
  PageDraft,
  PageFabricJson,
  PoseAlternativeMeta,
  ResourceTagAdapter,
  SlotAssignment,
  TemplateHint,
} from './types.js'

// ── 단계별 함수 (디버깅/테스트용) ─────────────────────────────────────────
export { splitScenes } from './page-split.js'
export type { PageGroup } from './page-split.js'

export {
  matchTemplate,
  scoreTemplate,
  PRESET_TEMPLATES,
  filterSlotsByKind,
} from './template-match.js'
export type { TemplateMatchResult } from './template-match.js'

export { assignSlots } from './slot-assign.js'
export type { SlotAssignResult } from './slot-assign.js'

// ── 자동배치 채택률 측정 (AI-ACT-04) ──────────────────────────────────────
export { aggregateAdoption, measureAdoption } from './adoption.js'
export type {
  AdoptionOptions,
  AdoptionResult,
  BlockerKind,
  PageAdoption,
  SoftSignalKind,
} from './adoption.js'

// ── 말풍선 배치 비용함수 + 자동 QA (BUBBLE-02) ─────────────────────────────
export {
  assignBubblesByCost,
  bubbleSlotCost,
  proximityCost,
  occlusionCost,
  readingOrderCost,
  boundaryCost,
  speakerAnchorFromPoseSlot,
  DEFAULT_BUBBLE_COST_WEIGHTS,
} from './bubble-cost.js'
export type {
  AssignBubblesInput,
  AssignBubblesResult,
  BubbleCostBreakdown,
  BubbleCostWeights,
  NormPoint,
  NormRect,
  SpeakerAnchor,
} from './bubble-cost.js'
export { evaluateBubblePlacement, runBubbleQa } from './bubble-qa.js'
export type {
  BubbleDetector,
  BubbleQaMatch,
  BubbleQaOptions,
  BubbleQaReport,
  DetectedBubble,
} from './bubble-qa.js'

// ── 콘티 시트 합성기 (CONTI-02) ────────────────────────────────────────────
export {
  composeContiSheets,
  cameraAngleToShotLabel,
  wrapTextMm,
  CONTI_GRID,
} from './conti-sheet.js'
export type { ContiCut, ContiCutLine, ContiSheetOptions } from './conti-sheet.js'

// ── lowDpi 제약 (ADR-0011a) ────────────────────────────────────────────────
export {
  checkLowDpiConstraint,
  formatLowDpiWarning,
  slotMaxSideMm,
  pageMaxSideMm,
  DPI_WARNING_THRESHOLD,
  DPI_ERROR_THRESHOLD,
} from './constraints/low-dpi.js'
export type { LowDpiCheckResult } from './constraints/low-dpi.js'
