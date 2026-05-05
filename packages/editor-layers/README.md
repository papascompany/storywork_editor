# @storywork/editor-layers

레이어 트리, z-order, 그룹/잠금/숨김. React/DOM 에 의존하지 않는 헤드리스 레이어 엔진.

## 5분 사용법

### 1. editor-core 와 함께 초기화

```ts
import { StoryCanvas } from '@storywork/editor-core'
import { LayerTree } from '@storywork/editor-layers'

const canvas = new StoryCanvas({ format: { id: 'b5', widthMm: 182, heightMm: 257, dpi: 150 } })
const tree = new LayerTree({ canvas })
```

### 2. 객체 추가 — 자동 동기화

`canvas.addObject()` 를 호출하면 LayerTree 가 자동으로 노드를 추가합니다.

```ts
import { Rect } from 'fabric'

const rect = new Rect({ width: 100, height: 100 })
const id = canvas.addObject({ kind: 'pose' }, rect)

console.log(tree.getRootNodes()) // [{ id, kind: 'pose', locked: false, hidden: false, ... }]
```

### 3. 그룹

```ts
const id2 = canvas.addObject({ kind: 'prop' }, new Rect({ width: 50, height: 50 }))

// 두 노드를 그룹으로 묶기
const groupId = tree.group([id, id2], '장면 그룹')

// 그룹 자식 조회
const children = tree.getChildren(groupId)

// 언그룹 (위치 보존)
const childIds = tree.ungroup(groupId)
```

### 4. z-order 이동

```ts
// 특정 인덱스로 이동
tree.moveTo(id, 2)

// 편의 메서드
tree.bringToFront(id) // 최상위
tree.sendToBack(id) // 최하위
tree.bringForward(id) // 한 칸 앞
tree.sendBackward(id) // 한 칸 뒤
```

### 5. 잠금/숨김

```ts
// 단일 노드 잠금
tree.setLock(id, true)

// 그룹과 모든 자손 잠금
tree.setLock(groupId, true, /* recursive= */ true)

// Effective lock (조상이 잠겨도 true)
const effectiveLocked = tree.getEffectiveLock(id)

// 숨김 (fabric visible 속성도 자동 업데이트)
tree.setHidden(id, true)
tree.getEffectiveHidden(id) // 조상 포함 판단
```

### 6. 직렬화

```ts
// LayerNodeJson[] 로 직렬화 (PageJsonV1.layers 와 호환)
const json = tree.toJson()

// 복원
tree.loadJson(json)
```

### 7. 이벤트

```ts
// 트리 구조 변경 (add/remove/move/group/ungroup)
const unsub = tree.on('tree:changed', (e) => {
  console.log(e.kind, e.ids)
})

// 상태 변경 (lock/visibility/rename)
tree.on('state:changed', (e) => {
  console.log(e.kind, e.ids)
})

// editor-core 의 selection:changed 브릿지
tree.on('selection:changed', (e) => {
  console.log('선택된 레이어:', e.ids)
})

// 구독 해제
unsub()
```

### 8. 수명 관리

```ts
// 이벤트 핸들러 누수 없이 정리
tree.dispose()
canvas.dispose()
```

## 계약

- `editor-core` 의 `data.id` 와 `LayerNode.id` 는 1:1 매핑
- `editor-core` 의 `object:added/removed` 이벤트를 자동 구독 — 수동 동기화 불필요
- z-order 변경 시 fabric `_objects` 배열을 직접 재정렬하여 렌더 순서 보장
- 잠금/숨김은 fabric 객체 속성(`selectable`, `evented`, `visible` 등)을 직접 업데이트
- React/DOM 의존 없음 — jsdom + node 환경에서 동작
