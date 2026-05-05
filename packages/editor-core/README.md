# @storywork/editor-core

StoryWork 편집기 코어 — fabric.js v6 추상화 레이어.

React/DOM 에 의존하지 않는 **헤드리스** 캔버스 코어로, 브라우저와 Node.js(jsdom) 양쪽에서 동작한다.

## 5분 사용법

```ts
import { StoryCanvas } from '@storywork/editor-core'
import { Rect } from 'fabric'

// 판형 정의 (mm 단위)
const format = { id: 'b5', widthMm: 182, heightMm: 257, dpi: 150 }

// 인스턴스 생성 (container 없으면 헤드리스)
const canvas = new StoryCanvas({ format })

// 객체 추가
const rect = new Rect({ left: 10, top: 10, width: 80, height: 80 })
const id = canvas.addObject({ kind: 'pose', resourceId: 'res-123' }, rect)

// 직렬화
const json = canvas.toJson()
// json.v === 1, json.format, json.layers[0].id === id

// 역직렬화
await canvas.loadJson(json)

// 객체 조회
const obj = canvas.getObject(id)
const data = canvas.getObjectData(id)
// data.kind === 'pose', data.resourceId === 'res-123'

// 이벤트 구독
const unsub = canvas.on('object:added', ({ id, data }) => {
  console.log('추가됨:', id, data.kind)
})
unsub() // 구독 해제

// 수명 종료
canvas.dispose()
```

## 헤드리스 모드

`container` 옵션을 생략하면 자동으로 헤드리스 모드로 동작한다.

```ts
// Node.js 또는 vitest(jsdom) 환경
const canvas = new StoryCanvas({ format })
// document.createElement('canvas') 기반으로 내부 캔버스 생성
```

### vitest 에서 사용하기

`vitest.config.ts` 에 `environment: 'jsdom'` 설정 후 RAF polyfill 을 제공한다.

```ts
// __tests__/setup.ts
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16)
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
}
```

## 이벤트 구독

외부에 노출하는 이벤트는 다음 6종뿐이다 — fabric 내부 이벤트는 직접 노출하지 않는다.

```ts
canvas.on('object:added', ({ id, data }) => {})
canvas.on('object:changed', ({ id, data }) => {})
canvas.on('object:removed', ({ id }) => {})
canvas.on('selection:changed', ({ ids }) => {})
canvas.on('history:applied', ({ kind }) => {}) // 'undo' | 'redo'
canvas.on('render:after', () => {})
```

## 좌표 계약

모든 외부 API 는 **mm 단위** 를 사용한다. 픽셀 변환은 내부 어댑터에서만 처리한다.

```ts
canvas.mmToPx(25.4) // → 150 (at 150dpi)
canvas.pxToMm(150) // → 25.4
```

## ObjectData 계약

fabric 객체에는 반드시 `data` 필드가 첨부된다.

```ts
type ObjectData = {
  id: string // nanoid
  kind: ObjectKind // 'pose' | 'background' | ...
  resourceId?: string // Resource.id
  slotId?: string // 템플릿 슬롯 ID
  locked?: boolean
  meta?: Record<string, unknown>
}
```

## Schema v1 라운드트립

`toJson()` 과 `loadJson()` 은 `PageJsonV1` 스키마를 완전히 보존한다.

```ts
const json = canvas.toJson()
// json.v === 1  (스키마 버전 마커)
// json.format   (판형 정보)
// json.layers   (레이어 배열)
```

스키마 변경 시 반드시 `packages/shared-schema/src/editor/migrations/` 에 마이그레이터를 추가하고, in-place 수정은 금지한다. (ADR-0006)

## 제약 사항

- React/DOM 직접 의존 금지 (어댑터 분리)
- 전역 싱글톤 fabric 인스턴스 금지 (다중 페이지 편집)
- setTimeout/setInterval 으로 프레임 제어 금지 (rAF 사용)
- 드래그 중 매 프레임 commit 금지 — `object:modified` 는 변형 종료 시에만 발행

## 의존 패키지

- `fabric` ^6.9.1 — 캔버스 엔진
- `mitt` ^3.0.1 — 이벤트 버스
- `nanoid` ^5.1.11 — 객체 ID 생성
- `@storywork/schema` — PageJsonV1, LayerJson Zod 스키마
