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
  PageGroup,
  PoseAlternativeMeta,
  ResourceTagAdapter,
  SceneLineRange,
  SlotAssignment,
  TemplateHint,
} from './types.js'

// ── 단계별 함수 (디버깅/테스트용) ─────────────────────────────────────────
export { splitScenes } from './page-split.js'

export {
  matchTemplate,
  scoreTemplate,
  PRESET_TEMPLATES,
  filterSlotsByKind,
} from './template-match.js'
export type { TemplateMatchOptions, TemplateMatchResult } from './template-match.js'

// ── 대사 수용량 기반 페이지 계획 (LAYOUT-03 · SCRIPT-KO-04) ───────────────
export {
  planCapacityPages,
  planLineRanges,
  pageBudgetOf,
  fitsInPage,
  captionTextsOf,
  dialogueLinesOf,
  sceneHint,
  sceneSpeakers,
} from './capacity.js'
export type { CapacityPlanContext, PageBudget } from './capacity.js'
export {
  generateBubbleSlots,
  generateGridSlots,
  pageBubbleCapacity,
  withGeneratedBubbleSlots,
  bubbleSlotsOf,
  textLikeSlotsOf,
  poseSlotsOf,
  requiredPoseSlotsOf,
  MAX_BUBBLES_PER_PAGE,
  GENERATED_SLOT_PREFIX,
  CAPTION_SLOT_KIND,
} from './bubble-slots.js'
export type { GridSlotSpec } from './bubble-slots.js'

// ── 캡션(내레이션·지문) 박스 (SCRIPT-KO-04) ───────────────────────────────
export {
  captionBoxesNeeded,
  captionSlotsOf,
  generateCaptionSlots,
  groupCaptionLines,
  joinCaptionBox,
  pageCaptionSlotCapacity,
  withGeneratedCaptionSlots,
  CAPTION_CHARS_PER_BOX,
  CAPTION_LINES_PER_BOX,
  CAPTION_LINE_SEPARATOR,
  GENERATED_CAPTION_PREFIX,
  MAX_CAPTION_SLOTS_PER_PAGE,
} from './caption-slots.js'

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

// ── 배치 품질 지표 (LAYOUT-04) ────────────────────────────────────────────
export {
  aggregateQuality,
  measurePageQuality,
  measureQuality,
  worstPages,
  balanceScore,
  densityScore,
  dialogueDensityScore,
  readingFlowScore,
  faceClearanceScore,
  unionArea,
  DEPENDENT_AXES,
  QUALITY_AXES,
  DENSITY_MIN,
  DENSITY_MAX,
  DIALOGUE_MIN,
  DIALOGUE_MAX,
} from './quality.js'
export type { PageQuality, QualityAxis, QualityResult } from './quality.js'

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
