# Admin Navigation Timing Baseline — 2026-05-17

## 측정 환경

- HEAD: bf3e30e
- PERF-ADMIN-01 (requireRole cache + templates select payload 축소) 개선 후 측정
- 환경: prod / darwin / Chromium (Playwright bundled) / Node v22.22.2
- 뷰포트: 1440×900
- 반복 횟수: 5회
- 측정 도구: `scripts/perf-admin-measure.ts` (Navigation Timing Level 2 + paint entries)
- prod URL: `https://storywork-editor-admin.vercel.app`

### 중요 측정 한계

s2~s5 시나리오는 인증 storage state 없이 실행되어 보호 페이지 진입 시
middleware가 `/login` 으로 리다이렉트합니다. 수집된 timing은 **리다이렉트 응답 + login 페이지**
기준이며, 실제 인증 후 보호 페이지 (resources/templates 등) 의 RSC payload/DB 쿼리 시간은
포함되지 않습니다.

따라서 s2~s5 결과는 "미들웨어 + Vercel edge 응답 속도"를 반영하고,
실제 페이지 콘텐츠 로딩 시간은 인증 state 저장 후 재측정이 필요합니다.

s1 (/login 페이지)은 공개 페이지로 실제 렌더링 timing이 수집됩니다.

---

## 시나리오별 P50/P75/P95 (ms) — prod, 5회 측정

### [s1] /login → /audit (login 페이지 실측)

| 지표 | P50 | P75 | P95 | Min | Max |
|---|---|---|---|---|---|
| TTFB | 211ms | 261ms | 295ms | 171ms | 295ms |
| FCP | 968ms | **1028ms** | 1276ms | 724ms | 1276ms |
| LCP | 0ms | 0ms | 0ms | 0ms | 0ms |
| TTI | 856ms | 975ms | 1164ms | 607ms | 1164ms |
| DCL | 856ms | 975ms | 1164ms | 607ms | 1164ms |
| Total | 1095ms | 1480ms | 1547ms | 1052ms | 1547ms |

> LCP=0: login 페이지의 largest-contentful-paint 엔트리가 networkidle 후 수집 안 됨
> (Playwright navigation timing 수집 타이밍 이슈 — 실제 LCP는 FCP와 유사하게 추정).

### [s2] /audit → /resources (미들웨어 리다이렉트 기준)

| 지표 | P50 | P75 | P95 | Min | Max |
|---|---|---|---|---|---|
| TTFB | 109ms | 113ms | 114ms | 104ms | 114ms |
| FCP | 216ms | 220ms | 224ms | 212ms | 224ms |
| TTI | 215ms | 218ms | 225ms | 209ms | 225ms |
| Total | 216ms | **218ms** | 225ms | 209ms | 225ms |

### [s3] /resources → /templates (미들웨어 리다이렉트 기준)

| 지표 | P50 | P75 | P95 | Min | Max |
|---|---|---|---|---|---|
| TTFB | 110ms | 111ms | 117ms | 102ms | 117ms |
| FCP | 224ms | 224ms | 236ms | 212ms | 236ms |
| TTI | 224ms | 224ms | 231ms | 216ms | 231ms |
| Total | 225ms | **227ms** | 232ms | 216ms | 232ms |

### [s4] /templates → /formats (미들웨어 리다이렉트 기준)

| 지표 | P50 | P75 | P95 | Min | Max |
|---|---|---|---|---|---|
| TTFB | 108ms | 109ms | 218ms | 105ms | 218ms |
| FCP | 216ms | 224ms | 232ms | 204ms | 232ms |
| TTI | 211ms | 220ms | 232ms | 200ms | 232ms |
| Total | 211ms | **221ms** | 232ms | 207ms | 232ms |

### [s5] /resources/review 검수 큐 (미들웨어 리다이렉트 기준)

| 지표 | P50 | P75 | P95 | Min | Max |
|---|---|---|---|---|---|
| TTFB | 106ms | 108ms | 115ms | 104ms | 115ms |
| FCP | 212ms | 220ms | 252ms | 208ms | 252ms |
| TTI | 209ms | 213ms | 252ms | 209ms | 252ms |
| Total | 213ms | **219ms** | 252ms | 209ms | 252ms |

---

## P75 목표 수립

| 지표 | 목표 | 현재 P75 (s1 기준) | 달성 여부 | 근거 |
|---|---|---|---|---|
| TTFB | ≤ 400ms | 261ms | 달성 | Supabase Edge 왕복 + RSC 직렬화 허용치 |
| FCP | ≤ 800ms | **1028ms** | 미달 +228ms | Core Web Vitals Good 기준 |
| LCP | ≤ 2,500ms | (미수집) | 재측정 필요 | 수집 방식 개선 후 재측정 |
| TTI | ≤ 1,500ms | 975ms | 달성 | 관리자 인터랙션 가능 시점 |
| DCL | ≤ 1,500ms | 975ms | 달성 | 서버 데이터 완전 수신 후 DOM 파싱 |
| Total | ≤ 2,500ms | 1480ms | 달성 | 4s 사용자 체감 대비 목표 |

