# Source Audit Report — 2026-06-05

전 모노레포 오류/부채 전수 점검 결과.

---

## Before 측정값

| 지표 | 값 |
|---|---|
| typecheck | 0 errors (37/37 tasks) |
| lint | **1 task 실패** (`@storywork/ai-script#lint`: 10 errors) |
| test | **53 failed** / 498 total (445 passed) |
| build | 미실행 (typecheck 통과 기준) |
| check:css-source | OK |
| check:css-anti | OK |

---

## 카테고리별 Issues

### A. TypeScript 오류 — 0건

`pnpm typecheck` 37 tasks 전부 통과. `.ts` 파일 기준으로는 에러 없음.

### B. ESLint warning/error — HIGH (10 errors)

**B-1. `@storywork/ai-script#lint` 10 errors** — HIGH
- 원인: `packages/ai-script/src/` 디렉토리에 빌드 산출물(`.js`, `.d.ts`, `.js.map`)이 소스 `.ts`와 공존
- ESLint가 `.ts` 대신 컴파일된 `.js` 파일을 lint 대상에 포함
- 컴파일된 `.js`에는 `process`, `console` 등 Node.js globals가 있지만 ESLint 환경 설정에서 `no-undef: off`가 `.ts` 파일에만 적용됨
- 영향 파일:
  - `packages/ai-script/src/analyze.js` (process line 26, console line 108)
  - `packages/ai-script/src/llm/enhance.js` (process × 6, console × 2)
- 수정: 스트레이 `.js`, `.d.ts`, `.js.map` 파일 삭제 (총 9개 `.js` + 9개 `.d.ts` + 9개 `.map`)

**B-2. `packages/shared-schema/src/editor/v1.js` stray 파일** — MED
- 동일 패턴: 빌드 산출물이 src에 혼재
- ESLint ignores에 이미 `packages/shared-schema/src/editor/*.js` 패턴이 등록되어 있어 현재는 lint 통과 중
- 수정: 파일 삭제

### C. 테스트 실패 — HIGH (53건)

**C-1. 마케팅 페이지 테스트 53건 실패** — HIGH
- 영향 파일: `__tests__/marketing/landing.test.tsx`, `intro.test.tsx`, `features.test.tsx`, `showcase-derbyman.test.tsx`
- 근본 원인: `components/marketing/Footer.tsx`가 `async function Footer()`(RSC async Server Component)로 구현됨
  - `Footer`에서 `await getPublishedCompanyInfo()` 호출 → Prisma + `unstable_cache` 의존
  - jsdom 환경에서 async RSC를 동기 render로 실행하면 Suspense가 발생해 `<body><div /></body>` 렌더링
  - React 오류: "Footer is an async Client Component. Only Server Components can be async"
- 진단: 테스트가 `getPublishedCompanyInfo` / `prisma`를 mock하지 않아 실패
- 수정: 테스트 setup (`__tests__/setup.ts`) 또는 각 마케팅 테스트 파일에 `vi.mock('../../lib/company-info', ...)` 추가

**C-2. `packages/shared-schema/src/editor/v1.js` stray 파일** — LOW
- eslint ignores에 이미 처리됨

### D. CI gate 깨질 잠재 패턴 — 0건

- `check:css-source`: OK (3개 @source directive 모두 확인)
- `check:css-anti`: OK (universal reset 없음)
- ADR-0013/0014 위반 없음

### E. Dead code / 미사용 export — LOW

- `tmp/` 디렉토리 존재 (gitignore 확인 필요)
- `scripts/generate-llm-cache.mjs`에 `console.log` (스크립트 파일, 프로덕션 코드 아님 — 허용)
- `packages/shared-schema/src/editor/v1.js` stray artifact

### F. 보안 / runtime 안전성 — 0건 (critical)

