# Web Speed Audit — 2026-06-05 (Step 1 진단 + Step 2 fix)

> **Step 1** = 진단 (HEAD `dab88d4` 기준)
> **Step 2** = 권고 #1+#2+#3 적용 (옵션 C, 묶음 fix) — §J 참조
>
> Step 3 (`/editor` dynamic import) 는 별도 PR. 회고 §7.2 룰 준수.

---

## 0. 요약 (TL;DR)

| 시나리오 | Desktop LCP P75 | Mobile LCP P75 | CWV 상태 |
|---|---|---|---|
| s1 `/` (마케팅 랜딩) | 372ms | 380ms | Good |
| s2 `/editor` (편집기 셸) | 528ms | 460ms | Good |
| s3 `/editor/import` (Wizard) | 468ms | 452ms | Good |
| s4 `/legal/terms` (정적) | 300ms | 352ms | Good |
| s5 `/notices` (BOARD) | **4016ms** | 1568ms | **Poor (desktop)** |

**핵심 발견 1건만 CWV 목표 초과**: `/notices` desktop LCP P75 = 4016ms (목표 2500ms, 초과 +1516ms).
나머지 시나리오는 모두 LCP < 600ms 로 매우 양호.

**Bundle 핵심 이슈 1건**: `/editor` First Load JS = 590KB gzipped — Next.js 권고치 (~200KB) 의 약 3배.
편집기 fabric.js + 모노레포 `editor-*` 패키지가 초기 로드에 묶여있을 가능성 높음.

**진단 한계**: 본 측정은 page-load only. **INP 는 모두 0ms** — 자동 interaction 없음.
실유저 INP / CLS 변동은 Vercel Speed Insights 등 RUM 도입 필요 (현재 미설정).

---

## A. 측정 환경

- HEAD: `1476d7b`
- 환경: prod (`https://storywork-editor-web.vercel.app`)
- 측정 도구: Playwright bundled Chromium (headless), `scripts/perf-web-measure.ts`
- 시나리오: 5개 × 뷰포트 2개 × 반복 3회 = **30 페이지 로드**
- 측정일: 2026-06-05
- 뷰포트
  - **desktop**: 1440×900, DPR=1
  - **mobile**: 390×844, DPR=2, iPhone UA
- 수집 지표: TTFB, FCP, LCP (PerformanceObserver buffered), CLS (layout-shift), INP 근사 (event entries), TTI 근사 (`domInteractive`), Total (`loadEventEnd`)
- waitUntil: `networkidle` (실패 시 `domcontentloaded` 폴백) + LCP/CLS 수집 여유 1200ms
- raw JSON: `tmp/perf/web-prod-2026-06-05T03-29-35.json`
- bundle raw JSON: `tmp/perf/web-bundle-2026-06-05.json`

### A.1 Core Web Vitals 임계값 기준

| Metric | Good | Needs Improvement | Poor |
|---|---|---|---|
| TTFB | ≤ 800ms | ≤ 1800ms | > 1800ms |
| FCP | ≤ 1800ms | ≤ 3000ms | > 3000ms |
| LCP | ≤ 2500ms | ≤ 4000ms | > 4000ms |
| CLS | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| INP | ≤ 200ms | ≤ 500ms | > 500ms |

---

## B. Web Vitals — 시나리오별 P75 (실측)

### B.1 Desktop (1440×900)

| 시나리오 | TTFB | FCP | LCP | CLS | INP | TTI | Total |
|---|---|---|---|---|---|---|---|
| `/` | 63ms | 372ms | **372ms** | 0 | 0ms | 230ms | 463ms |
| `/editor` | 139ms | 444ms | **528ms** | 0 | 0ms | 388ms | 729ms |
| `/editor/import` | 167ms | 448ms | **468ms** | 0 | 0ms | 388ms | 456ms |
| `/legal/terms` | 54ms | 300ms | **300ms** | 0.0001 | 0ms | 223ms | 476ms |
| `/notices` | 55ms | 4016ms | **🔴 4016ms** | 0.0001 | 0ms | 4009ms | 4252ms |

### B.2 Mobile (390×844, DPR=2, iPhone UA)

