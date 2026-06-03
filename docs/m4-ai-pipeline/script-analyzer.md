# M4-01 ai-script 분석기

## 개요

`packages/ai-script` — 대본 텍스트를 분석해 `AnalyzeResult` (SceneDoc 초안)를 반환한다.

## Public API

```typescript
import { analyze } from '@storywork/ai-script'

const result = await analyze(scriptRaw, {
  seed: 0,            // 결정론 시드 (기본: 0)
  format: 'auto',     // 자동감지 또는 명시 ('novel'|'screenplay'|'essay'|'diary'|'light-novel')
  maxAlternatives: 5, // 대안 분석 수 (기본: 5)
  llmEnabled: false,  // LLM 활성 여부 (기본: STORYWORK_LLM 환경변수)
})
```

### 반환 타입

```typescript
interface AnalyzeResult {
  format: ScriptInputFormat
  scenes: AnalyzedScene[]
  characters: DetectedCharacter[]
  alternatives?: AnalyzeResult[]  // K=5
  seed: number
  modelVersion: string  // 'rule-only' | 'claude-sonnet-4-6'
}
```

## 처리 흐름

```
대본 입력
  ↓ detectFormat()         # auto 시: 형식 자동 감지 (5종)
  ↓ parseByFormat()        # 형식별 rule-based 파싱
  ↓ enrichWithLlm()        # LLM 활성 시: Claude 메타 보강 (stub→구현 예정)
  ↓ extractCharacters()    # 캐릭터 dedupe + mentionCount 정렬
  ↓ alternatives loop      # seed 변경으로 K=5 대안 생성
AnalyzeResult
```

## 형식별 감지 휴리스틱

| 형식 | 감지 기준 |
|---|---|
| screenplay | "화자:" 패턴 ≥ 15% 행 또는 INT./EXT. 씬 헤더 |
| diary | YYYY년 MM월 DD일 헤더 |
| essay | 1인칭 대명사 비율 높음 + 대화 없음 |
| light-novel | 짧은 행 평균 + 따옴표 대화 존재 |
| novel | fallback |

## 장면 경계 규칙

**스크린플레이**
- 빈 행 2줄 이상
- 씬 헤더 (씬N:, INT., EXT.)

**소설/기타**
- 빈 행 2줄 이상
- 씬 구분자 키워드: 그날 / 다음날 / 한편 / 그 후 / --- / ***
- 문장 수 임계값 초과 (기본: 8문장)

## LLM 비용 보호

- `STORYWORK_LLM=0` (기본, CI) → 룰-only, LLM 미호출
- `STORYWORK_LLM=1` (로컬 명시) → Claude 메타 보강 활성
- `opts.llmEnabled` 로 오버라이드

## F1 측정 결과 (룰-only, 2026-06-03)

| 지표 | 결과 | 기준 |
|---|---|---|
| format accuracy | 0.900 (18/20) | ≥ 0.70 |
| scene count F1 avg | 0.899 | ≥ 0.60 |
| character F1 (screenplay) | 1.000 | ≥ 0.50 |

골든셋: 5장르 × 4길이 = 20 케이스 (`packages/ai-script/__tests__/golden/`)

## 향후 계획

- M4-01-03: LLM 보강 — Vercel AI Gateway + claude-sonnet-4-6 + prompt caching
- M4-02: ai-recommend 연동 — analyze() 결과로 포즈/배경 추천
- M4-04: 전체 파이프라인: 대본 → SceneDoc → fabricJson 초안
