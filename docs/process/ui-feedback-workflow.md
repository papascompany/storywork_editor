# UI 피드백 워크플로우 — 명세화 → 동의 → 구현 → 검증 (FOLLOWUP-53)

> **목적**: 2026-05-15 회고에서 도출된 12 commits 연속 실패 패턴을 구조적으로 차단.
> 사용자의 직관적 표현("다닥다닥", "호흡감", "균형")을 명세표로 변환하고,
> AI 가 시각 검증을 거친 후에만 push 하는 SOP(표준 운영 절차)다.
>
> 근거: [2026-05-15_16_ui_design_retrospective.md](../retrospective/2026-05-15_16_ui_design_retrospective.md) §5, §7

---

## 1. 핵심 원칙

> **"사용자는 의도를 말한다. AI 는 명세화 + 구현 + 검증한다."**
>
> 사용자가 수치를 직접 줘야 한다면 그것은 바이브 코딩이 아니다.

### 황금 규칙

- 추측 push 금지. 명세표 없이 구현 시작하지 않는다.
- 2번째 실패 전 반드시 명세표를 작성하고 사용자 동의를 받는다.
- 3번째 실패 시 즉시 멈추고 사용자에게 재확인을 요청한다.
- push 전 AI 가 직접 screenshot 으로 시각 검증한다 (`/visual-check`).

---

## 2. Step 0 — Deploy / Build Sanity (필수, 가장 먼저)

> FOLLOWUP-58: 회고 §3 의 "13일 spacing 실패" 패턴 재발 차단.
> 근거: [2026-05-17_spacing_root_cause_resolution.md](../retrospective/2026-05-17_spacing_root_cause_resolution.md) §5.5

UI 피드백을 받았을 때 명세화 / 디자인 토론을 시작하기 **전에** 반드시:

### 0.1 Prod deploy 가 최신 commit 빌드인지 확인

- `vercel ls <project>` 로 latest deploy state 확인
- state 가 `READY` 이고 commit SHA 가 HEAD 와 일치하는지 점검
- state 가 `BLOCKED` 또는 `CANCELED` 면 → 회고 Layer 1 (repo visibility / plan) 우선 처리

```bash
# web 프로젝트 최신 deploy 상태 확인
vercel ls storywork-editor-web --limit 3

# admin 프로젝트
vercel ls storywork-editor-admin --limit 3
```

### 0.2 Prod CSS 에 변경한 utility 가 실제로 들어있는지

사용자 피드백이 spacing / padding / gap 관련이면:

```bash
# prod CSS chunk URL 추출 + utility 존재 확인
bash scripts/check-prod-sanity.sh --web --utility p-5
bash scripts/check-prod-sanity.sh --admin --utility p-5
```

또는 Chrome MCP 로 직접 확인:

```
document.styleSheets 에서 .p-N rule 검색
```

변경한 utility(`.p-5` 등)가 prod CSS 에 없으면:
- 로컬에서 `pnpm check:css-anti && pnpm check:css-source && pnpm build && pnpm check:css-sanity` 실행
- CI 통과했는데도 prod 에 없으면 → Layer 4 (turbo-ignore skip) 의심

### 0.3 통과 조건

- prod deploy state = `READY` + commit SHA = HEAD
- 변경 utility 가 prod CSS 에 존재
- 둘 다 OK 여야만 Step 1 (명세화) 진입

### 0.4 위반 시 즉시 중단

- 이 단계가 깨졌다면 "디자인 가이드 / 토큰 / spacing 토론" 은 의미 없음
- 먼저 deploy/build 인프라 fix → 다시 Step 0 → 그 다음 명세화
- 회고 §3 의 13일 패턴 재발 신호이므로 §2 의사결정 트리 "3회 실패 즉시 멈춤" 룰 발동

---

## 3. 8단계 의사결정 트리