| 시나리오 | TTFB | FCP | LCP | CLS | INP | TTI | Total |
|---|---|---|---|---|---|---|---|
| `/` | 122ms | 380ms | **380ms** | 0 | 0ms | 230ms | 391ms |
| `/editor` | 173ms | 428ms | **460ms** | 0 | 0ms | 337ms | 474ms |
| `/editor/import` | 183ms | 436ms | **452ms** | 0 | 0ms | 301ms | 437ms |
| `/legal/terms` | 56ms | 352ms | **352ms** | 0 | 0ms | 210ms | 325ms |
| `/notices` | 54ms | 1568ms | **1568ms** | 0 | 0ms | 1564ms | 1626ms |

> 🔴 = CWV Poor 또는 목표 미달.

### B.3 `/notices` 개별 run 분석 (편차 주목)

| run | viewport | TTFB | FCP | LCP | Total |
|---|---|---|---|---|---|
| 1 | desktop | 55ms | 4016ms | 4016ms | 4252ms |
| 2 | desktop | 31ms | 1536ms | 1536ms | 1530ms |
| 3 | desktop | 26ms | 3848ms | 3848ms | 3960ms |
| 1 | mobile | 25ms | 1568ms | 1568ms | 1626ms |
| 2 | mobile | 54ms | 1456ms | 1456ms | 1572ms |
| 3 | mobile | 28ms | 1444ms | 1444ms | 1446ms |

**관찰**:
- TTFB 자체는 25~55ms 로 모두 양호 → 서버는 빠르게 응답.
- desktop run 1, 3 에서 FCP/LCP ≈ 4000ms 로 polarized. run 2 는 1536ms.
- mobile 은 일관되게 1500ms 근처 — desktop 편차의 원인이 단순 콜드 함수가 아님.
- **편차 가설**: render-blocking resource (font / CSS / 폰트 로드) 가 viewport 별로 다른 우선순위로 평가됨. 또는 desktop 환경의 reCAPTCHA-like 측정 ghost 시간 (waitUntil=networkidle 의 networkidle threshold 변동).

---

## C. Bundle 분석 (First Load JS)

### C.1 라우트별 (gzipped)

| Route | Files | Raw (KB) | Gzip (KB) | 권고 대비 |
|---|---|---|---|---|
| `/` (landing) | 13 | 787 | **228** | ~15% over |
| `/notices` | 12 | 773 | **223** | ~12% over |
| `/legal/terms` | 12 | 773 | **223** | ~12% over |
| `/editor/import` | 9 | 533 | **159** | OK |
| `/editor` | 17 | 2050 | **🔴 590** | **~3x over** |

> Next.js 권고 First Load JS: ≤ ~200KB gzipped (참고치).
> `/editor` 만 심각하게 초과. 나머지는 marginal 초과.

### C.2 Top 12 chunks (gzipped)

| 크기 | 사용 routes | 청크 | 추정 내용 |
|---|---|---|---|
| 90KB | 1 | `0b465130-…` | editor-only (fabric refs 다수) |
| 89KB | 1 | `967860d1-…` | editor-only (fabric refs 다수) |
| 85KB | 1 | `9ba9f599-…` | editor-only |
| 72KB | 1 | `page-79abbf...js` (editor route) | editor page (FabricObject 194 occurrences) |
| 52KB | 60 | `87c73c54-…` | shared (모든 라우트 공통) |
| 49KB | 20 | `1493-…` | shared / 비-editor |
| 45KB | 60 | `18-…` | shared (모든 라우트 공통) |
| 44KB | 18 | `2419-…` | semi-shared |
| 19KB | 2 | `8655-…` | 2 routes |
| 12KB | 20 | `75504863-…` | shared subset |
| 11KB | 1 | `4954-…` | route-specific |
| 9KB | 1 | `7429-…` | route-specific |

**관찰**:
- Top 4 청크 (336KB gzipped) 가 모두 **`/editor` 전용** 으로 묶여있음.
- 모든 라우트 공통 base = `87c73c54` (52KB) + `18-…` (45KB) + framework + main = 약 **150KB gzipped** 가 모든 라우트에 항상 로드.
- 비-편집기 라우트 (`/`, `/notices`, `/legal/terms`) 의 ~225KB 는 공통 base (150KB) + 약 75KB 의 `1493-…` (49KB) + `2419-…` (44KB) + route-specific (5-10KB) 조합으로 추정.
- **`/editor` 의 590KB 는 fabric.js + 모노레포 `editor-*` 패키지 (`@storywork/editor-core`, `editor-layers`, `editor-pose`, `editor-text`, `editor-bubble`, `editor-effects`, `editor-export`, `editor-ui`) 가 단일 chunk 그룹으로 묶여 초기 로드되는 결과로 추정**. 실측 검증은 `next experimental-analyze` 또는 webpack analyzer 필요 (Step 2 에서).

