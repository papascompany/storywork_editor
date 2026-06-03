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
