# M4-02 ai-recommend 파이프라인 문서

## 개요

`ai-script.analyze()` 결과를 입력받아 각 장면의 포즈/배경/말풍선/워드효과를 추천한다.

## 파이프라인 흐름

```
AnalyzeResult (scenes + characters + scene.meta)
  ↓
recommend(analyzed, opts)
  │
  ├─ [장면별 병렬]
  │   ├─ pose-rules → action 키워드 후보 (emotion/cameraAngle/mood/location)
  │   ├─ character-search → PoseCandidate[] K=5
  │   │     ├─ 1차: filename-dict 룰 매칭 (M2-03a)
  │   │     └─ 2차: pgvector 시맨틱 검색 (characterId scope)
  │   ├─ bubble-rules → BubbleCandidate[] (line별)
  │   ├─ bg-tone-rules → BackgroundCandidate
  │   └─ wordfx-rules → WordFxCandidate[] (강조 대사)
  │
  └─ alternatives K=3 (seed 변경)
       │
       └─ RecommendResult
```

## 공개 API

### `recommend(analyzed, opts)`

```typescript
import { recommend } from '@storywork/ai-recommend'
import type { AnalyzeResult } from '@storywork/ai-script'

const result = await recommend(analyzed, {
  seed: 42,                        // 결정론 시드
  characterMapping: {              // 대본 캐릭터명 → DB Character.id
    '민준': 'char-uuid-xxx',
    '서연': 'char-uuid-yyy',
  },
  candidatesPerCharacter: 5,       // 캐릭터당 포즈 후보 수
  llmEnabled: false,               // 룰 기반 우선 (M4-02 기본값)
})
```

### HTTP 엔드포인트

```
POST /api/script/recommend
Authorization: Supabase Session (쿠키)

Body: {
  analyzed: AnalyzeResult,
  characterMapping?: Record<string, string>,
  seed?: number,
  candidatesPerCharacter?: number
}

Response: RecommendResult {
  scenes: SceneRecommendation[],
  alternatives: RecommendResult[],
  seed: number,
  modelVersion: string
}
```

## 타입 정의

### SceneRecommendation

```typescript
interface SceneRecommendation {
  sceneIndex: number
  poses: Record<string /* characterName */, PoseCandidate[]>  // K=5 per character
  background: BackgroundCandidate
  bubbles: BubbleCandidate[]   // per Line
  wordFx?: WordFxCandidate[]   // 강조 대사
  confidence: number
  seed: number
}
```

### PoseCandidate

```typescript
interface PoseCandidate {
  resourceId: string      // Resource.id (DB) 또는 'rule-placeholder:{action}'
  characterId: string     // Character.id
  poseAction: string      // 'walking' | 'standing' | 'fighting' | ...
  confidence: number      // 0~1
  reasoning: string       // 추천 이유
  alternatives?: string[] // 대안 resourceId 목록
}
```

### BackgroundCandidate

```typescript
interface BackgroundCandidate {
  suggestedTone: 'cream' | 'mint' | 'lilac' | 'pink' | 'navy' | 'white'
  reasoning: string
}
```

### BubbleCandidate

```typescript
interface BubbleCandidate {
  shape: 'rounded' | 'cloud' | 'shout' | 'oval' | 'narration'
  tailToSpeaker: boolean
  reasoning: string
}
```

## 룰 요약

### 포즈 룰 (pose-rules.ts)

| 조건 | 추천 action |
|---|---|
| emotion=happy + closeup | facial-expression, thumbsup, waving |
| emotion=happy + wide | jumping, running, waving |
| emotion=sad | crouching, kneeling, lying |
| emotion=angry | fighting, pointing, weapon-sword |
| emotion=surprised + closeup | facial-expression, jumping |
| emotion=tense | fighting, weapon-sword, standing |
| emotion=romantic | affection, waving, standing |
| emotion=fear | crouching, falling, running |
| mood=action | fighting, running, jumping, weapon-sword |
| mood=romantic | affection, waving, standing |
| mood=dark | crouching, standing, weapon-sword |
| cameraAngle=wide | walking, running, standing |
| cameraAngle=bird-eye | lying, crouching, sitting |
| location=battle | fighting, weapon-sword, jumping |
| pacing=fast | running, jumping, fighting |

### 말풍선 룰 (bubble-rules.ts)

| 조건 | 모양 |
|---|---|
| 생각/꿈 키워드 | cloud |
| "!" 2개 이상 / 짧은 외침 | shout |
| 스피커 없는 30자 초과 / 50자 초과 | narration |
| "?" 로 끝남 | rounded |
| "..." + 짧은 텍스트 | cloud |
| 기본 | oval |

### 배경 톤 룰 (bg-tone-rules.ts)

| 조건 | 색상 톤 |
|---|---|
| mood=romantic | pink |
| mood=dark / action / tense | navy |
| mood=calm | mint |
| mood=comic | cream |
| location=outdoor | mint |
| location=indoor | cream |
| location=school | lilac |
| location=battle | navy |
| timeOfDay=night | navy |
| timeOfDay=evening | pink |
| 기본 | white |

## 결정론 보장

- 같은 `seed` + 같은 입력 → 같은 출력
- 룰 기반 action 순위: confidence 동점 시 action 알파벳 순
- pgvector 검색: score + resourceId tie-break
- mock 임베딩: SHA-256 해시 기반 (deterministic)

## 만족도 측정 (M4-02 baseline)

- 골든셋: 10케이스 × 16 (sceneIndex, character) 조합
- 만족도: 16/16 = **100.0%** (룰 기반 플레이스홀더 기준)
- 상세: `/packages/ai-recommend/__tests__/satisfaction.test.ts`

## DB 임베딩 검색 활성화

voyage/openai API 키 설정 시 자동 활성:

```bash
VOYAGE_API_KEY=pa-xxxx   # voyage-3 임베딩 (권장)
OPENAI_API_KEY=sk-xxxx   # text-embedding-3-small 폴백
# 둘 다 없으면 mock 임베딩 (개발/테스트용)
```

## 다음 단계

- **M4-03** `ai-layout.compose()` — SceneRecommendation → fabricJson 초안 자동 배치
