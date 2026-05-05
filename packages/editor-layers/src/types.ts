// ─────────────────────────────────────────────
// @storywork/editor-layers — 공개 타입 정의
// React/DOM 에 의존하지 않습니다.
// ─────────────────────────────────────────────

import type { ObjectKind } from '@storywork/editor-core'

export type { ObjectKind }

/**
 * 레이어 노드 — editor-core 의 ObjectData.id 와 1:1 매핑
 */
export type LayerNode = {
  /** ObjectData.id 와 동일 */
  id: string
  kind: ObjectKind
  /** null = root 직속 */
  parentId: string | null
  /** 그룹 노드만 보유 (leaf 는 빈 배열) */
  childrenIds: string[]
  locked: boolean
  hidden: boolean
  /** 사용자 지정 라벨 (없으면 kind 로 fallback) */
  name?: string
}

/**
 * JSON 직렬화 형식 — PageJsonV1.layers 트리 구조와 호환
 */
export type LayerNodeJson = {
  v: 1
  id: string
  kind: ObjectKind
  locked?: boolean
  hidden?: boolean
  name?: string
  /** 그룹 노드만 존재 */
  children?: LayerNodeJson[]
}

/**
 * LayerTree 가 외부로 노출하는 이벤트
 */
export type LayerEvent =
  | 'tree:changed' // add/remove/move/group/ungroup
  | 'state:changed' // lock/visibility 변경
  | 'selection:changed' // editor-core 이벤트 브릿지

export type LayerEventMap = {
  'tree:changed': { kind: 'add' | 'remove' | 'move' | 'group' | 'ungroup'; ids: string[] }
  'state:changed': { kind: 'lock' | 'visibility' | 'rename'; ids: string[] }
  'selection:changed': { ids: string[] }
}

export type LayerUnsubscribe = () => void
