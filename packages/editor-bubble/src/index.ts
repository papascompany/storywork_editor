// ─────────────────────────────────────────────
// @storywork/editor-bubble — 공개 API
//
// 말풍선 모양 + 꼬리 자동 화자 추적.
// React/DOM 의존 없음.
// ─────────────────────────────────────────────

// ── 말풍선 모양 ────────────────────────────────────────────────────────────────
export type { BubbleShape } from './bubble-shapes.js'
export {
  BUBBLE_SHAPES,
  BUBBLE_SHAPE_LABELS,
  buildBubbleBodyPath,
  shapeHasTail,
} from './bubble-shapes.js'

// ── 꼬리 계산 ─────────────────────────────────────────────────────────────────
export type { Point, BubbleBBox, TailPoints, TailOptions } from './bubble-tail.js'
export { computeTailPoints, tailPointsToLocal } from './bubble-tail.js'

// ── 말풍선 객체 ────────────────────────────────────────────────────────────────
export type { CreateBubbleObjectOptions, BubbleMeta } from './bubble-object.js'
export {
  createBubbleObject,
  isBubbleGroup,
  getBubbleMeta,
  updateBubbleTailPolygon,
} from './bubble-object.js'

// ── 화자 추적 ─────────────────────────────────────────────────────────────────
export type { Keypoint, BubbleTrackerCleanup } from './bubble-tracking.js'
export {
  getMouthPosition,
  detectSpeaker,
  attachBubbleTracker,
  rebindBubbleTarget,
} from './bubble-tracking.js'

// ── Commands ─────────────────────────────────────────────────────────────────
export type { Command, BubbleProps } from './bubble-commands.js'
export type {
  AddBubbleCommandOptions,
  EditBubbleCommandOptions,
  BindBubbleToTargetCommandOptions,
} from './bubble-commands.js'
export {
  AddBubbleCommand,
  EditBubbleCommand,
  BindBubbleToTargetCommand,
} from './bubble-commands.js'
