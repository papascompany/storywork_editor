# @storywork/editor-export

편집 결과를 외부에 내보내는 통합 모듈.

- PNG Blob 내보내기 (scale, background, format, quality)
- JSON 내보내기 (PageJsonV1 + LayerNodeJson)
- PDF 잡 트리거 (M6 이전 Mock — POST /api/pdf)
- DirtyTracker (autosave 디바운스)

React/DOM 에 의존하지 않는 헤드리스 패키지.

---

## 설치

```bash
pnpm add @storywork/editor-export
```

의존:

- `@storywork/editor-core`
- `@storywork/editor-layers`
- `@storywork/editor-history`

---

## API

### exportPng

```ts
import { exportPng } from '@storywork/editor-export'

const result = await exportPng(canvas, {
  scale: 2, // 기본값 2 (Retina)
  background: 'white', // 기본값 'transparent'
  format: 'image/png', // 기본값 'image/png'
  quality: 0.92, // jpeg/webp 한정
})

// result.blob  — Blob
// result.width, result.height — 픽셀 크기
// result.scale — 적용된 scale
// result.mimeType — 'image/png' | 'image/jpeg' | 'image/webp'
```

### exportJson

```ts
import { exportJson } from '@storywork/editor-export'

const { page, layers } = exportJson(canvas, layerTree)

// page — PageJsonV1 (fabric 직렬화 + mm 좌표)
// layers — LayerNodeJson[] (트리 메타 — 잠금/숨김/이름)
```

LayerTree 없이도 동작합니다 (layers 는 빈 배열).

### requestPdf

PDF 변환 잡을 비동기로 요청합니다. 실제 변환은 `apps/workers` (Inngest) 에서 실행됩니다.

```ts
import { requestPdf } from '@storywork/editor-export'

const { jobId, statusUrl } = await requestPdf(projectId, {
  endpoint: '/api/pdf', // 기본값
  spec: { pageCount: 16, colorMode: 'rgb' },
})
```

### DirtyTracker — autosave 연동 예제

```ts
import { DirtyTracker } from '@storywork/editor-export'
import { History } from '@storywork/editor-history'

const history = new History()
const tracker = new DirtyTracker({ history, debounceMs: 2000 })

// dirty 변화 감지
tracker.on('dirty:changed', (dirty) => {
  console.log('dirty:', dirty)
  // UI 저장 버튼 활성화/비활성화 등
})

// autosave 트리거 (2초 debounce 후 한 번만)
tracker.on('autosave:tick', async () => {
  const { page, layers } = exportJson(canvas, layerTree)
  await saveToServer({ page, layers })
  tracker.markClean()
})

// 수동 저장 후 초기화
async function handleSave() {
  const { page, layers } = exportJson(canvas, layerTree)
  await saveToServer({ page, layers })
  tracker.markClean()
}

// 수명 종료
tracker.dispose()
```

---

## 비주얼 회귀 테스트

`__tests__/golden/` 디렉토리에 5장의 골든 PNG 가 있습니다.

```bash
# 일반 테스트 (골든 비교)
pnpm test

# 골든 재캡처 (환경 변경 후)
VISUAL_REGRESSION_UPDATE=1 pnpm test
```

pixelmatch threshold 0.1, 전체 픽셀 대비 2% 이내 차이 허용.

---

## PDF (M6 예정)

`requestPdf` 는 현재 Mock 구현입니다. M6 에서:

- `apps/workers` Inngest 함수와 연결
- CMYK 변환, 재단선 가이드 포함 POD PDF 출력