- `console.log` production 노출: README 예시 및 스크립트 파일에만 존재 (프로덕션 소스 없음)
- `console.warn/error`는 eslint 허용(`no-console: ['warn', { allow: ['warn', 'error'] }]`)

### G. Schema / 데이터 일관성 — 미검사

- prisma validate/format: 로컬 DB 미연결로 drift diff 미실행
- Zod/Prisma mismatch: 별도 점검 필요 (FOLLOWUP 등재)

### H. 미커밋 / 추적되지 않은 파일 — 별도 보호

- `apps/admin/app/api/auth/totp-*`, `apps/admin/src/lib/totp/`: 의도된 미커밋 (작업 중), 보존

---

## 수정 우선순위

| 우선순위 | 항목 | 심각도 | 예상 fix |
|---|---|---|---|
| 1 | B-1: ai-script 스트레이 .js 파일 삭제 → lint 10 errors | HIGH | 파일 삭제 |
| 2 | C-1: 마케팅 테스트 53건 — Footer async mock 추가 | HIGH | setup.ts 또는 각 테스트 vi.mock 추가 |
| 3 | B-2/E: shared-schema/src/editor/v1.js 스트레이 파일 삭제 | MED | 파일 삭제 |

---

---

## After 측정값 (Step 6 — 수정 완료)

| 지표 | Before | After |
|---|---|---|
| typecheck | 0 errors | 0 errors |
| lint | **10 errors** (ai-script) | **0 errors** (37/37 tasks) |
| test | **53 failed** / 498 total | **0 failed** / 498 total |
| check:css-source | OK | OK |
| check:css-anti | OK | OK |

---

## 수정 완료 항목

### B-1 (HIGH) ai-script 스트레이 .js 파일 제거 → lint 10 errors 해소
- `packages/ai-script/src/` 에 혼재하던 컴파일 산출물 36개 파일 삭제 (`.js`, `.d.ts`, `.js.map`, `.d.ts.map`)
- 원인: `tsc` 가 과거 시점에 `noEmit: false` 모드로 잘못 실행되어 `src/` 안에 emit 한 것
- `.gitignore` 에 `packages/*/src/**/*.js` 패턴이 이미 있어 재발 방지됨
- commit: `ef97a11`

### C-1 (HIGH) 마케팅 테스트 53건 실패 → 0 failures
- 근본 원인: `Footer.tsx` 가 `async function` (RSC) 이라 `await getPublishedCompanyInfo()` → Prisma + `next/cache` 호출
- jsdom 환경에서 async RSC 를 동기 `render()` 로 실행하면 React Suspense 가 트리를 비워 `<body><div /></body>` 반환
- 수정: 4개 마케팅 테스트 파일에 `vi.mock('../../components/marketing/Footer', () => ...)` 동기 stub 추가
- commit: `ef97a11`

---

## 부채 등재 (미해소, FOLLOWUP)

| ID | 항목 | 심각도 | 영향 |
|---|---|---|---|
| FOLLOWUP-60 | eslint-plugin-react-hooks 미설치 — hooks deps 자동 감지 부재 | MED | hooks 오용 미감지 |
| FOLLOWUP-61 | ai-script src 스트레이 재발 방지 (.gitignore 이미 커버, CI 명시적 check 추가 여부) | LOW | 재발 시 lint 오류 |
| FOLLOWUP-62 | async RSC + jsdom 테스트 패턴 가이드라인 문서화 | LOW | 신규 async RSC 테스트 오류 재발 |
| FOLLOWUP-63 | prisma format cosmetic drift CI check 여부 결정 | LOW | schema 정렬 불일치 |

---

## 커밋 목록

| SHA | 내용 |
|---|---|
| `86fbf21` | docs(audit): 전체 소스 오류 진단 보고서 (Step 1) |
| `ef97a11` | fix(audit): high severity 항목 수정 (Step 2) |
| `c07e958` | chore(audit): medium/low 부채 FOLLOWUP 등재 (Step 3-4) |
