// ─────────────────────────────────────────────
// @storywork/editor-export — 공개 API
// PNG / JSON / PDF Job 트리거 + DirtyTracker
// React/DOM 에 의존하지 않는 헤드리스 export 엔진
// ─────────────────────────────────────────────

// 공개 타입
export type {
  ExportPngOptions,
  ExportPngResult,
  ExportJsonResult,
  RequestPdfOptions,
  RequestPdfResult,
} from './types.js'

// PNG 내보내기
export { exportPng } from './png/exportPng.js'

// JSON 내보내기
export { exportJson } from './json/exportJson.js'

// PDF 잡 트리거 (M6 이전 Mock)
export { requestPdf } from './pdf/requestPdf.js'

// Dirty Tracker (autosave)
export { DirtyTracker } from './dirty/tracker.js'
