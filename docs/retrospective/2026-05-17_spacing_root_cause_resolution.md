# StoryWork spacing 본질 root cause 종결 회고
## 2026-05-17 (전일 회고 §3 의 진짜 결말)

> **세션 개요**: 2026-05-15 ~ 16 회고에서 "12 commits 연속 실패 / 사용자 포기 종료" 로 닫혔던
> spacing 문제의 **진짜 root cause** 5층을 추적해 모두 해소한 세션.
>
> 이전 회고가 "card bg / spacing 16px 시도" 를 본질로 결론지었으나,
> 실제 본질은 **빌드/배포/CSS cascade 인프라 5층 누적 사일런트 버그** 였다.
> 이 회고는 그 5층을 모두 기록하고, 동일 패턴 재발 방지 SOP 를 정착한다.

---

## 📋 목차

1. [전일 회고에서 미해결된 부분](#1-전일-회고에서-미해결된-부분)
2. [5층 root cause](#2-5층-root-cause)
3. [해결 commit 시퀀스](#3-해결-commit-시퀀스)
4. [실측 검증 (Chrome MCP)](#4-실측-검증-chrome-mcp)
5. [재발 방지 SOP](#5-재발-방지-sop)
6. [등록된 FOLLOWUP 부채](#6-등록된-followup-부채)

---

## 1. 전일 회고에서 미해결된 부분

전일 회고 `2026-05-15_16_ui_design_retrospective.md` §3 "spacing UI 12 commits 연속 실패" 가 다음 결론으로 종료됨:

- 본질 진단(§3.3): "panel bg = card bg 같음 → boundary 안 보임"
- 마지막 시도(eb8eec6): card bg=white + border-2 강화
- 사용자: "그만하자 시간 아깝다" 종료
- **검증 못 함** — fix 가 실제로 효과 났는지 확인 없이 PR 닫음

오늘(2026-05-17) 사용자가 같은 화면을 다시 보고 **"아무것도 안 바뀌었다"** 보고. 본질 검증 시작.

---

## 2. 5층 root cause

전일 회고와 오늘 세션 합쳐 **15+ commits 전부 prod 에 반영 안 됐던** 인프라 5층 누적 버그:

### Layer 1 — GitHub repo private 전환 + Vercel Hobby Plan 충돌

- `eb8eec6` 와 `b9b2f23` 사이 GitHub repo 가 public → private 로 전환됨
- Vercel **Hobby Plan 은 private repo + collaborator deploy 차단**
- 이후 모든 deploy `state: BLOCKED` (16개 연속, 23시간)
- 사용자가 어떤 commit 을 push 해도 prod 에 반영 안 됨
- **prod 가 23시간째 eb8eec6 빌드 그대로** = "변화 없음" 의 가장 큰 원인
- 해소: **사용자가 GitHub 에서 repo public 으로 복원** (Claude 가 직접 못 함 — prohibited action)

### Layer 2 — `* { padding: 0 }` universal reset 가 utility cascade 덮어씀

- `packages/shared-ui/src/styles/globals.css:227-230` 의 무명 `* { margin: 0; padding: 0 }`
- Tailwind v4 의 `.p-N` utility 는 `@layer utilities` 안. 그러나 layer 밖 `*` selector 는 **cascade 순서상 utility 보다 뒤**에 와서 padding 을 0 으로 덮어씀
- 증상: prod CSS 에 `.p-5{padding:calc(var(--spacing) * 5)}` 가 있어도 `computed paddingLeft: 0px`
- Tailwind v4 preflight 이 `*, ::backdrop, ::after, ::before` 에 같은 reset 을 `@layer base` 에서 제공하므로 **외부 universal reset 은 중복 + 해로움**
- 해소: 커밋 `1900713`

### Layer 3 — Tailwind v4 monorepo `@source` 누락

- `@import 'tailwindcss'` 가 `packages/shared-ui/src/styles/globals.css:14` 에 위치
- v4 의 자동 source detection 은 그 CSS 파일이 속한 **package 만 scan**
- 따라서 `apps/web/components/**`, `apps/admin/components/**`, `packages/editor-*/src/**` 의 className 을 못 봐서 utility CSS 가 **아예 생성 안 됨**
- 측정: `.p-N` rule count = **0 / 128 sheets rules**
- 해소: 커밋 `14bdeb8` — `@source` directive 3개 추가

### Layer 4 — admin app 의 turbo-ignore 자동 skip

- `apps/admin/vercel.json` 의 build 설정이 `turbo-ignore --fallback=HEAD~1` 사용
- `1900713` (shared-ui fix) 의 admin 빌드는 Layer 1 (BLOCKED) 시기라 build 못 됨
- 그 후 commit (`f8051a0`, `86373b8`) 은 shared-ui/admin 영향 없는 빈 commit
- turbo-ignore 가 **HEAD~1 만 비교** → admin 자동 skip → 86373b8 의 admin 빌드 CANCELED
- **web 은 fix 적용, admin 은 옛 빌드 그대로** 인 상태가 됨
- 해소: 커밋 `a50a252` — `apps/admin/app/globals.css` 에 주석 추가해 admin 영향 commit 으로 인식시킴

### Layer 5 — 회고의 본질 해석 자체가 틀렸음

- 전일 회고 §3.3 은 "card bg = panel bg 색 동일" 을 본질로 결론
- 실제 사용자 의도(오늘 그림 첨부로 명확화): **"객체 양쪽 간격을 맞추라 = panel border ↔ card ↔ card ↔ panel border 모두 일정 간격"**
- 회고 §3 ui-designer 의 16/24/32px 시도가 모두 변화 없었던 **이유 자체가 Layer 1~3** 때문이지 "spacing 값이 부족해서" 가 아님
- 회고 §6.1-B 의 "외곽 padding = grid gap 1:1 권고" 자체는 옳음. 단 그것이 작동하려면 Layer 1~4 가 먼저 해결돼야

---

## 3. 해결 commit 시퀀스

| # | SHA | 메시지 | 효과 |
|---|---|---|---|
| 1 | `4a7cea2` | featuresidebar 패널 spacing `p-5 gap-5` 통일 | 의도 정착 (회고 시도 #13) |
| 2 | `14bdeb8` | `@source` directive 추가 — Tailwind v4 monorepo | Utility CSS 생성 (Layer 3) |
| 3 | `1900713` | universal padding reset 제거 — cascade 정상화 | Utility 적용 (Layer 2) |
| 4 | (사용자) | GitHub repo public 복원 | Vercel deploy 해제 (Layer 1) |
| 5 | `86373b8` | rebuild trigger | web prod 반영 |
| 6 | `a50a252` | admin force trigger | admin prod 반영 (Layer 4) |

전일 회고가 닫힌 후 새 fix commit 4개, 총 6단계로 종결.

---

## 4. 실측 검증 (Chrome MCP)

### 4.1 web /editor

| 패널 | leftOuter | cardGap | rightOuter | DESIGN 의도 |
|---|---|---|---|---|
| 포즈 | 20px | 20px | 20px | ✅ 일정 |
| 말풍선 | 20px | 20px | 20px | ✅ 일정 |
| 도형 | 20px | 20px | 20px | ✅ 일정 |
| 배경 | 20px | 8px(micro) | 231px(우정렬) | swatch grid 설계 의도 |

캡처: `tmp/visual/v2-포즈.png`, `v2-말풍선.png`, `v2-도형.png`

### 4.2 admin /login

| 컴포넌트 | DESIGN-nike spec | prod 실측 | 일치 |
|---|---|---|---|
| button-primary | bg=ink, rounded=full, padding=16/32, h=48 | 검은 알약 "로그인" 버튼 | ✅ |
| search-pill input | bg=soft-cloud, rounded=md, padding=8/16, h=40 | 회색 라운드 input | ✅ |
| spacing tokens (8개) | xxs/xs/sm/md/lg/xl/xxl/section = 2/4/8/12/18/24/30/48px | `--nike-space-*` CSS 변수 8개 모두 일치 | ✅ |

캡처: `tmp/visual/admin-login.png`

### 4.3 Tailwind utility 작동

```
.p-1  → 4px   ✅
.p-4  → 16px  ✅
.p-5  → 20px  ✅
.p-6  → 24px  ✅
.p-8  → 32px  ✅
.gap-N → 정상 ✅
```

before: 모두 0px (Layer 2 + Layer 3 합쳐)
after: 모두 정상값

---

## 5. 재발 방지 SOP

### 5.1 빌드 sanity smoke test (P0)

CI 에 다음 추가:

```bash
# scripts/css-sanity-check.sh
# 빌드 산출물 CSS 에 핵심 utility 가 실제로 존재하는지 검증
for f in apps/web/.next/static/css/*.css apps/admin/.next/static/css/*.css; do
  for u in p-4 p-5 p-8 gap-4 gap-5 gap-8 px-4 py-4; do
    grep -q "\.${u}\b" "$f" || echo "MISSING: ${u} in $f"
  done
done
# universal reset anti-pattern 검출
grep -rn "^\s*\*\s*{[^}]*padding\s*:\s*0" packages/ apps/ && exit 1
```

→ Layer 2 + Layer 3 자동 차단.

### 5.2 prod CSS hash 회귀 검증 (P0)

각 push 후 `ci-watch` 에 prod CSS sanity 추가:
- HEAD push → Vercel deploy READY 확인 → prod CSS 의 `.p-N` rule count > 0 검증
- 실패 시 release 차단

### 5.3 monorepo Tailwind v4 ADR

ADR-0012 신규 추가 (별도 commit): `packages/shared-ui/src/styles/globals.css` 의 `@source` directive 는 **monorepo 모든 source 경로 명시 필수**. 다른 패키지에 utility 사용처 추가 시 source 추가 의무화.

### 5.4 GitHub repo visibility 정책

- Hobby Plan + private repo + collaborator = Vercel BLOCKED 패턴 docs 기록 (CLAUDE.md §9 위험 표)
- repo visibility 변경 시 Vercel project plan 호환성 사전 확인 SOP

### 5.5 회고 §7.4 SOP 보강

UI 피드백 처리 트리에 **0단계 "deploy/CSS 빌드 sanity 우선 확인"** 삽입:
- Step 0: prod CSS chunk hash 가 최신 commit 빌드인지 확인
- Step 0: prod CSS 에 변경한 utility 가 실제로 들어있는지 확인
- 둘 다 OK 여야만 Step 1 (명세화) 진입

→ "코드 변경 했는데 prod 에 안 보임" 류 회의에서 사용자/AI 가 spacing 디자인 토론으로 빠지는 함정 차단.

---

## 6. 등록된 FOLLOWUP 부채

이번 세션에서 추가 / 갱신:

- **FOLLOWUP-15** (P1) → ✅ closed (repo public 복원으로 Vercel deploy 정상화. 단 plan upgrade 시 private 회복 가능)
- **FOLLOWUP-54** (P1) visual-check 인프라 한계 — Playwright headless 의 `md:` breakpoint, prod URL 지원 (b8508fc 등재됨)
- **FOLLOWUP-55** (P0) **CSS utility 빌드 sanity CI gate** — 본 회고 §5.1 (신규 등재 필요)
- **FOLLOWUP-56** (P0) **ADR-0012 Tailwind v4 monorepo @source policy** — §5.3 (신규)
- **FOLLOWUP-57** (P1) **ESLint custom rule: universal `*` + padding/margin 차단** — Layer 2 회귀 방지 (신규)
- **FOLLOWUP-58** (P2) **회고 §7.4 SOP 에 Step 0 deploy sanity 삽입** — §5.5 (신규)

---

## 7. 시간 / 토큰 소비

| 항목 | 값 |
|---|---|
| 전일 회고 (12 commits 실패) | 8h |
| 본일 fix (Layer 1~5 추적) | ~6h |
| 누적 commits | 회고 12 + 본일 6 + 인프라 3 = 21 |
| 결과 prod 반영 commits | 4 (4a7cea2 / 14bdeb8 / 1900713 / a50a252) |
| 실제 spacing 디자인 변경 라인 | 21 lines (4a7cea2) |
| 인프라 fix 라인 | 16 lines (14bdeb8 13 + 1900713 -10/+6 = 9 + a50a252 4) |

→ **디자인 결정 자체는 1 commit / 21줄로 끝났을 일이, 인프라 5층 누적 버그 때문에 21 commits / 14h 가 됐다**. 본 회고의 §5.1 sanity check 가 있었다면 첫 commit 후 30초 안에 Layer 2/3 가 잡혔을 것.

---

## 8. 최종 사과 + 약속

전일 회고에서 "다음 세션부터 본 회고의 8 가지 원칙을 엄격히 따르겠습니다" 라고 한 약속을 본 세션 초반에 또 깼다(Chrome MCP 측정 안 한 채 prod 캡처를 의미 있다고 보고). 사용자가 다시 그림을 보내 정확히 지적한 뒤에야 Layer 2~5 추적이 시작됐다.

본 회고의 §5 SOP 5건이 코드/CI 로 박혀야만 다음 세션에서 회귀가 없다. FOLLOWUP-55~58 4건은 **다음 세션 P0**.

오래 걸린 시간에 대한 사과 + 결과만큼은 구색을 갖춰 종결한 점에 감사드립니다.

---

_Last updated: 2026-05-17_
_작성: Claude Code (Opus 4.7)_
_관련 회고: [2026-05-15_16_ui_design_retrospective.md](2026-05-15_16_ui_design_retrospective.md)_