---

## D. 보이는 Bottleneck 후보 Top 5 (실측 기반 가설)

### D.1 🔴 `/notices` LCP 편차 4016ms — 가장 큰 단일 이슈

**실측 증거**:
- desktop run 1, 3: FCP/LCP ≈ 4000ms, run 2: 1536ms (편차 2.6배)
- TTFB 자체는 25~55ms 로 매우 양호
- mobile 은 1444~1568ms 로 일관 — desktop 만 편차 큼
- `apps/web/app/notices/page.tsx` 는 `dynamic = 'force-dynamic'` + Prisma 쿼리 3개 (findMany x 2, count) Promise.all 병렬

**가설** (우선순위 순, 실측 확정 X):
1. **Vercel 서버리스 함수 워밍** — `force-dynamic` 으로 RSC 매 요청 실행. CDN 캐시 hit 없으면 함수 콜드/리워밍.
2. **render-blocking font 로드** — page.tsx 가 `var(--mkt-font-display)`, `var(--mkt-font-mono)`, `var(--mkt-font-sans)` 3종 인라인 style 사용. font display 정책 검증 필요.
3. **inline `<style>` block** — 컴포넌트 끝부분 `<style>` 가 hover 규칙 주입. RSC 매 요청 직렬화에 포함.
4. **desktop networkidle 임계값 우연** — Playwright `networkidle` 정의 (500ms 동안 ≤2 인플라이트) 가 desktop 에서 한번씩 흔들렸을 가능성. 다만 Vitals (FCP/LCP) 는 측정 도구와 무관하게 브라우저가 보고하는 값이므로 이 가설은 약함.

**검증 권고** (Step 2):
- Vercel Speed Insights 도입 → 실유저 RUM TTFB/FCP/LCP 5분 단위 확인
- runtime caching (`'use cache'` + `cacheTag('notices')`) 적용으로 RSC payload 캐시
- Pinned 쿼리 + non-pinned 쿼리를 하나의 raw SQL UNION 으로 묶어 라운드트립 절반

### D.2 🟡 `/editor` First Load JS 590KB gzipped — Bundle 비대화

**실측 증거**: app-build-manifest.json 의 `/editor/page` 17 청크 합산.
**가설**:
- fabric.js + 모노레포 `editor-*` 패키지 8개가 전부 client-side 로 묶여 초기 로드.
- `next.config.ts` 의 `transpilePackages` 에 14개 패키지 등록 — 트리쉐이킹이 효과적이지 않을 가능성.
- 동적 import (`next/dynamic`) 적용 여부 미확인 (Step 2 에서 확인).

**예상 영향**:
- 측정한 데스크탑/모바일 환경에서는 FCP/LCP 영향 미미 (이미 양호).
- **느린 네트워크/저사양 디바이스 사용자에 미치는 영향 측정 불가** — Speed Insights RUM 도입해야 보임.
- INP 잠재 위험: 큰 JS 평가 시간이 TBT (Total Blocking Time) 으로 누적.

**검증 권고**:
- `next experimental-analyze` (Next.js 16.1+) 또는 `@next/bundle-analyzer` 로 청크 내용 확인.
- fabric.js dynamic import 여부 점검 — 편집기 캔버스 패널만 lazy 로드 가능한 구조인지.

### D.3 🟡 RUM (Real User Monitoring) 부재 — INP/CLS 진단 사각지대

**실측 증거**: `grep speed-insights apps/web/app` → 0건.
- `@vercel/speed-insights` 미설치
- 본 measurement 은 page-load only 라 INP 는 자동 interaction 없이 모두 0ms.
- CLS 도 page-load 시점만 측정. 사용자 스크롤/탭/모달 후 발생하는 layout shift 는 미검출.

**결과**: 사용자가 실제 체감하는 INP / 지연 변동을 본 진단으로 알 수 없음.
**검증 권고**: Vercel Speed Insights 또는 web-vitals.js 도입 → 실 RUM 데이터 7일 누적.

### D.4 🟡 First Load 공통 base 150KB gzipped — 비-편집기 라우트도 marginal 초과

