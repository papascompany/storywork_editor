# ai-layout · compose() (M4-03)

대본 분석 결과(`AnalyzeResult`) + 추천 결과(`RecommendResult`) + 판형(`Format`) 입력을 받아 페이지별 fabricJson 초안을 생성하는 결정론적 자동 배치 엔진.

## API

```ts
import { compose, type ComposeResult, type ComposeOptions } from '@storywork/ai-layout'

const result: ComposeResult = await compose(analyzed, recommended, {
  formatId: 'b5',
  format: { id: 'b5', widthMm: 128, heightMm: 182, dpi: 350, bleedMm: 3, safeMm: 5 },
  seed: 777,
  preferredTemplateIds: ['preset-1on1-talk'],
  enableSplitMerge: true,
})
```

## 처리 흐름

```
RecommendResult ── splitScenes() ──→ PageGroup[]
                       (5 규칙)         │
                                        ▼
                              matchTemplate(hint, charCount)
                                        │
                                        ▼
                              assignSlots(template, sceneRec)
                                        │ + lowDpi 제약 (ADR-0011a)
                                        ▼
                              buildPageFabricJson()
                                        │
                                        ▼
                              PageDraft[] (fabricJson Schema v1)
```

## 페이지 분할 5 규칙 (page-split.ts)

| 규칙 | 조건 | 결과 |
|---|---|---|
| R1 | 기본 | 1 페이지 = 1 장면 |
| R2 | closeup + dialogue 4+ | 4컷 페이지로 결합 |
| R3 | wide + props 다수(3+) | 풀샷 단독 페이지 |
| R4 | 같은 location 연속 | 같은 페이지 결합 후보 (lookahead 1) |
| R5 | emotion 급변 (calm → tense) | 강제 페이지 분할 |

R3 의 `templateHint='full-shot-solo'` 는 `composePage()` 의 자체 hint 추론보다 **우선** (commit `9c6a2ea` fix).

## lowDpi 제약 (M2-07, ADR-0011a)

`Resource.tags` 에 `lowDpi` 가 있는 자산은:
- 페이지 한 변의 **1/2 이하 슬롯에만 배치 가능**
- `effectiveDpi = (assetMinSide / slotMaxSideMm) * 25.4`
  - `< 200` → warning (`[lowDpi] dpi-warning`)
  - `< 150` → error (fallback 자산 검색)
- 모든 후보 violate 시 첫 번째 후보 폴백 + `[lowDpi]` warning 추가

## 결정론 (ADR-0007)

- 같은 `seed` + 같은 입력 → 같은 출력 (테스트 검증)
- `seed=777` 이면 라운드별 id/순서/선택 모두 결정론
- 의사난수는 시드 기반 단순 LCG (외부 의존성 0)

## fabricJson 출력

`@storywork/editor-core` Schema v1 호환:

```json
{
  "v": 1,
  "format": { "id": "b5", "widthMm": 128, "heightMm": 182, "dpi": 350 },
  "layers": [
    { "id": "...", "kind": "bg", "fabric": { "type": "rect", "leftMm": 0, ... } },
    { "id": "...", "kind": "pose", "data": { "resourceId": "...", "meta": { "lowDpiViolation": false } } },
    { "id": "...", "kind": "bubble", "fabric": { "type": "polygon", ... } }
  ],
  "seed": 777,
  "generatedBy": "ai-layout"
}
```

## HTTP API

`POST /api/script/compose` — `apps/web/app/api/script/compose/route.ts`

요청:
```json
{
  "analyzed": { ... AnalyzeResult },
  "recommended": { ... RecommendResult },
  "formatId": "...",  // 또는 format 객체
  "seed": 777
}
```

응답: `ComposeResult` JSON.

인증: Supabase 세션 필수 (미인증 401).

## 검증 결과 (M4-03 Step 5)

- 102/102 tests pass
- 골든 5 시나리오 모두: 충돌 0, safe area 침범 0
- lowDpi 풀샷 슬롯 → warning 발생 (정상)
- lowDpi 작은 슬롯(0.3×0.3) → size-violation 없음 (정상)
- 결정론: 같은 seed → 같은 layers/id

## 후속 작업

- M4-04 E2E 사용자 흐름: 글 업로드 → analyze → recommend → compose → DB 저장 → 편집기 진입
- M4-05 alternatives UI: 한 클릭 교체
- 실 voyage/openai 임베딩 도입 시 character scope 추천 정확도 ↑