> 미들웨어 리다이렉트 기준(s2~s5) 모든 지표 P75 ≤ 300ms — 목표 대비 매우 우수.

---

## Critical Path 분석

### 사용자 보고 "4초" 실측 비교

PERF-ADMIN-01 이전 상태에서 사용자가 체감한 4초 지연은
다음 직렬 호출이 겹친 결과로 추정됩니다:

1. middleware `getUser()` Supabase Edge 왕복 (~200ms)
2. `requireRole()` → `getAdminUserByEmail()` Service Role DB 조회 (~100ms)
3. `resources/page.tsx` 내 facets 4쿼리 직렬 실행 (~1,000ms+, PERF-ADMIN-01 이전)
4. RSC payload 직렬화 + 클라이언트 hydration (~500ms)

PERF-ADMIN-01 에서 완료된 개선:
- `requireRole` `cache()` 래핑으로 동일 요청 내 중복 getUser 제거
- resources facets 4쿼리 → 1쿼리(groupBy 합산)로 병렬화
- templates page: `$queryRaw` JOIN 쿼리로 N+1 제거

현재 측정 결과 (prod, 인증 후 실제 페이지 기준 추정):
- middleware + Vercel edge 응답: TTFB P75 ≈ 110~260ms (목표 이내)
- login 페이지 FCP P75: 1028ms (목표 800ms 대비 +228ms 초과)
- 인증 후 보호 페이지 실측은 미완료 — storage state 재측정 필요

### 병목 Top 3

1. **login 페이지 FCP 지연 (P75 1028ms, 목표 800ms 대비 +228ms)**
   Vercel에서 제공되는 `/login` 정적 페이지 기준. Pretendard Variable woff2 폰트
   (~270KB, preload=true) 파싱 완료 전까지 텍스트 렌더 지연이 FCP를 끌어올림.
   `font-display: swap` 이 이미 적용되어 있으나, woff2 파일이 critical render path에
   포함되는지 확인 필요.

2. **인증 후 보호 페이지 DB 쿼리 시간 (미측정)**
   s2~s5 는 인증 리다이렉트 기준이므로 실제 Prisma 쿼리(resources groupBy + findMany,
   audit findMany + user join, templates rawQuery JOIN 등) + RSC 직렬화 시간 미포함.
   인증 storage state 저장 후 재측정 시 실제 "4초 개선 효과"를 정량적으로 확인 가능.

3. **LCP 수집 실패 (전 시나리오 LCP=0)**
   `largest-contentful-paint` PerformanceEntry 가 Playwright networkidle 후
   800ms 대기에서도 수집되지 않음. paint observer가 navigation 완료 전에 이미 firing
   되었을 가능성 또는 LCP 요소가 background-image/SVG여서 미집계. PerformanceObserver를
   page load 초기에 등록하는 방식으로 스크립트 개선 필요.

---

## 목표 미달 항목

- **[s1] /login 페이지: FCP P75=1028ms** (목표 800ms, 초과 +228ms)
  원인 추정: Pretendard woff2 폰트가 critical render path에 포함
  완화 방향: `font-display: optional` 검토 또는 한글 subset woff2 분리

---

## 다음 perf 작업 후보 (PERF-ADMIN-03+)

- **[PERF-ADMIN-03]** 인증 storage state 저장 후 보호 페이지(resources/templates/audit) 재측정
  — RSC payload + Prisma 쿼리 실측값 확보 및 "4초 개선 효과" 정량화
- **[PERF-ADMIN-04]** login 페이지 FCP 개선 — Pretendard woff2 font preload 전략 최적화
  (`font-display: optional` 또는 한글 subset 분리)
- **[PERF-ADMIN-05]** LCP 수집 방식 개선 — `PerformanceObserver` 를 page navigate 직후
  등록하는 패턴으로 `scripts/perf-admin-measure.ts` 업데이트
- **[PERF-ADMIN-06]** Lighthouse CI 통합 — 회귀 자동 감지 (별도 PERF-CI follow-up)

---

## 재측정 가이드 (인증 후 실측)

```bash
# 1. auth state 저장 (브라우저 창에서 한 번 수동 로그인, 또는 환경변수)
PERF_ADMIN_EMAIL=your@email.com PERF_ADMIN_PASSWORD=yourpass pnpm perf:admin:save-auth

# 2. local dev 서버 실행
pnpm --filter @storywork/admin dev

# 3. local 측정 (인증 후 실제 페이지)
pnpm perf:admin

# 4. prod 측정
pnpm perf:admin:prod
```

저장된 `tmp/perf/admin-auth.json` 은 `.gitignore` 에 의해 커밋되지 않습니다.

---

_측정일: 2026-05-17 | HEAD: bf3e30e | 스크립트: scripts/perf-admin-measure.ts_
