# M4 AI Pipeline — 풀 파이프라인

대본 텍스트 한 줄 입력 → 페이지 fabricJson 초안 N장 출력까지의 전체 흐름. 모든 단계 결정론 시드 + alternatives 지원.

## 단계 4종

```
┌─────────────────────────────────────────────────────────────┐
│  scriptRaw (string)                                           │
│      │                                                         │
│      ▼                                                         │
│  ① @storywork/ai-script · analyze()                          │
│      │     • 형식 자동감지 (novel/screenplay/essay/diary/...)  │
│      │     • 장면 분할 + 화자/대사 추출                         │
│      │     • SceneMeta (location/cameraAngle/emotion/...)      │
│      │     • LLM 보강 (Vercel AI Gateway, claude-sonnet-4-6)   │
│      │     • F1 ≥ 0.85 (룰 0.899 / LLM 보강 추가)              │
│      ▼                                                         │
│  AnalyzeResult { scenes[], characters[], seed, alternatives }  │
│      │                                                         │
│      ▼                                                         │
│  ② @storywork/ai-recommend · recommend()                     │
│      │     • Character scope 임베딩 검색 (pgvector)            │
│      │     • 포즈/배경/말풍선/워드효과 4종 룰                   │
│      │     • 만족도 100% (룰 기반)                              │
│      ▼                                                         │
│  RecommendResult { scenes[].poses/bubbles/bg, alternatives }   │
│      │                                                         │
│      ▼                                                         │
│  ③ @storywork/ai-layout · compose()                          │
│      │     • 페이지 분할 5 규칙 (R1~R5)                         │
│      │     • Template 매칭 (preset 5종)                         │
│      │     • Slot 배치 + 충돌 해소                              │
│      │     • lowDpi 제약 (ADR-0011a)                            │
│      │     • fabricJson Schema v1 출력                          │
│      ▼                                                         │
│  ComposeResult { pages[], warnings, seed }                     │
│      │                                                         │
│      ▼                                                         │
│  ④ @storywork/editor-core · 편집기 진입                       │
│      │     • Project + Page DB 저장                             │
│      │     • fabricJson 라운드트립 (Schema v1)                  │
│      │     • 사용자 후편집 + alternatives 한 클릭 교체           │
└─────────────────────────────────────────────────────────────┘
```

## HTTP API 4종

| 엔드포인트 | 입력 | 출력 |
|---|---|---|
| `POST /api/script/analyze` | `{ scriptRaw, format?, seed? }` | `AnalyzeResult` |
| `POST /api/script/recommend` | `{ analyzed, characterMapping?, seed? }` | `RecommendResult` |
| `POST /api/script/compose` | `{ analyzed, recommended, formatId, seed? }` | `ComposeResult` |
| `POST /api/script/full-pipeline` (M4-04 예정) | `{ scriptRaw, projectId, formatId, seed? }` | `{ projectId, pages, warnings }` + DB 저장 |

모든 엔드포인트 Supabase 세션 필수.

## 결정론 보장 (ADR-0007)

- 모든 단계: 같은 `seed` + 같은 입력 → 같은 출력
- 시드 외부 영향 격리: `Date.now()`, `Math.random()` 직접 사용 금지
- LLM 호출: prompt cache + temperature 0 + seed 고정
- 라운드트립 테스트로 회귀 차단

## 비용 보호

| 단계 | 룰만 | LLM 보강 |
|---|---|---|
| analyze | F1 0.899 | F1 0.85+ |
| recommend | 만족도 100% | (선택) 추가 정밀화 |
| compose | 결정론 100% | LLM 미사용 (룰 기반) |

LLM 호출 비용 보호:
- CI 에서는 `STORYWORK_LLM=0` (룰-only)
- 로컬 / 명시적 옵션에서만 LLM
- 골든셋 LLM 응답 캐시 (`__llm-cache__/`) commit

## 진행 현황 (2026-06-03)

| 마일스톤 | 상태 |
|---|---|
| M4-00 Character 시스템 | ✅ commit `628de83`+`9764c65`+`b039ab8` |
| M4-01 ai-script | ✅ commit `49a224b`+`4556bfb`+`de337f8` (LLM stub) |
| M4-01-03 LLM 보강 | ✅ commit `ce8e2e6`..`de37d35` (Vercel AI Gateway) |
| M4-02 ai-recommend | ✅ commit `af14315`..`c6414b0` |
| M4-03 ai-layout compose() | ✅ commit `5517071`+`1c5619b`+`5000889`+`9c6a2ea` |
| M2-07 lowDpi 슬롯 제약 | ✅ M4-03 에 통합 |
| M4-04 E2E 사용자 흐름 | 진입 가능 |
| M4-05 alternatives UI | 진입 가능 |

## 다음 단계

**M4-04 E2E**: `/api/script/full-pipeline` POST 한 번에 4 단계 통합 + DB 저장 + 편집기 진입.

**M4-05 alternatives UI**: 편집기에서 추천 결과 K개 카드 + 한 클릭 교체 (모바일 BottomSheet).
