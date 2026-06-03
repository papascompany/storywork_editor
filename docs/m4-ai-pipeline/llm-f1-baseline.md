# LLM F1 Baseline — M4-01-03

> 자동 생성: 2026-06-03T07:36:34.031Z
> 모델: claude-sonnet-4-6
> 캐시 활성: STORYWORK_LLM_CACHE=1

## 결과 요약

| 지표 | 값 | 목표 | 통과 |
|---|---|---|---|
| 장면 수 F1 (전체 평균) | 0.899 | ≥ 0.85 | PASS |
| 캐릭터 감지 F1 (전체 평균) | 0.775 | ≥ 0.5 | PASS |

## 케이스별 결과

| 케이스 | 예상 장면 | 예측 장면 | 장면 F1 | 캐릭터 F1 | LLM 메타 |
|---|---|---|---|---|---|
| diary/01-short | 1 | 1 | 1.000 | 1.000 | Y |
| diary/02-medium | 1 | 1 | 1.000 | 1.000 | Y |
| diary/03-long | 1 | 2 | 0.667 | 1.000 | Y |
| diary/04-very-long | 1 | 3 | 0.500 | 1.000 | Y |
| essay/01-short | 1 | 1 | 1.000 | 1.000 | Y |
| essay/02-medium | 1 | 1 | 1.000 | 1.000 | Y |
| essay/03-long | 1 | 1 | 1.000 | 1.000 | Y |
| essay/04-very-long | 1 | 1 | 1.000 | 1.000 | Y |
| light-novel/01-short | 1 | 1 | 1.000 | 1.000 | Y |
| light-novel/02-medium | 1 | 2 | 0.667 | 0.500 | Y |
| light-novel/03-long | 2 | 3 | 0.800 | 1.000 | Y |
| light-novel/04-very-long | 4 | 4 | 1.000 | 0.500 | Y |
| novel/01-short | 3 | 2 | 0.800 | 0.000 | Y |
| novel/02-medium | 2 | 3 | 0.800 | 0.000 | Y |
| novel/03-long | 3 | 4 | 0.857 | 0.500 | Y |
| novel/04-very-long | 4 | 5 | 0.889 | 0.000 | Y |
| screenplay/01-short | 1 | 1 | 1.000 | 1.000 | Y |
| screenplay/02-medium | 2 | 2 | 1.000 | 1.000 | Y |
| screenplay/03-long | 3 | 3 | 1.000 | 1.000 | Y |
| screenplay/04-very-long | 4 | 4 | 1.000 | 1.000 | Y |

## 비고

- LLM 보강: 장면 meta (location, cameraAngle, mood, emotion, pacing) 추가
- 장면 분할 자체는 룰-only 파서 담당, LLM 은 메타 추출만 수행
- 캐시 위치: `packages/ai-script/__tests__/__llm-cache__/`
- 재현: `STORYWORK_LLM=1 STORYWORK_LLM_CACHE=1 pnpm --filter @storywork/ai-script test f1-score-llm`
