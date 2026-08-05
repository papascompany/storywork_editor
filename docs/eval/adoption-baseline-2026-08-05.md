# 자동배치 채택률 baseline — 2026-08-05 (AI-ACT-04)

> 측정: `pnpm tsx scripts/measure-adoption.ts --json data/eval/adoption-baseline.json`
> 코퍼스: `data/eval/scripts/` 21편 / **217장면** · 판형 B5(preset-b5-novel) · seed 0 · LLM/DB 미사용(룰 only, 재현 가능)
> 지표 정의 정본: [`packages/ai-layout/src/adoption.ts`](../../packages/ai-layout/src/adoption.ts)

## 0. 요약 — baseline 은 "좋다"가 아니라 "여기가 문제다"

| 지표 | baseline | target | 비고 |
|---|---|---|---|
| **채택률**(blocker 0 페이지 비율) | **13.8%** (30/217) | **60%** | 1차 목표 |
| **대사 보존율** | **52.2%** | **95%** | 채택률의 선행 지표 |
| empty-slot 발생 페이지 | 61 (28.1%) | ≤5% | |
| dialogue-loss 발생 페이지 | **152 (70.0%)** | ≤5% | 최대 병목 |
| safe-area / dpi-error | 0 / 0 | 0 유지 | 이미 달성 |

**대본 대사의 약 절반이 페이지에 실리지 못한다.** 기존 e2e 테스트는 "충돌 0 · safe area 침범 0"만 검사해
전부 green 이었지만, 사용자 관점의 핵심 결함(대사 유실)은 어떤 지표도 보고 있지 않았다.

## 1. "채택률"의 정의와 한계

궁극 지표는 "사용자가 자동배치 1차본을 **손대지 않고 출판한 비율**"이다. 그러나 실사용 편집 로그
(PostHog — FOLLOWUP-60, 법무 게이트)가 없어 직접 관측이 불가능하다. 그래서 **프록시**를 쓴다:

```
채택 가능 페이지 = 사용자가 반드시 고쳐야 하는 blocker 가 0인 페이지
채택률 = 채택 가능 페이지 / 전체 페이지
```

blocker 는 "안 고치면 결과물이 틀린 것"만 포함한다(취향 문제 제외):

| blocker | 뜻 | 출처 |
|---|---|---|
| `empty-slot` | 필수 슬롯이 비어 페이지 미완성 | compose 경고 |
| `safe-area` | 인쇄 안전영역 침범(재단 시 잘림) | compose 경고 |
| `dpi-error` | 해상도 미달로 인쇄 불가 | compose 경고 |
| `dialogue-loss` | 대본 대사가 페이지에 안 실림 | **fabricJson 대조(신규)** |
| `speaker-missing` | 장면 화자가 포즈로 미배치 | **fabricJson 대조(신규)** |

`dpi-warning`·lowDpi 폴백은 **soft signal** 로 분류해 채택을 막지 않는다(품질 개선 여지일 뿐 오류가 아님).

> 실사용 로그가 붙으면 `adoptionRate` 를 실측치로 교체하고 이 프록시는 선행지표로 남긴다.
> 지표 정의를 바꿀 때는 이 문서와 baseline 을 함께 재생성해 비교 가능성을 유지할 것.

## 2. 형식별 결과 — screenplay 가 최악

| 형식 | 대본 | 장면 | 채택률 | 대사 보존 |
|---|---|---|---|---|
| screenplay | 5 | 50 | **0.0%** | **29.9%** |
| novel(일상) | 5 | 50 | 4.0% | 55.4% |
| light-novel/novel(액션) | 5 | 47 | 40.4% | 72.3% |
| diary | 2 | 30 | 16.7% | 80.0% |
| essay | 2 | 12 | 8.3% | 92.3% |

**대사 밀도와 보존율이 반비례한다.** 대사가 거의 없는 essay 는 92%, 대사가 촘촘한 screenplay 는 30%.

## 3. 근본 원인 — 슬롯 수용량 < 장면 대사 수

```
preset-1on1-talk       말풍선 슬롯 2
preset-full-shot-solo  말풍선 슬롯 1
preset-closeup         말풍선 슬롯 1
preset-four-cut        말풍선 슬롯 3
preset-wide            말풍선 슬롯 2
```

반면 실사용 대본의 장면당 대사는 **5~10개**가 흔하다(screenplay 코퍼스 실측 장면당 7개).
현재 파이프라인은 장면 1개 → 페이지 1개로 배치하고, 템플릿 말풍선 슬롯을 초과하는 대사는
**경고 없이 버린다**. 그래서 `p0: 대사 5/7 유실` 같은 결과가 페이지마다 반복된다.

`empty-slot` 61건은 반대 방향의 문제다 — 등장인물이 1명인 장면에 2인용 템플릿이 매칭되어 슬롯이 빈다.

### 후속 개선 방향 (LAYOUT-03 로 등록)
1. **대사 수 기반 페이지 분할** — 장면의 대사가 슬롯 수용량을 넘으면 같은 장면을 여러 페이지로 분할
2. **수용량 기반 템플릿 매칭** — `matchTemplate` 에 장면 대사 수를 입력해 슬롯이 충분한 템플릿 선택
3. **말풍선 슬롯 동적 생성** — 템플릿 슬롯이 부족하면 safe area 안에서 추가 슬롯 생성(BUBBLE-02 비용함수로 위치 결정)
4. **인원 수 기반 템플릿 매칭 보정** — 1인 장면에 2인 템플릿이 붙는 `empty-slot` 해소

## 4. 회귀 가드

`packages/ai-layout/__tests__/adoption-regression.test.ts` 가 코퍼스 축약본으로 baseline 하한을 지킨다.
**개선 시 하한을 함께 올릴 것** — 가드는 "현재보다 나빠지지 않음"만 보장한다.

## 5. 재현

```bash
pnpm turbo run build --filter=@storywork/ai-layout --filter=@storywork/ai-recommend --filter=@storywork/ai-script
pnpm tsx scripts/measure-adoption.ts --verbose            # 페이지별 blocker 상세
pnpm tsx scripts/measure-adoption.ts --json out.json      # 기계 판독 리포트
```

측정은 LLM·DB 를 쓰지 않아 키 없이 결정론적으로 재현된다(같은 seed → 같은 수치).
