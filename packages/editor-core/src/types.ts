// ─────────────────────────────────────────────
// @storywork/editor-core — 공개 타입 정의
// 이 파일은 React/DOM 에 의존하지 않습니다.
// ─────────────────────────────────────────────

/**
 * 판형 — 단위계는 `unit` 이 결정한다 (ADR-0017 / MODE-04).
 *
 * - `unit='mm'`(기본, 생략 시): 인쇄(POD). `widthMm/heightMm` 는 밀리미터이고
 *   화면 픽셀은 `dpi` 로 환산한다.
 * - `unit='px'`: 웹툰. `widthMm/heightMm` 는 **픽셀값**이다(필드명은 레거시).
 *   좌표 변환은 1:1 이며 `dpi` 는 환산에 쓰이지 않는다(`coordDpi()` 참조).
 *   `heightMm` 는 스트립 세그먼트 하나의 높이다 — 세로 길이는 세그먼트 수로 늘어난다.
 */
export type Format = {
  id: string
  /** 단위계 — 생략은 'mm'(기존 호출 하위호환) */
  unit?: 'mm' | 'px'
  widthMm: number
  heightMm: number
  dpi: number
}

/**
 * 캔버스 객체의 종류.
 * shared-schema LayerKind 와 1:1 매핑되지만 편집기 내부 용어를 사용한다.
 * 변환 테이블: canvas/adapters/fabric.ts 참조
 */
export type ObjectKind =
  | 'pose'
  | 'background'
  | 'mise-en-scene'
  | 'prop'
  | 'speech-bubble'
  | 'word-fx'
  | 'decoration'
  | 'text'
  | 'group'

/**
 * fabric 객체에 반드시 첨부해야 하는 메타 (obj.data).
 * 모든 Editor 패키지가 이 스펙을 준수해야 한다.
 */
export type ObjectData = {
  /** nanoid — 캔버스 내 전역 고유 ID */
  id: string
  /** 객체 종류 */
  kind: ObjectKind
  /** 연결된 Resource.id (포즈/배경/소품 등) */
  resourceId?: string
  /** 템플릿 슬롯 매핑 ID */
  slotId?: string
  /** 잠금 여부 */
  locked?: boolean
  /** 패키지별 추가 메타 (pose 키포인트 등) */
  meta?: Record<string, unknown>
}

/**
 * 외부에 노출하는 이벤트 이름 목록.
 * fabric 내부 이벤트는 절대 외부로 그대로 노출하지 않는다.
 */
export type EditorEvent =
  | 'object:added'
  | 'object:changed'
  | 'object:removed'
  | 'selection:changed'
  | 'history:applied'
  | 'render:after'

/**
 * 이벤트 핸들러 시그니처 맵.
 * mitt 타입 인자로 사용한다.
 */
export type EventMap = {
  'object:added': { id: string; data: ObjectData }
  'object:changed': { id: string; data: ObjectData }
  'object:removed': { id: string }
  'selection:changed': { ids: string[] }
  'history:applied': { kind: 'undo' | 'redo' }
  'render:after': void
}

/** 이벤트 구독 해제 함수 */
export type Unsubscribe = () => void