```
사용자 UI 피드백 발생
       ↓
[Step 0] Deploy/Build Sanity 확인 (§2 필수)
       - prod deploy READY + HEAD SHA 일치?
       - 변경 utility prod CSS 에 존재?
       - 실패 시 → 인프라 fix 우선, 토론 금지
       ↓
[Step 1] 명세표 작성 ←──────────────────────────────────────────┐
       - 현재 측정값 (px 단위, 색상값, border 두께 등)           │
       - 진단 (원인 가설 + visual hierarchy 점검)               │
       - 제안 (구체 수치 + 영향받는 visual element 전체)         │
       - 변화 폭이 사용자 인식 임계값(8px+) 이상인가?            │
       ↓                                                       │
[Step 2] 사용자 동의 받기 (필수 — 생략 불가)                     │
       ↓                                                       │
[Step 3] 구현                                                   │
       ↓                                                       │
[Step 4] AI 직접 시각 검증 (/visual-check)                      │
       - dev 서버 screenshot 캡처                               │
       - 사용자 의도와 매칭 점검 (명세표 기준)                    │
       ↓                                                       │
[Step 5] 매칭 OK → push ── 불일치 → Step 1 로 (사용자에게 안 보냄)│
       ↓                                                       │
[Step 6] CI 자동 polling (/ci-watch)                           │
       ↓                                                       │
[Step 7] 사용자 검증 요청 (incognito 탭 강조)                   │
       ↓                                                       │
[Step 8] 사용자 부정 피드백 시                                   │
       - 1회 실패: Step 1 재시작                                │
       - 2회 실패: 멈추고 회고 ─────────────────────────────────┘
                  (ui-designer 서브에이전트 위임 또는 사용자 재확인)
       - 3회 실패: 즉시 멈춤. "제가 의도를 잘못 이해했을 수 있습니다.
                  다시 처음부터 같이 정리해볼까요?" 요청
```

---

## 4. 명세표 형식

UI 피드백을 받으면 다음 형식으로 명세표를 먼저 작성하고 사용자 동의를 구한다.
(`/ui-spec` 슬래시 커맨드로 자동 생성 가능)

```
## UI 명세표 — <컴포넌트/이슈 이름>

### 현재 측정값
| 항목 | 현재값 | 위치 |
|---|---|---|
| 외곽 padding | 16px | PosePanel.tsx L42 |
| grid gap | 16px | PosePanel.tsx L48 |
| 카드 배경색 | --color-surface-muted (#f5f6f7) | PoseGridItem.tsx |
| 패널 배경색 | --editor-panel (#f0f1f3) | editor.css L12 |
| 카드 border | 1px solid --hairline (#cacacb) | PoseGridItem.tsx |

### 진단
- 원인 가설: [ 기술적 원인 설명 ]
- visual hierarchy 점검: [ panel ↔ card 색 차이 / border / shadow 체크 ]
- 사용자 시각 임계값: 현재 변화 X px → 인식 가능/불가능

### 제안
| 항목 | 제안값 | 변화 폭 | 인식 가능? |
|---|---|---|---|
| 카드 배경색 | white (#ffffff) | 명확 대비 | YES |
| 카드 border | 2px solid --hairline | +1px | YES |
| 외곽 padding | 20px | +4px | 경계선 (8px+ 권장) |
| grid gap | 20px | +4px | 경계선 |

### 이 제안에 동의하시면 구현을 시작합니다.
[예/아니오 또는 수정 의견]
```

---

## 5. 사용자 시각 인식 임계값 가이드

UI 변경은 아래 임계값 이상의 변화를 포함해야 한다. 그 미만은 사용자에게 인식되지 않는다.

| 속성 | 최소 인식 임계값 | 권장 변화 단위 |
|---|---|---|
| padding / gap | **8px** | 8 / 16 / 24 / 32px |
| font-size | **2px** | 12 → 14 → 16 → 18px |
| background color | **명확한 차이** | #fff vs #f5f5f5 ≈ 동일로 인식 |
| border 두께 | **1px → 2px** 이상 | 1px → 2px 차이 명확 |
| border 색상 | **20% 이상 명도 차** | hairline vs border-strong |
| shadow | **0 → shadow-sm** 이상 | 점진적 단계 사용 |
| border-radius | **4px** 이상 | rounded-md(6) / rounded-lg(8) / rounded-xl(12) |

### 4px 변화는 push 하지 않는다

4px 변화(예: px-4 → px-5)는 일반 사용자 화면에서 인식 불가능하다.
이 수준의 변화는 명세표 단계에서 걸러져야 한다.

---

## 6. Visual Hierarchy 체크리스트

spacing 작업 전 다음을 먼저 확인한다:

