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

### exportWebtoon — 웹툰(px 판형) 이미지 (MODE-05)

웹툰 세그먼트 저장본들을 이미지로 내보냅니다. **px 판형 전용**(mm 판형은 거부 — 인쇄물은 PDF).

```ts
import { createStoreZip, exportWebtoon } from '@storywork/editor-export'

const { files } = await exportWebtoon(pages, format, {
  layout: 'long', // 'sequence' = 세그먼트별 1장 · 'long' = 세로로 이은 롱 이미지
  gapPx: 0, // long 전용 — 세그먼트 사이 여백(배경색)
  maxSliceHeightPx: 4000, // long 전용 — 파일당 높이 상한(생략 시 캔버스 상한 16384/scale)
})
// 여러 장이면 무압축 ZIP 으로 묶어 내려준다
const zip = createStoreZip(
  await Promise.all(
    files.map(async (f) => ({
      name: f.name,
      data: new Uint8Array(await f.blob.arrayBuffer()),
    })),
  ),
)
```

- 편집 중 캔버스가 아니라 세그먼트마다 **헤드리스 캔버스를 판형 실물 크기로** 새로 만들어
  그린다. 편집 캔버스는 화면 맞춤 배율이 걸려 있어 `toCanvasElement` 결과가 1:1 이 아니다.
- 롱 이미지는 **세그먼트 경계에서 우선 자르고**, 세그먼트 하나가 상한보다 클 때만 강제 분할한다
  (`planWebtoonSlices` — 순수 함수).
- 동시에 살아 있는 세그먼트 캔버스는 최대 1개(모바일 메모리).

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