**실측 증거**:
- `/`, `/notices`, `/legal/terms` 모두 ~225KB gzipped — 권고 ~200KB 대비 +12%.
- 공통 base (60 routes 사용 청크 합): 52KB + 45KB + framework 등 ≈ 150KB.
- 추가 ~75KB 는 `1493-…` (49KB, 20 routes) + `2419-…` (44KB, 18 routes) 등 partial-shared.

**가설**:
- `1493-…`, `2419-…` 청크 내용 미확인. shared UI / Radix / lucide / react-hook-form 등 후보.
- 마케팅/정적 페이지 (`/legal/terms`, `/`) 가 인터랙티브 클라이언트 컴포넌트를 너무 많이 끌어들이는지 점검 필요.

**검증 권고**: Step 2 에서 `next experimental-analyze` 로 청크 내용 확인 후, `'use client'` 경계 audit.

### D.5 🟢 `/legal/terms` 정적 페이지 TTFB 50ms / LCP 300ms — 양호 (벤치마크 참고용)

**실측 증거**: TTFB P75 desktop 54ms, mobile 56ms / LCP 300~352ms.
- ISR/SSG 또는 light RSC 가 잘 작동하는 베이스라인.
- 이 페이지를 기준으로 다른 페이지의 미달분을 비교 가능 (예: `/notices` desktop run 1 4016ms 와 비교 시 약 13배 차이).

**활용**:
- 최소 LCP 목표 추정치: TTFB 50ms + 첫 페인트 300ms = **400ms (모범)**.
- `/notices` 가 같은 baseline (정적 페이지급) 으로 끌어내리는 것은 어려움 (DB 쿼리 3개 + dynamic). 하지만 **2500ms 미만 (CWV Good)** 은 합리적 목표.

---

## E. 개선 권고 우선순위

> 본 권고는 **진단 가설** 기반. 각 항목은 Step 2 에서 실측 검증 후 실행한다.
> 회고 §7.2-② "실측 없이 추측 fix 금지" 룰 — 가설 검증 단계 없이 바로 코드 변경 금지.

### E.1 High Impact / Low Effort (P0 후보)

| # | 권고 | 대상 | 예상 개선 | 작업 추정 | 위험 |
|---|---|---|---|---|---|
| 1 | Vercel Speed Insights 도입 (RUM) | apps/web layout.tsx | **진단 정확도 대폭 향상** — INP/CLS 실유저 데이터 7일 누적. 본 작업 자체는 성능 향상이 아니지만, 향후 모든 권고 검증의 기반. | XS (1 PR, 10줄) | 매우 낮음 |
| 2 | `/notices` 페이지 RSC 캐싱 — `'use cache'` + `cacheTag('notices')` | apps/web/app/notices/page.tsx | LCP P75 4016ms → ~500ms (S4 정적 페이지 수준). updateTag/revalidateTag 로 새 공지 등록 시 무효화. | S (1 PR, ~20줄) | 낮음 — cache stampede 가능성, ADR 필요 |
| 3 | `/notices` Prisma 쿼리 통합 — pinned + non-pinned 단일 UNION 또는 `OR` 조건 | apps/web/app/notices/page.tsx | DB 라운드트립 3→1, RSC 직렬화 시간 단축. CWV 영향은 #2 가 더 크지만 #2 와 보완. | S (1 PR, ~15줄) | 낮음 |

### E.2 Medium Impact / Medium Effort (P1 후보)

