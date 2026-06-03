# /editor/import — 대본 임포트 Wizard 가이드 (M4-04)

사용자가 대본을 붙여넣으면 AI 가 자동으로 스토리보드 페이지를 생성하는 5단계 Wizard.

## 흐름도

```
/editor/import
    │
    ├─ Step 1: 대본 입력 (ScriptInputArea)
    │   ├─ textarea (1~50,000자)
    │   └─ 판형 선택 4종
    │
    ├─ Step 2: 판형 확인
    │   ├─ 선택 판형 요약 카드
    │   └─ 대본 미리보기 (500자)
    │
    ├─ Step 3: 캐릭터 매핑 (CharacterMappingTable)
    │   ├─ 화자 자동 추출 (screenplay/소설 패턴)
    │   └─ 기본 더미맨 할당 (향후 캐릭터 선택 드롭다운 확장 예정)
    │
    ├─ Step 4: 자동 생성 (POST /api/script/full-pipeline)
    │   ├─ PipelineWarnings (lowDpi / 슬롯 미배치 / 안전 영역)
    │   └─ PreviewPages (페이지 N개 썸네일 그리드 + 장면 요약)
    │
    └─ /editor?projectId=... (편집기 진입)
```

## 컴포넌트 구조

```
components/editor/script-importer/
├── ScriptImporterShell.tsx     메인 Wizard 오케스트레이터 (use client)
├── ScriptInputArea.tsx         Step 1: 대본 textarea + 판형 4종
├── CharacterMappingTable.tsx   Step 3: 화자 → 캐릭터 매핑
├── PipelineWarnings.tsx        경고 배지 (lowDpi / slot-empty / safe-area)
├── PreviewPages.tsx            페이지 썸네일 그리드 + 편집기 진입 버튼
└── types.ts                    WizardState, FormatPreset, FullPipelineResponse
```

## 판형 프리셋 4종

| ID | 레이블 | 규격 |
|---|---|---|
| `preset-b5-novel` | B5 소설 | 128×182mm, 350dpi |
| `preset-a5-artbook` | A5 아트북 | 148×210mm, 350dpi |
| `preset-square` | 정사각형 | 150×150mm, 300dpi |
| `preset-mobile-story` | 모바일 웹툰 | 183×339mm, 96dpi |

## API 연동

`POST /api/script/full-pipeline` (M4-04 Step 1)

**요청**:
```json
{
  "scriptRaw": "철수: 안녕하세요!...",
  "formatId": "preset-b5-novel",
  "title": "새 콘티 — 2026-06-03",
  "characterMapping": {},
  "seed": 1234,
  "llmEnabled": false
}
```

**응답**:
```json
{
  "projectId": "clxxx...",
  "pages": [{ "id": "...", "pageIndex": 0, "thumbnail": null }],
  "scenes": [{ "id": "...", "index": 0, "summary": "철수 인사" }],
  "warnings": [],
  "seed": 1234,
  "redirectTo": "/editor?projectId=clxxx..."
}
```

## 편집기 진입 (useProjectImport)

`/editor?projectId=xxx` 로 이동 시 `useProjectImport` 훅이 자동으로 `/api/projects/[id]` 를 호출해 fabricJson 을 복원한다.

- `EditorShell` 의 `readyTick > 0` 조건 충족 후 1회 실행
- localStorage 복구보다 URL projectId 우선

## 경고 종류

| 태그 | 원인 | 표시 |
|---|---|---|
| `[lowDpi]` | 포즈 자산 해상도 < 슬롯 크기 기준 | 저해상도 배지 |
| `[slot-empty]` | 포즈 후보 없어 슬롯 미배치 | 슬롯 미배치 배지 |
| `[safe-area]` | 레이어가 안전 영역 침범 | 안전 영역 배지 |

## 테스트

- `__tests__/api/full-pipeline.test.ts` — API 단위 15개
- `__tests__/script-importer/script-importer.test.tsx` — UI 단위 19개
- `__tests__/hooks/useProjectImport.test.ts` — 훅 단위 5개
- `__tests__/m4-full-pipeline.test.ts` — E2E 시나리오 4종 24개

합계: 63개 테스트