```
[ ] panel 배경색과 card 배경색이 다른가?
     → 같으면 padding 아무리 커도 boundary 없음
     → 해결: card bg = white + border-2 (또는 shadow)

[ ] card 의 border 가 panel 배경색 대비 충분히 두드러지는가?
     → 1px hairline (#cacacb) + 같은 배경 = 거의 안 보임
     → 해결: border-2 또는 border-color 강화

[ ] 변화 폭이 인식 임계값(§4) 이상인가?

[ ] shadow 나 elevation 으로 depth 를 줄 수 있는가?
     → flat 디자인에서 spacing 만으로 한계가 있을 때 shadow 활용
```

---

## 7. 책임 분담

| 역할 | 책임 |
|---|---|
| **사용자** | 직관적 의도 표현, 시각 피드백(만족/불만족 + 위치), 명세표 동의 |
| **AI (orchestrator/ui-designer)** | 명세화, 구현, 시각 검증(`/visual-check`), CI 확인(`/ci-watch`), 회고 |
| **ui-designer 서브에이전트** | 도메인 전문 영역 — 2회 실패 시 위임 대상 |

사용자가 수치를 일일이 줄 필요 없다. AI 가 명세화 + 검증 책임을 진다.

---

## 8. 실패 패턴 자동 감지

다음 패턴이 감지되면 즉시 멈추고 이 워크플로우의 Step 1 로 돌아간다:

- 같은 컴포넌트에 3회 이상 연속 push (사용자 반응 부정적)
- push 와 push 사이에 `/visual-check` 없이 진행
- 명세표 없이 구현 시작
- 4px 미만 변화로 push

---

## 9. 관련 도구

| 도구 | 용도 | 링크 |
|---|---|---|
| `/visual-check` | AI 직접 시각 검증 | [.claude/commands/visual-check.md](../../.claude/commands/visual-check.md) |
| `/ci-watch` | push 후 CI 자동 polling | [.claude/commands/ci-watch.md](../../.claude/commands/ci-watch.md) |
| `/ui-spec` | 사용자 피드백 → 명세표 자동 생성 | [.claude/commands/ui-spec.md](../../.claude/commands/ui-spec.md) |
| `pnpm visual-check` | CLI 직접 실행 | `bash scripts/visual-check.sh` |
| `pnpm ci-watch` | CLI 직접 실행 | `bash scripts/ci-watch.sh` |
| `check-prod-sanity.sh` | Step 0 자동화 — prod deploy + CSS utility 존재 검증 | `bash scripts/check-prod-sanity.sh --web --utility p-5` |

---

## 10. FOLLOWUP-54 진단 노트 — visual-check 인프라 한계 해소

> 2026-05-17 진단 결과. 회고 §4 에서 발견된 두 한계를 보강.

### 한계 1 — Playwright headless 의 `md:` breakpoint 미적용 (해소)

**원래 가설**: SSR/hydration 타이밍 또는 matchMedia mock 누락.

**실제 원인**: FeatureSidebar 는 도구 클릭 시에만 `width: 0px → 328px` 로 전환되는 상태 기반 패널. Playwright 가 클릭 없이 캡처하면 width: 0 상태로 렌더됨. matchMedia 나 hydration 문제가 아님.

**진단 측정값** (viewport 1280px, Playwright headless):

```
matchMedia(min-width: 768px): true   ← 정상
window.innerWidth: 1280              ← 정상
ToolBar (aside): width 80px          ← w-20 정상
FeatureSidebar (aside): width 308px  ← hidden md:flex 정상 (클릭 전 0px)
```

**해결**: `--click "[aria-label='도형']"` 옵션으로 도구 버튼 클릭 후 캡처.

```bash
# 패널 열린 상태 캡처
pnpm visual-check /editor --click "[aria-label='도형']" --wait 2000
```

### 한계 2 — `visual-check.sh` localhost 전용 (해소)

**해결**: `--url <full-url>` 옵션 추가. 외부 URL 사용 시 dev 서버 readiness 체크 자동 skip.

```bash
pnpm visual-check --url https://storywork-editor-web.vercel.app/editor
```

---

_Last updated: 2026-05-17 (FOLLOWUP-58: Step 0 deploy/build sanity 추가)_
_근거: [2026-05-15_16 회고](../retrospective/2026-05-15_16_ui_design_retrospective.md) §5, §7_
_FOLLOWUP-54: [roadmap.md FOLLOWUP-54](../architecture/roadmap.md)_
_FOLLOWUP-58: [roadmap.md FOLLOWUP-58](../architecture/roadmap.md) — [2026-05-17 회고](../retrospective/2026-05-17_spacing_root_cause_resolution.md) §5.5_