| # | 권고 | 대상 | 예상 개선 | 작업 추정 | 위험 |
|---|---|---|---|---|---|
| 4 | `/editor` 청크 분석 → fabric.js + 편집 도구 패널 dynamic import | apps/web/app/editor/page.tsx | First Load JS 590KB → ~250KB 목표. 초기 캔버스만 로드, 도구 패널 (text/bubble/effects/export) 은 사용 시 fetch. | M (3-5 PR, 분할 작업) | 중간 — UX flicker, 코드 splitting 경계 디자인 필요 |
| 5 | 비-편집기 라우트 (`/`, `/notices`, `/legal/terms`) `'use client'` 경계 audit | apps/web/components/marketing/* + app/* | First Load JS 225KB → ~180KB 목표. shared 청크 (1493, 2419) 내용 파악 후 RSC 로 옮길 수 있는 컴포넌트 식별. | M (audit + PR 2-3개) | 중간 — interactive 컴포넌트 missed 가능성 |
| 6 | `/editor` 페이지 RSC 단계 (편집 데이터 fetch) 캐싱 | apps/web/app/editor/page.tsx + lib/editor.ts | 편집기 초기 LCP P75 528ms → ~400ms. 작품 데이터 자체는 사용자별이므로 unstable_cache 대신 RSC + parallel routes 패턴 검토. | M | 중간 |

### E.3 Low Impact 또는 High Effort (P2 후보)

| # | 권고 | 대상 | 예상 개선 | 작업 추정 |
|---|---|---|---|---|
| 7 | font-display 정책 점검 (next/font 적용 여부, 3종 변수 폰트 fallback) | apps/web/app/fonts.ts | CLS 0 → 유지, FCP marginal 개선 (50~100ms) | S |
| 8 | `next experimental-analyze` 정기 실행 + CI bundle budget gate | scripts/ + CI | 회귀 방지 인프라 — 기능 자체 개선 아님 | M (FOLLOWUP) |
| 9 | image preload + `priority` 적용 audit (LCP 자산 식별) | apps/web/app/page.tsx + StickyNote.tsx | 마케팅 페이지 LCP 이미 372ms 라 영향 작음. 모바일 저속 네트워크에서 가치 | S |

---

## F. 예상 개선폭 (보수적 추정)

| 권고 | 현 측정 P75 | 목표 P75 | Δ | 신뢰도 |
|---|---|---|---|---|
| #2 + #3 ( `/notices` 캐싱 + 쿼리 통합 ) | desktop LCP 4016ms | < 800ms | **-3200ms (-80%)** | 높음 |
| #4 ( `/editor` dynamic import ) | First Load 590KB gzip | < 250KB | **-340KB (-58%)** | 중간 (코드 splitting 경계 디자인 필요) |
| #5 ( non-editor `'use client'` audit ) | First Load 225KB gzip | < 180KB | **-45KB (-20%)** | 중간 |
| #6 ( `/editor` RSC cache ) | desktop LCP 528ms | < 400ms | **-128ms (-24%)** | 중간 |
| 종합 후 (Speed Insights RUM 7일) | 실유저 LCP P75 unknown | < 2500ms 전 페이지 | RUM 데이터 확보 후 재평가 | — |

**주의**: 본 측정은 Playwright headless 환경에서의 일관된 측정. **실유저 P75 는 더 다양** (네트워크, 디바이스, 캐시 hit/miss). 권고 #1 (RUM 도입) 없이는 위 예상치도 검증 불가.

---

## G. Admin 측정 — 별도 휴먼 게이트

본 보고서는 **web 만** 측정. Admin (`storywork-editor-admin.vercel.app`) 은 다음 이유로 제외:

- `tmp/perf/admin-auth.json` storage state 만료 또는 미존재
- 로그인 인증이 필요한 모든 시나리오 → 사용자가 admin 로그인 후 `pnpm perf:admin:save-auth` 로 state 갱신 필요
- admin 측정은 별도 단계로 분리 — 사용자 인증 단계가 휴먼 게이트

**Admin 측정 진행 절차** (별도 위임 시):
1. 사용자: 브라우저로 admin 에 로그인
2. 사용자: `pnpm perf:admin:save-auth` 실행 → `tmp/perf/admin-auth.json` 생성
3. AI: `pnpm perf:admin:prod` 실행 → admin baseline 측정
4. AI: 별도 `docs/perf/<date>_admin-speed-audit.md` 작성

이전 admin baseline (`docs/perf/admin-navigation-baseline-2026-05-17.md`) 은 PERF-ADMIN-01 후속 측정으로, 본 audit 와 별개로 이미 존재.

---

## H. 사용자 결정 필요 — Step 2 진행 시 우선순위

본 보고서는 진단으로 종료. Step 2 (실제 개선 작업) 시작 시 다음 중 선택:

### 옵션 A — 핵심 1건만 수정 (가장 안전)
**Step 2-A**: `/notices` 캐싱 (E.1 #2) 만 단독 PR.
- 예상 영향: 1건 시나리오 LCP 4016ms → ~500ms
- 작업량 최소, 위험 최소
- 다른 4건은 이미 CWV Good 이므로 손대지 않음.

### 옵션 B — 진단 인프라 먼저 (중장기 시야 확보)
**Step 2-B**: Vercel Speed Insights 도입 (E.1 #1) 만 먼저.
- 7일간 RUM 데이터 누적 후 옵션 A 또는 C 결정.
- "실측 없이 추측 fix 금지" 룰 가장 충실.

### 옵션 C — 묶음 fix (효율 극대화, 위험 증가)
**Step 2-C**: E.1 (#1, #2, #3) 3건 동시 진행.
- 1개 큰 PR 또는 3개 작은 PR
- 회귀 위험 증가하지만 한 번에 baseline 향상 폭 큼.

### 옵션 D — 편집기 번들 수술 (큰 작업)
**Step 2-D**: E.2 #4 `/editor` dynamic import 본격 분할.
- 작업 추정 M (수일~1주), PR 여러 개로 분할
- 편집기 사용자 체감에 영향이 가장 큰 작업

**제안**: 옵션 B → 7일 후 옵션 A 또는 C → 옵션 D 순. 본 audit 자체가 옵션 B 의 시작이 되도록 RUM 미설치 사실을 D.3 에 명시.

---

## I. 참조 자료

- **측정 스크립트**: `scripts/perf-web-measure.ts` (신규)
- **실행 명령**: `pnpm perf:web:prod`
- **Raw 측정 데이터**: `tmp/perf/web-prod-2026-06-05T03-29-35.json`
- **Bundle raw 데이터**: `tmp/perf/web-bundle-2026-06-05.json`
- **이전 admin baseline**: `docs/perf/admin-navigation-baseline-2026-05-17.md`
- **회고 (룰 근거)**: `docs/retrospective/2026-05-15_16_ui_design_retrospective.md` §7.2 (특히 ①②④⑧)
- **회고 (인프라 5층)**: `docs/retrospective/2026-05-17_spacing_root_cause_resolution.md` §5

---

_측정일: 2026-06-05_
_HEAD: 1476d7b_
_작성: Claude Code (Opus 4.7) — `vercel-debug-perf` agent 위임 결과_
_본 PR 은 진단 보고서만 포함. 코드 fix 없음._

---

## J. Step 2 — 권고 #1+#2+#3 묶음 fix (2026-06-05)

§H 옵션 C 선택. /editor dynamic import (#4) 는 별도 PR 로 분리.

### J.1 적용 변경

| Commit | 권고 | 변경 |
|---|---|---|
| `314e4f5` | #1 | `@vercel/speed-insights ^2.0.0` 추가 + RootLayout `<SpeedInsights />` |
| `0d5eca7` | #3 (Prisma 통합) | `/notices` 3 쿼리 (pinned/regular/count) → 단일 `findMany` + JS split |
| `010ef57` | #2 (캐싱) | `apps/web/lib/notices.ts` 신규 `unstable_cache` (TTL 3600s, tag `'notices'`) + admin CRUD `revalidateTag('notices')` |

설계 결정:
- **`'use cache'` 대신 `unstable_cache`** — 기존 `company-info.ts` 와 동일 패턴 유지. Cache Components experimental 활성화 회피, 안정성 우선.
- **단일 `findMany` (옵션 A)** — notices 는 데이터량 적어 페이지네이션도 JS 에서 처리. N>500 이상으로 늘면 `$transaction` batching 으로 재검토.
- **`force-dynamic` 제거** — 데이터 레벨 캐시로 RSC 무효화 단축. `searchParams` 사용으로 여전히 dynamic 라우트지만 DB 라운드트립 0.

### J.2 After 측정 (Step 4 시점에 갱신)

> _Vercel deploy 완료 후 `pnpm perf:web:prod --filter notices` 재측정 결과로 채움._

| 시나리오 | Before (P75) | After (P75) | Δ |
|---|---|---|---|
| `/notices` desktop LCP | 4016ms | _측정 대기_ | _-_ |
| `/notices` mobile LCP | 1568ms | _측정 대기_ | _-_ |
| `/notices` First Load JS gzip | 223KB | _측정 대기_ | _-_ |
| `/` First Load JS gzip | 228KB | _측정 대기_ | _-_ |

목표:
- desktop LCP < 800ms (E.2 #2 목표)
- bundle size 변화 없음 (SpeedInsights 는 client-side defer 스크립트, 측정 영향 미미)

### J.3 후속

- **Step 3 (별도 PR)**: `/editor` dynamic import (E.2 #4). 회귀 위험 큼 → 단독 PR.
- **RUM 누적**: Speed Insights 7일 후 실유저 LCP P75 확인 → E.2 #5/#6 우선순위 재평가.
