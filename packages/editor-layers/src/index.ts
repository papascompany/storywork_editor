// ─────────────────────────────────────────────
// @storywork/editor-layers — 공개 API
// 레이어 트리, z-order, 그룹/잠금/숨김
// React/DOM 에 의존하지 않는 헤드리스 레이어 엔진
// ─────────────────────────────────────────────

// 공개 타입
export type {
  LayerNode,
  LayerNodeJson,
  LayerEvent,
  LayerEventMap,
  LayerUnsubscribe,
} from './types.js'

// 메인 클래스
export { LayerTree } from './tree/LayerTree.js'
export type { LayerTreeOptions } from './tree/LayerTree.js'

// 트리 유틸
export {
  dfs,
  bfs,
  getAncestors,
  getDescendants,
  getRootNodes,
  isDescendant,
} from './tree/traverse.js'
export {
  moveInArray,
  reorderInSiblings,
  bringForwardInSiblings,
  sendBackwardInSiblings,
  bringToFrontInSiblings,
  sendToBackInSiblings,
} from './tree/reorder.js'

// 상태 유틸
export { computeLockChanges, getEffectiveLock } from './state/lock.js'
export { computeVisibilityChanges, getEffectiveHidden } from './state/visibility.js'

// 직렬화
export { serializeTree } from './serialize/toJson.js'
export { deserializeTree } from './serialize/fromJson.js'

// fabric 동기화 유틸
export {
  applyLockToFabricObject,
  applyHiddenToFabricObject,
  syncZOrderToFabric,
} from './sync/fabric-bridge.js'
