// ─────────────────────────────────────────────
// @storywork/editor-core — 공개 API
// React/DOM 에 의존하지 않는 헤드리스 캔버스 코어
// ─────────────────────────────────────────────

// 공개 타입
export type { Format, ObjectKind, ObjectData, EditorEvent, EventMap, Unsubscribe } from './types.js'

// 메인 클래스
export { StoryCanvas } from './canvas/StoryCanvas.js'
export type { StoryCanvasOptions } from './canvas/StoryCanvas.js'

// 좌표 변환 유틸 (어댑터에서 직접 사용)
export { mmToPx, pxToMm, formatToPxSize } from './canvas/coords.js'

// 객체 메타 유틸
export {
  createObjectData,
  extractObjectData,
  kindToLayerKind,
  layerKindToKind,
} from './data/object-meta.js'

// 스키마 버전 유틸
export { CURRENT_SCHEMA_VERSION, detectSchemaVersion } from './serialize/schemaVersion.js'

// 이벤트 버스 (다른 editor-* 패키지에서 독립 버스 생성 시 사용)
export { createEditorBus } from './events/bus.js'
export type { EditorBus } from './events/bus.js'

// 장치 유틸
export { isCoarsePointer } from './utils/coarse.js'
