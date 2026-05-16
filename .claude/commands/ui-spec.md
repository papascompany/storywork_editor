---
description: 사용자 UI 직관 표현("다닥다닥")을 구체적 명세표로 변환. 동의 후 구현 시작.
---

# /ui-spec — UI 피드백 명세화 커맨드 (FOLLOWUP-53)

## 목적

사용자의 직관적 UI 피드백을 측정 가능한 명세표로 변환한다.
추측 구현을 차단하고 사용자 동의 후 단일 방향으로만 진행한다.

**이 커맨드는 명세표를 생성할 뿐, 구현은 사용자 동의 후 별도로 시작한다.**

## 사용법

```
/ui-spec <issue>
```

### 예시

```
/ui-spec "포즈 패널이 다닥다닥 붙어있어"
/ui-spec "admin nav 에 호흡감이 없음"
/ui-spec "카드와 배경이 구분이 안 돼"
/ui-spec "버튼들이 너무 작아 보여"
```

## 실행 절차

이 커맨드를 받으면 다음 순서로 진행한다:

### 1단계: 현재 코드 측정

관련 컴포넌트를 읽어 현재 값을 측정한다:

```bash
# 관련 파일 탐색
grep -r "pose-panel\|PosePanel\|pose_panel" apps/web/app/editor/ --include="*.tsx" --include="*.css" -l
```

측정 항목:

- padding / gap / margin (px 단위)
- 배경색 (CSS 변수 또는 hex)
- border 두께 + 색상
- 컴포넌트 파일 경로 + 라인 번호

### 2단계: 명세표 출력

다음 형식으로 명세표를 출력한다:

```
## UI 명세표 — <이슈 요약>

### 현재 측정값
| 항목 | 현재값 | 위치 |
|---|---|---|
| 외곽 padding | Xpx | ComponentName.tsx LN |
| grid gap | Xpx | ComponentName.tsx LN |
| 카드 배경색 | --token (hex) | ComponentName.tsx |
| 패널 배경색 | --token (hex) | editor.css LN |
| 카드 border | Xpx solid --token | ComponentName.tsx |

### 진단
- 원인: [ 기술적 원인 설명 ]
- visual hierarchy: [ panel ↔ card 색 차이 / boundary 분석 ]
- 인식 임계값: 현재 변화 X px → 인식 가능/불가능

### 제안 (변화 폭 8px+ 보장)
| 항목 | 현재 → 제안 | 변화 폭 | 인식 가능? |
|---|---|---|---|
| 카드 배경색 | muted → white | 명확 대비 | YES |
| 카드 border | 1px → 2px | +1px | YES |
| 외곽 padding | X → Ypx | +Zpx | YES/경계 |
| grid gap | X → Ypx | +Zpx | YES/경계 |

### 영향 파일
- `path/to/ComponentName.tsx` (L<start>-L<end>)
- `path/to/styles.css` (L<line>)

### 이 제안에 동의하시면 구현을 시작합니다. [예/수정 의견]
```

### 3단계: 사용자 동의 대기

명세표를 출력한 후 **사용자 응답을 기다린다.** 동의 없이 구현을 시작하지 않는다.

### 4단계: 동의 후 구현 + 시각 검증

사용자가 동의하면:

1. 구현 진행
2. `/visual-check <route>` 로 시각 검증
3. AI 가 직접 이미지 확인 → 명세표 기준 매칭 여부 판단
4. 매칭 OK → push + `/ci-watch`
5. 매칭 NO → 명세표 수정 (사용자에게 안 보냄)

## 실패 차단 규칙

이 커맨드를 거치지 않고 UI 작업을 시작하면 다음 경고를 출력한다:

```
[ui-spec] WARNING: 명세표 없이 UI 작업을 시작하려 합니다.
반드시 /ui-spec <이슈> 로 명세화 후 사용자 동의를 받으세요.
docs/process/ui-feedback-workflow.md §2 참고
```

## 워크플로우 전체 흐름

1. 사용자 피드백 → `/ui-spec "피드백"` → 명세표 → 사용자 동의
2. 구현 → `/visual-check <route>` → AI 시각 확인
3. 통과 → push → `/ci-watch` → 사용자 검증 요청
4. 부정 피드백 → `/ui-spec` 재시작 (Step 1)
5. 2회 실패 → 멈추고 ui-designer 서브에이전트 위임
6. 3회 실패 → 즉시 멈춤 + 사용자 재확인 요청

전체 워크플로: [docs/process/ui-feedback-workflow.md](../../docs/process/ui-feedback-workflow.md)
