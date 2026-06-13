# Roadmap — 오토파일럿 작업 큐

> 이 파일은 **단순한 체크리스트**다. orchestrator 는 위에서 아래로 미완 항목을 픽한다.
> 각 항목 형식: `- [ ] [ID] 제목 — DoD 한 줄 — @책임에이전트`

---

## M0 — Bootstrap

- [x] [M0-01] pnpm + Turborepo 모노레포 초기화 — `pnpm i && pnpm build` 무오류 — @architect ✅ 2026-04-26 (커밋 ed7c2db..7c9d4e4)
- [x] [M0-02] tsconfig.base + ESLint(import/no-restricted-paths) — 패키지 역참조 시 lint 실패 — @architect ✅ M0-01 에 포함됨 (※ eslint-import-resolver-typescript 추가 권고 → 후속 이슈)
- [x] [M0-03] Supabase 로컬 + Prisma schema v1 — RLS 베이스라인 + pgvector + 마이그레이션 적용 검증 — @architect ✅ 2026-05-04
  - [x] Phase B (코드): Prisma v1(16 모델·8 enum·pgvector) + Zod 19파일 + RLS 정책 + ivfflat 3개 + 앱 env.ts 3개 + LICENSE.json 파싱. 45 tests pass. (커밋 f055038..053b60b)
  - [x] Phase A (실행): OrbStack(Docker 대안) 설치 → `supabase start` 11 컨테이너 healthy → `db reset` 으로 init 마이그레이션 적용 → 16 테이블 + 8 enum + pgvector 0.8.0 + ivfflat 3 + RLS 활성 11 + 정책 15 + updated_at 트리거 15 검증 → Prisma introspect 16 모델 인식 → .env.local 자동 생성
- [x] [M0-04] 디자인 토큰 + shadcn 베이스 + Storybook — 토큰/기본 컴포넌트 가시화 — @ui-designer ✅ 2026-04-26 (커밋 030e466..0292375). 토큰 8종 + 컴포넌트 5개(Button/Input/Card/Dialog/Sheet) + Storybook 5스토리 + ThemeProvider, axe a11y 0 위반
- [ ] [M0-05] CI(lint/typecheck/test/build) GitHub Actions — main 브랜치 보호 + 5개 잡 green — @architect
- [ ] [M0-06] Sentry/PostHog 부트스트랩 — 두 앱에서 테스트 이벤트 수신 — @architect

## M1-08 — UI/UX 대대적 개선 (Canva + Storige 기준) ✅ 2026-05-06

- [x] [M1-08a] 디자인 토큰 + Toast + LoadingOverlay + Tooltip — @ui-designer ✅ (커밋 3a169dd, 3be6c33)
- [x] [M1-08b] TopBar 재설계 (FilenameInline / PageIndicator / AutoSaveIndicator / DownloadMenu) — @ui-designer ✅ (커밋 3a8cdd4, 443e74c)
- [x] [M1-08c] ToolBar 11종 + FeatureSidebar 슬라이드 패널 + Background/Shape 활성 — @ui-designer ✅ (커밋 b95951d)
- [x] [M1-08d] RightPanel(Properties/Layers 탭) + ControlBar(타입별 가변) + LayerPanel 재작성 — @editor-engineer ✅ (커밋 bedf71c..149b47b)
- [x] [M1-08e] EmptyCanvasHint + Drag&Drop 이미지 + Footer(페이지/줌) + FloatingObjectBar + CanvasContextMenu — @editor-engineer ✅ (커밋 3e9026a)
- [x] [M1-08f] Command Palette ⌘K + 단축키 모달 ? + 모바일 BottomSheet 11종 그리드 통합 — @ui-designer ✅ (커밋 89f3005)

누적 통계: 신규 컴포넌트 15개 + 훅 5개 + 타입/스토어 3개. 142 tests pass. /editor First Load 398kB.

## M1 — Editor Core MVP

- [x] [M1-01] `editor-core` 패키지 스캐폴드 + fabric v6 어댑터 — 헤드리스 단위 테스트 통과 — @editor-engineer ✅ 2026-05-05 (커밋 f3e5c83..02e3fb6) — 67 tests pass, 100객체 라운드트립 157ms (<200ms 임계), 5 골든 라운드트립 100%
- [x] [M1-02] Schema v1 + 라운드트립(JSON ↔ fabric) — 골든 파일 5개 통과 — @editor-engineer ✅ M1-01 에 포함됨 (5 골든: empty/single-pose/pose-with-bg/grouped/locked)
- [x] [M1-03] `editor-layers` — 레이어 트리/잠금/그룹 — @editor-engineer ✅ 2026-05-05 (커밋 ed8091c) — 85 tests pass, 골든 3개 라운드트립, fabric 양방향 동기화, lock/hidden propagation
- [x] [M1-04] `editor-history` Command + 100스텝 라운드트립 — @editor-engineer ✅ 2026-05-05 (커밋 a44dcd5) — 63 tests, 100-step random sequence undo/redo OK, coalesce 5→1, OT slot, recursive lock/hidden undo
- [x] [M1-05] `editor-export` PNG/JSON — 비주얼 회귀 5장 — @editor-engineer ✅ 2026-05-05 (커밋 4468324) — 43 tests pass, 5 golden PNG visual regression (pixelmatch diff=0), DirtyTracker debounce autosave, PDF mock interface
- [x] [M1-06] `apps/web` 빈 페이지 편집기 셸 — @editor-engineer + @ui-designer ✅ 2026-05-05 (커밋 b437198) — TopBar/ToolPalette/Inspector/LayerPanel/ExportMenu, undo 단축키, autosave (localStorage)
- [x] [M1-07] 모바일 인스펙터 BottomSheet — @ui-designer ✅ 2026-05-05 (커밋 df9f164..d2a5f16) — 3-snap (peek/half/full) + 3 탭(Tools/Inspector/Layers), ResizeObserver 3중 가드(BUG-013), getEventPoint(BUG-014), visualViewport 키패드 동기화, 44px 타겟, SELECT-1 함정 회피

## M2 — Pose Library (PNG 1차) ✅ 핵심 5건 완료, 마무리 3건 보류

- [x] [M2-01] `scripts/ingest-poses.ts` PNG 파이프라인 — `LICENSE.json` 폴더 디폴트 로딩 + 매직바이트 + EXIF strip + sharp 재인코딩 + WebP 파생본 ✅ 2026-05-05 (커밋 f7a440a) — 1,260개 풀 적재 4분 20초, 0 실패, Storage 171.8MB, DB 1,270건
- [x] [M2-02] 키포인트 **3점 자동 추정**(head/mouth/center) — sharp 알파 채널 분석, confidence < 0.5 검수 큐 ✅ 2026-05-05 (커밋 6feb6ca) — 16 tests pass
- [x] [M2-03a] **파일명 키워드 사전(1차 무료 태깅)** — `packages/ai-recommend/data/filename-action-dict.ko.json` 120 룰 ✅ 2026-05-05 (커밋 0cc2d13) — **매칭률 98.7%** (목표 70% 대비 +28.7%p)
- [ ] [M2-03b] 미매칭 자산만 Claude API 2차 태깅(캐시) — 우선순위 ↓ (매칭률 98.7% 라 ~17건만, 신규 자산 fallback 용으로만) — @pose-curator + @scene-analyzer
- [x] [M2-04] pgvector 인덱스(시각+텍스트 임베딩) + 시맨틱 검색 API — `embed.ts`(voyage/openai/mock) + `POST /api/search/poses` ✅ 2026-05-05 (커밋 a886620) — 45 tests, 50쿼리 골든셋. **mock 임베딩**으로 동작, 실제 의미적 검색은 Voyage/OpenAI API 키 도입 후 측정
- [x] [M2-05] 검색 UI(필터: bodyType/view/action/mood, format, lowDpi 토글) — `PosePanel` 활성, 무한 스크롤 + 드래그/클릭 캔버스 추가 ✅ 2026-05-05 (커밋 184eec4) — 19 tests, lowDpi 자동 1/2 크기 (ADR-0011a)
- [x] [M2-06] **slug 정규화** — 한글/공백/괄호 → URL-safe ✅ M2-01 에 포함 (`packages/shared-utils/src/slug.ts`, NFC/NFD 처리)
- [x] [M2-07] **lowDpi 슬롯 제약** ✅ 2026-06-03 — `ai-layout` 가 lowDpi 자산을 페이지 1/2 이하 슬롯에만 배치 (ADR-0011a). M4-03 step 2+3 에 통합. effectiveDpi 계산 + size-violation/dpi-warning/dpi-error 3단계. `packages/ai-layout/src/constraints/low-dpi.ts` (커밋 `1c5619b`) — @layout-composer
- [ ] [M2-08] 키포인트 검수 편집기(관리자) — 클릭으로 누락 점 보강 — @admin-builder + @editor-engineer (**M3-04 Resource CRUD 안에 통합** 권장)
- [ ] [M2-09] PNG 색상 변경 보조: `tintMaskUrl` 기반 BlendColor 데모 — @editor-engineer (현재 자산 모두 마스크 미보유 → 우선순위 ↓)

## M3 — Admin Console ✅ (6/6 완료, 2026-05-07)

- [x] [M3-01] `apps/admin` 부트스트랩 + 별도 도메인 + 2FA — Supabase Auth + TOTP (otplib) + 4 admin role (superadmin/curator/support/readonly) + 12h TOTP 쿠키 — `fc89d44`
- [x] [M3-02] DataTable/EntityForm/ReviewQueue 공용 컴포넌트 — tanstack-table v8 + RHF+Zod v4 + 카드그리드 키보드 j/k/a/r + BulkActionBar undo토스트 + 11 Storybook — `1b08d71`
- [x] [M3-03] Format CRUD — B5/A5/정사각/세로형 프리셋 + audit.ts 헬퍼 + prisma 싱글톤 — `c8d2ab8`
- [x] [M3-04] Resource CRUD + 검수 큐 + 일괄 액션 + 키포인트 보정 + PNG 업로드 (sharp EXIF strip + WebP variants) — `b4d1034`+`e58730c` (M2-08 키포인트 검수 통합 완료)
- [x] [M3-05] Template + TemplateSet 빌더 — SlotCanvas (SVG 드래그/8핸들 리사이즈/키보드) + TemplateSet 순서 변경 + cover 지정 — `e220aa5`
- [x] [M3-06] Audit Log 패널 — DataTable + 펼침 JSON diff viewer + 필터 (action/entityType/날짜) + facets — `f615e18`

## M4 — AI Pipeline

### M4-00 — Character 시스템 ✅ 2026-06-03

- [x] [M4-00-01] Character 모델 + Resource FK + RLS — prisma migrate deploy 완료 — @architect ✅ `628de83`
- [x] [M4-00-02] 더미맨 자동 매핑 스크립트 — 1270건 100% 매핑 (idempotent) — @architect ✅ `9764c65`
- [x] [M4-00-03] Admin Character CRUD — /characters + /characters/new + /characters/[id] — @architect ✅ `b039ab8`

### M4-01 — ai-script 분석기 ✅ 2026-06-03

- [x] [M4-01-01] analyze() 코어 + 형식 자동감지 (5형식) + SceneMeta — rule-only + LLM stub — @architect ✅ `49a224b`
- [x] [M4-01-02] 골든셋 20 + F1 측정 — 룰-only: format 0.900, scene F1 0.899, char F1 1.000 — @architect ✅ `4556bfb`
- [x] [M4-01-03] LLM 보강 — Vercel AI Gateway + claude-sonnet-4-6 + prompt caching — @scene-analyzer ✅ 2026-06-12 검증 — 코드는 이미 완성(`enhance.ts`/`system-prompt.ts` inlined, 커밋 a4adfc5+6a61857+de37d35), roadmap 만 미체크였음. `STORYWORK_LLM=1 STORYWORK_LLM_CACHE=1 pnpm --filter @storywork/ai-script test f1-score-llm` → **장면 F1 평균 0.899 ≥ 0.85 PASS** (캐시 20건 커밋, 키 불요·결정론·$0). CI 는 STORYWORK_LLM=0 으로 LLM 미호출(비용 보호). 라이브 LLM 은 AI_GATEWAY_API_KEY 발급 후 선택 활성(휴먼 게이트).

- [x] [M4-02] `ai-recommend` 포즈/배경/말풍선 추천 — 만족도 100.0% (16/16, 목표 ≥ 70%) — @scene-analyzer ✅ 2026-06-03 (→ Step 1~5 커밋 참조)
- [x] [M4-03] `ai-layout` compose() + 결정론 시드 ✅ 2026-06-03 — 충돌 0, safe 침범 0. 페이지 분할 5 규칙 (R1~R5) + Template 매칭 + Slot 배치 + lowDpi 제약 (M2-07 통합). 골든 5 시나리오 + lowDpi E2E 102/102 tests pass. `POST /api/script/compose` + 문서 2종 (`ai-layout-compose.md` + `full-pipeline.md`). 커밋: `5517071`+`1c5619b`+`5000889`+`9c6a2ea` — @layout-composer
- [x] [M4-04] 사용자 흐름: 대본 → 자동 페이지 N개 — E2E 통과 ✅ 2026-06-03 — commit `14004b3`+`7e6c9f3`+`b9088ee`+`778fa0b`. `/api/script/full-pipeline` + `/editor/import` Wizard + `useProjectImport` + E2E 4 시나리오 (A~D), 63 tests green — @layout-composer + @editor-engineer
- [x] [M4-05] alternatives UI(한 클릭 교체) — 모바일에서도 동작 — @ui-designer ✅ 2026-06-03
  - useAlternativesStore (Zustand+Immer, 14 단위 테스트)
  - AlternativesSection: 2열 카드 그리드 (pose/bg/bubble/wordFx), confidence 배지, "현재" 표시
  - RightPanel Properties 탭 하단 통합 (desktop)
  - MobileBottomSheet Inspector 탭 통합 (mobile, snap half 에서 visible)
  - EditorShell: 선택 변경 시 alternatives 자동 로드 + handleApplyAlternative (history command 통합)
  - GET /api/projects/[id]/alternatives (재진입 시 복원 API)
  - 커밋: `292b857`+`ebc1f28`+`6c7af1a`+`b2920cd`

## DESIGN-SYS — Admin/Editor Nike 안정화 (2026-05-15)

- [x] [DESIGN-01] 루트 `DESIGN-nike.md` SSOT 추가 — admin/editor 작업자가 같은 디자인 기준을 읽음 — @ui-designer
- [x] [DESIGN-02] admin `mkt-*` 직접 사용 제거 — `rg -n "mkt-|--mkt-" apps/admin` 0건 — @admin-builder
- [x] [DESIGN-03] editor chrome Nike-neutral bridge — `/editor` scope `--editor-*` 가 ink/canvas/soft-cloud/hairline 기준으로 동작 — @editor-engineer
- [x] [PERF-ADMIN-01] admin navigation 4초 지연 1차 개선 — auth cache + query payload 축소 + route loading skeleton — @architect
- [x] [DESIGN-04] 시각 회귀 자동화 — `/login`, `/reset-password`, `/403`, admin nav, `/editor` desktop/mobile snapshots — @qa-tester ✅ 2026-05-17 (커밋 25e619a + a0e00f0) — 12개 baseline CI (editor 2개 로컬 전용), pixelmatch compare, CI green
- [x] [PERF-ADMIN-02] 실제 navigation timing 측정 — local/prod waterfall 로 P75 목표 수립 — @qa-tester + @architect ✅ 2026-05-17 — `scripts/perf-admin-measure.ts` + `scripts/perf-admin-save-auth.ts` + `docs/perf/admin-navigation-baseline-2026-05-17.md`. prod 5회 측정: TTFB P75 261ms / FCP P75 1028ms(목표 초과) / Total P75 1480ms. 인증 후 보호 페이지 재측정(PERF-ADMIN-03) 필요.
- [ ] [PERF-ADMIN-03] (P1) 인증 storage state 저장 후 보호 페이지 재측정 — `pnpm perf:admin:save-auth` 로 admin storage state 캡처 후 `pnpm perf:admin` 으로 audit/resources/templates Prisma 쿼리 실제 시간 포함된 P75 도출 — @architect
- [ ] [PERF-ADMIN-04] (P2) login 페이지 FCP 개선 — 현재 P75 1028ms (목표 800ms, +228ms 초과). Pretendard Variable woff2 subset 분리 또는 `font-display: optional` — @ui-designer
- [ ] [PERF-ADMIN-05] (P2) LCP 수집 방식 개선 — 현재 LCP=0 미수집. PerformanceObserver 를 page load 초기 등록 + buffered=true 로 변경 — @architect
- [ ] [PERF-ADMIN-06] (P2) Lighthouse CI 통합 — perf 회귀 자동 차단 (PERF-ADMIN-03 후속) — @qa-tester + @architect
- [x] [PERF-WEB-01] (P0) web speed audit Step 1 진단 — 5 시나리오 × 2 viewport × 3 반복 측정 — @architect ✅ 2026-06-05 (`dab88d4`, `docs/perf/2026-06-05_web-speed-audit.md`) — /notices desktop LCP P75 4016ms (Poor), /editor First Load 590KB. 권고 #1~#9.
- [x] [PERF-WEB-02] (P0) Step 2 묶음 fix #1+#2+#3 — Speed Insights RUM + /notices Prisma 통합 + unstable_cache — @architect ✅ 2026-06-05 (`314e4f5`, `0d5eca7`, `010ef57`) — 데스크탑 LCP 4016ms → < 800ms 목표
- [x] [PERF-WEB-03] (P1) Step 3 — `/editor` dynamic import — @architect ✅ 2026-06-05 — `EditorShellClient` 가 `EditorShell` 을 `next/dynamic({ ssr: false })` 로 lazy 로드해 fabric.js + editor-* 8개 패키지를 라우트 First Load JS 에서 분리. **First Load 590KB → 104kB** (route 1.68kB + shared 103kB, 목표 ~250KB 초과 달성). 셸 스켈레톤 추가(CLS 최소화). 런타임 검증: desktop+mobile 편집기 정상 마운트(fabric canvas 초기화, FormatPicker 표시, 콘솔 에러 0), 498 tests green. 잔재 `page 2.tsx` 정리.
- [ ] [PERF-WEB-04] (P2) Speed Insights 7일 누적 후 실유저 RUM 분석 → E.2 #5/#6 우선순위 재평가

## M5 — Text/Bubble/Effects/Templates

- [x] [M5-01] `editor-text` 한글 줄바꿈/금칙어 + textbox 변형 — `0243653` + `d17f923` — Pretendard webfont + 금칙어 73자 + splitByGrapheme + TextSection ControlBar
- [x] [M5-02] 말풍선 꼬리 자동 화자 추적 — `3cff7ca` — `editor-bubble` 신규 (5 모양 + 화자 추적, 33 tests)
- [x] [M5-03] `editor-effects` 워드효과 45종 + 필터 — `2528201` — 8 카테고리 (shadow/outline/glow/gradient/metallic/transform/background/pattern), WordFxPanel, 모바일 fallback, 81 tests
- [x] [M5-04] `editor-template` 템플릿 적용/저장 — `d43e45f` + `28b3dfe` — 5 프리셋 + applyTemplate/fillSlot/clearSlot + 46 tests

## 📄 페이지 시스템 (신규 카테고리, 2026-05-11) ✅

- [x] [PAGE-01] 페이지 데이터 모델 + Zustand Store (usePageStore) — `4bf6ebc` — Project/Page CRUD + immer
- [x] [PAGE-02] localStorage 영속화 (5s debounce + 복구 토스트) — `4bf6ebc` — page-persistence.ts
- [x] [PAGE-03] FormatPickerModal (4 인라인 프리셋: B5/A5/정사각/세로형) — `4bf6ebc` — dismissable=false
- [x] [PAGE-04] PagePanel (RightPanel 3번째 탭 + 썸네일 + DnD + ⋯ 메뉴) — `4bf6ebc`
- [x] [PAGE-05] Footer dot/숫자 인디케이터 (5개 이하 dot, 6+ 숫자) + 단축키 ⌘→/⌘←/⌘⇧N — `4bf6ebc` + `08608fa`
- [x] [PAGE-06] 4 critical bug fix (FabricImage 복원 + 배경 z-order + EmptyHint after:render + lowDpi 톤다운) — `c08ef87` + `08608fa` + `10020e5`
- [x] [PAGE-07] FOLLOWUP-42 Format remount (formatToPx + StoryCanvas.setFormat + 줌 fit + Footer 사이즈) — `e8b6815`
- [x] [PAGE-08] FOLLOWUP-46 모바일 PagePanel (BottomSheet 4번째 탭) — `e8b6815`

## M6 — POD PDF

- [x] [M6-01] `pdf-engine` 벡터 빌더 + 표지 — 결정론 출력 — @pdf-publisher ✅ 2026-06-04 (커밋 6c88485..969e0eb) — buildPdf() ADR-0007 결정론(seed→ISO, useObjectStreams=false), 16p 로컬 8~17ms, TrimBox/BleedBox, 표지 6종 톤, 단위 테스트 28개, POST /api/projects/[id]/publish, docs/m6-pod-pdf/
- [x] [M6-02] `apps/workers` Inngest 잡 + 진행 % 푸시 — 16p ≤ 6초 — @pdf-publisher + @architect ✅ 2026-06-04 — pdfBuildJob(inngest/pdf-build), /api/inngest serve(), /publish?async=true→202, Supabase Realtime pdf-jobs:{jobId}, usePdfJobProgress 훅, PdfProgressToastContainer, 단위테스트 6개, docs/m6-pod-pdf/async-jobs.md
- [x] [M6-03] preflight 검증기 — 인쇄소 3사 통과 — @pdf-publisher + @qa-tester ✅ 2026-06-04 — 3사 프로필(bookprint-korea/instaprint/comicmaker) + 6룰(bleed/safe/dpi/font/color/page-count) + preflight() API + buildPreflightPdf() + POST /api/projects/[id]/preflight + PreflightModal. ADR-0011a lowDpi 통합. 96 tests pass. 커밋: `460a666`+`ca3faa8`+`7aed356`+`5377a31`
- [x] [M6-04] 인쇄소 사양 프리셋 + 등록 UI — 관리자 추가 가능 — @admin-builder + @pdf-publisher ✅ 2026-06-04 — PrinterProfile DB 모델 + Zod 스키마 + seed 3건(isSystem=true) + admin /printers CRUD(DataTable/EntityForm/delete guard) + API `GET/POST /api/admin/printers` + `GET/PATCH/DELETE /api/admin/printers/[id]` + ProfileLoader 인터페이스 + Prisma DB 어댑터 + preflight() DB 우선 로드 + in-memory fallback + PreflightModal 인쇄소 선택 드롭다운 + /api/printers 공개 목록 API + 단위 테스트 16개. 커밋: `884028f`+`f4237da`+`fdb3746`+`8026ba0`

**M6 마일스톤 4건 모두 완료** (M6-01 ~ M6-04)

## M7 — Creator Mode + Billing

- [ ] [M7-01] Stripe 연결 + Webhook 멱등 — 재처리 테스트 — @architect
- [ ] [M7-02] 구독 플랜 게이트(업로드 한도/공유 토글) — RLS + 미들웨어 이중 — @architect
- [ ] [M7-03] 마이데이터 패널 — 편집기 드래그 인서트 — @admin-builder + @editor-engineer
- [ ] [M7-04] 결제/요금 페이지 — 모바일 대응 — @ui-designer

## M8 — Social

- [ ] [M8-01] OG 이미지 자동 생성(nano-banana 2) — Lighthouse SEO 100 — @ui-designer
- [x] [M8-02] 공모전 시즌 모듈 + admin CRUD — 사용자 목록/상세 페이지 완료, pg_cron 자동 동결은 BOARD-05로 별도 분리 — @admin-builder ✅ 2026-06-03 (commit 1ea593f)
- [x] [M8-03] 뽐내기 갤러리 + 좋아요/댓글 — 무한 스크롤(cursor-based) + Reaction(like/heart/wow) + 댓글 CRUD 완료 — @ui-designer ✅ 2026-06-03 (commit 690a145)
- [ ] [M8-04] SNS 공유 카드(카카오/X/페북) — 검증 — @ui-designer

## BOARD — 공모전/공지/Q&A/갤러리 (2026-06-03)

- [x] [BOARD-01] Notice 모델 + 사용자 페이지(/notices, /notices/[id]) + admin CRUD — @architect ✅ 2026-06-03 (commit 81ee2a8 + 690a145 + 1ea593f)
- [x] [BOARD-02] Inquiry(Q&A) 모델 + 사용자 폼(/contact) + 마이페이지(/mypage/inquiries) + admin 응답 큐 — @architect ✅ 2026-06-03
- [x] [BOARD-03] 공모전 시즌 사용자 페이지(/contest, /contest/[seasonId]) + admin — @architect ✅ 2026-06-03
- [x] [BOARD-04] 갤러리(/showcase) + 댓글 + Reaction + admin 모더레이션 — @architect ✅ 2026-06-03
- [ ] [BOARD-05] pg_cron 자동 동결 (시즌 closesAt 지나면 출품 자동 잠금) — @architect (P1, M8-02 후속)
- [x] [BOARD-06] FAQ 별도 페이지 + 카테고리 — @ui-designer ✅ 2026-06-12 — `lib/faq-data.ts` 단일 소스(5 카테고리·18문항)를 랜딩 FAQ(featured 8)와 `/faq` 전용 페이지가 공유. /faq: 카테고리 앵커 칩 네비 + 색구분 섹션 + 아코디언(스프링 +→×) + FAQPage JSON-LD(SEO) + sitemap/Footer 링크. 최근 기능(표지·신고·탈퇴 파기) 문항 보강. 신규 테스트 6, web 545 green.
- [x] [BOARD-07] 신고 큐 (Comment/Showcase 신고 접수 + admin 처리) — @admin-builder ✅ 2026-06-12 — Report 모델 + 3 enum + Showcase.hidden(마이그레이션 `20260613000000_report_queue`, prod 적용). 접수: POST /api/reports(로그인 필수·세션 reporterId·멱등 createMany skipDuplicates) + ReportButton(사유 6종 모달, /showcase/[id] 작품 + 댓글 아이콘) + 공개 목록 3곳 hidden 필터. admin /reports: status 탭 큐 + 누적 신고수(groupBy) + hide(숨김+같은 대상 일괄 resolved)/dismiss/reviewing + recordAudit. 신규 테스트 13.

## LEGAL-OPS — 한국 법규 출시 필수 (P0, 출시 전 완료 필수)

- [ ] [LEGAL-01] 개인정보처리방침 정식화 (법무 검토 + 실 약관) — FOLLOWUP-59 인계 — 🚦 휴먼 게이트
- [ ] [LEGAL-02] 이용약관 정식화 + 전자상거래법 청약철회 조항 — 🚦 휴먼 게이트
- [ ] [LEGAL-03] 쿠키 동의 배너 (GDPR 최소화 + 한국 정통망법) — @ui-designer
- [ ] [LEGAL-04] 개인정보 수집·이용 동의 체크박스 (회원가입 + 문의 폼) — @ui-designer + @architect
- [ ] [LEGAL-05] 미성년자 이용 제한 고지 + 법정대리인 동의 처리 — 🚦 휴먼 게이트

### 완료

- [x] [LEGAL-OPS-01] 사업자 정보 admin 관리 + footer/약관/PP 동적 노출 (183077f)
  - Prisma CompanyInfo 싱글톤 모델 + migration 20260605000000_company_info
  - shared-schema CompanyInfoSchema / UpdateCompanyInfoSchema / PublicCompanyInfoSchema
  - admin /company 페이지: RHF+Zod 6섹션 폼, Footer 미리보기, isPublished 토글
  - /api/admin/company GET/PATCH + audit log + revalidateTag('company-info')
  - Footer.tsx async SC 전환, 사업자정보 블록 동적 렌더
  - legal/terms, legal/privacy 동적 변수 대체 (company name, officer, hosting)
- [x] [LEGAL-OPS-03] 회원 탈퇴 흐름 — soft delete + 30일 hard delete + 데이터 export
  - User 모델 deletedAt/deletionScheduledFor/marketingConsent 추가
  - GET /api/account/export (PIPA 35조 이동권)
  - POST /api/account/delete (본인 재인증 + soft delete + audit)
  - PATCH /api/account/marketing-consent (별도 동의 관리)
  - /mypage/account 계정 설정 + 2단계 탈퇴 모달
  - /goodbye 탈퇴 완료 안내 + 미들웨어 차단
  - /admin/users 회원 관리 + /admin/users/[id] 복원
  - /api/cron/hard-delete-users placeholder
  - /legal/refund placeholder + Privacy 이용자 권리 강화
- [x] [LEGAL-OPS-05] 데이터 다운로드 권리 — LEGAL-OPS-03 Step 2 로 통합 완료
- [x] [LEGAL-OPS-07] 마케팅 동의 별도 관리 (부분) — marketingConsent 필드 + 토글 API

## COMMS — 알림/이메일 (M7 진입 직전)

- [ ] [COMMS-01] Inquiry 답변 시 이메일 자동 발송 — Resend 또는 SendGrid — @architect (BOARD-02 placeholder 완성)
- [ ] [COMMS-02] 회원가입/비밀번호 재설정 트랜잭션 이메일 커스텀 템플릿 — @ui-designer
- [ ] [COMMS-03] 공모전 시작/종료 알림 푸시 (Web Push API) — @architect
- [ ] [COMMS-04] 마케팅 뉴스레터 구독 옵션 + 수신거부 처리 — LEGAL-03 연동 — 🚦 휴먼 게이트

## COMMERCE-EXT — 거래 확장 (M7 후속)

- [ ] [COMMERCE-01] 크리에이터 리소스 마켓플레이스 (판매 등록 + 수수료 정책) — 🚦 휴먼 게이트
- [ ] [COMMERCE-02] POD 인쇄소 연동 API (업체별 사양 자동 전송) — @pdf-publisher + @architect
- [ ] [COMMERCE-03] 크리에이터 정산 시스템 (월별 수익 정산 + 세금계산서) — 🚦 휴먼 게이트
- [ ] [COMMERCE-04] 기업 라이선스 (팀 구독 + 워크스페이스) — 🚦 휴먼 게이트
- [ ] [COMMERCE-05] 공모전 수상작 유통 수익 분배 — 🚦 휴먼 게이트
- [ ] [COMMERCE-06] NFT/디지털 굿즈 연동 (추후 시장 상황 판단) — P3, parking

## M9 — Stabilization

- [ ] [M9-01] Lighthouse 90+ 핵심 페이지 — 회귀 게이트 — @qa-tester + @ui-designer
- [ ] [M9-02] 키보드 시나리오 5개 통과 — @qa-tester
- [ ] [M9-03] 보안 점검: SVG XSS / SSRF / 업로드 — 0 위반 — @qa-tester
- [ ] [M9-04] 부하/벤치 — 동시 편집 100 — @qa-tester + @architect

## 후속 이슈 (오토파일럿 진행 중 발견)

- [x] **[FOLLOWUP-51] (P0) 시각 검증 자동화 (visual-check)** ✅ 2026-05-16 (커밋 b9b2f23) — 회고 §6.1-A 대응. 코드 변경 → AI 가 30초 안에 dev 화면 screenshot 으로 직접 검증. 산출물:
  1. `scripts/visual-check.sh` — headless chromium 기반. 인자로 URL/경로 + viewport 받아 `tmp/visual/{slug}.png` 저장. 서버 미기동 시 명확 에러.
  2. `scripts/visual-check.ts` — TS 래퍼 (Playwright chromium-headless). selector 영역만 캡처 지원.
  3. `.claude/commands/visual-check.md` — `/visual-check <route> [selector]` 슬래시 커맨드.
  4. `package.json` `"visual-check": "bash scripts/visual-check.sh"` 등록. `tmp/` git-ignored.
  DoD 충족: `pnpm visual-check /editor` → `tmp/visual/editor.png` 생성 + git ignored. ui-designer 에 `/visual-check` 호출 의무 추가 — @architect + @qa-tester
- [x] **[FOLLOWUP-52] (P0) CI polling 자동화** ✅ 2026-05-16 (커밋 b9b2f23) — 회고 §5.2-⑦ 대응. push 직후 GitHub Actions 결과를 자동 polling, 실패 시 즉시 알림. 산출물:
  1. `scripts/ci-watch.sh` — 현재 브랜치 HEAD 의 워크플로 run 을 gh CLI 로 추적. 실패 시 `gh run view --log-failed` 핵심 50줄 stdout.
  2. `.claude/commands/ci-watch.md` — `/ci-watch` 슬래시 커맨드. orchestrator PR 흐름 통합.
  3. `package.json` `"ci-watch": "bash scripts/ci-watch.sh"` 등록.
  DoD 충족: `pnpm ci-watch` 로 in-progress run 추적, success(0)/failure(1)/timeout(3) 종료 코드. gh CLI 없으면 exit 2 + 안내 (hang 없음). 실패 로그 자동 요약 — @architect
- [x] **[FOLLOWUP-53] (P0) 의사결정 트리 워크플로우 (명세화→동의→구현→검증)** ✅ 2026-05-16 (커밋 b9b2f23) — 회고 §7.3 대응. UI 피드백 처리 절차를 SOP 문서 + 슬래시 커맨드로 고정. 산출물:
  1. `docs/process/ui-feedback-workflow.md` — 8단계 트리 + 책임 분담 + 시각 임계값 가이드 (4px 인식 불가 등).
  2. `.claude/commands/ui-spec.md` — `/ui-spec <issue>` 슬래시 커맨드: 사용자 직관 표현 → 명세표(측정/진단/제안) 자동 생성 → 동의 후 진행.
  3. `.claude/agents/ui-designer.md` 에 "UI 피드백 트리 (FOLLOWUP-53)" 섹션 추가 (기존 책임 유지, 트리만 추가). 2회 실패 escalate, 3회 멈춤.
  4. `CLAUDE.md` §7.4 에 워크플로우 링크 추가.
  DoD 충족: ui-designer 가 명세표 → 동의 → 구현 → /visual-check → push 순서 준수. spacing 12연속 실패 패턴 구조적 차단 — @architect + @ui-designer
- [x] **[FOLLOWUP-15] (P1)** Vercel web 프로젝트 deploy 'ERROR' ✅ 2026-05-17 — 원인: GitHub repo private 전환 + Vercel Hobby Plan 충돌. eb8eec6 이후 23h 동안 모든 deploy BLOCKED. **해결: 사용자 GitHub 에서 repo public 복원 + admin force trigger commit `a50a252`** — 회고 [2026-05-17_spacing_root_cause_resolution.md](../retrospective/2026-05-17_spacing_root_cause_resolution.md) Layer 1
- [x] **[FOLLOWUP-55] (P0) CSS utility 빌드 sanity CI gate** — 회고 §5.1. `scripts/css-sanity-check.sh` — 빌드 산출물 `apps/*/next/static/css/*.css` 에 `.p-4/p-5/p-8/gap-4/gap-5/gap-8/px-N/py-N` 등 핵심 utility rule 존재 검증 + universal `* { padding: 0 }` anti-pattern 검출. CI job 으로 lint 다음 단계에 추가. 본 검증이 있었다면 13일 spacing 작업이 첫 commit 30초 안에 끝났을 것 — @architect ✅ df63151
- [x] **[FOLLOWUP-56] (P0) ADR-0012 Tailwind v4 monorepo @source policy** — `packages/shared-ui/src/styles/globals.css` 의 `@source` directive 가 monorepo 모든 source 경로(apps/web, apps/admin, packages) 를 명시해야 utility 가 생성됨. 신규 패키지에 className 사용처 추가 시 `@source` 갱신 의무. ADR 추가 + CI 에서 `@source` 누락 검증 — @architect ✅ df63151
- [x] **[FOLLOWUP-57] (P1) ESLint custom rule: universal `*` + padding/margin 차단** — `packages/shared-ui/src/styles/globals.css:227` 류 anti-pattern 재발 방지. bash awk 로 layer 밖 `*` selector + box-model 속성 0 reset 검출 → 회고 Layer 2 차단. `scripts/check-css-anti-patterns.sh` + CI gate — @architect ✅ df63151
- [x] **[FOLLOWUP-58] (P2) 회고 §7.4 SOP 에 Step 0 deploy/build sanity 삽입** — UI 피드백 처리 트리에 0단계 "prod CSS hash 최신 + 변경 utility 존재 확인" 추가. ui-spec 슬래시 커맨드 + ui-designer agent 프롬프트 갱신 → "코드 변경했는데 안 보임" 함정 차단. `scripts/check-prod-sanity.sh` 헬퍼 추가 — @architect + @ui-designer ✅ 73c4d4d
- [x] **[FOLLOWUP-54] (P1) visual-check 인프라 한계 보강** ✅ 2026-05-17 — 산출: `scripts/visual-check.ts` 에 `--url`/`--click`/`--seed-storage`/`--device`/`--wait-for-selector`/`--emulate-media` 6개 옵션 추가, `scripts/visual-check.sh` passthrough + 빈 배열 unbound 버그 fix, `.claude/commands/visual-check.md` 사용 예시 갱신, `docs/process/ui-feedback-workflow.md` 신규 옵션 기록. 검증: `pnpm visual-check --url https://storywork-editor-web.vercel.app/editor` prod 캡처 정상. dev 의 panel click 은 FormatPickerModal dismissable=false 라 `--seed-storage` 또는 chain click 필요(`--click` 자체 정상). @architect
- [x] **[FOLLOWUP-49] (P1) `apps/web` typecheck + test 부채** — vitest.config.ts `@/` alias 추가 + setup.ts Supabase env 주입 + users.test.ts mock `as never` 타입 단언으로 5개 marketing 테스트 파일 (og/landing/features/intro/showcase-derbyman) 통과. typecheck 1건(users.test.ts L35) 수정. typecheck/test script echo 스킵 해제. 27개 테스트 파일 407 tests all pass — SHA: effce8c
- [x] **[FOLLOWUP-50] (P1) `apps/storybook` Storybook 8.x type migration** — 11개 stories 파일 meta에 `args: {}` 기본값 추가 (render() 전용 스토리 args optional화). `StickyNote` 컴포넌트 `style` prop 추가. storybook tsconfig + vite main.ts 에 `@/` alias 추가. `AdminResourceUpload` unknown→string 타입 수정. typecheck/build script echo 스킵 해제. storybook build 통과 — SHA: effce8c
- [x] **[FOLLOWUP-59] (P1) 법무 검토 — 약관/PP 정식화** — `/legal/terms`, `/legal/privacy` 현재 베타 placeholder. 정식 출시 전 법무 검토 후 실 약관으로 교체 필요. 개인정보보호법 준수 여부, 국제 데이터 전송(Supabase/Anthropic), 이용자 권리 조항 검토 의무 — @architect 🚦(휴먼 게이트)
- [ ] **[FOLLOWUP-60] (P1) PostHog/Sentry 부트스트랩** — `apps/web/app/layout.tsx` 에 NEXT_PUBLIC_POSTHOG_KEY/NEXT_PUBLIC_SENTRY_DSN 환경변수 자리 준비됨. M0-06 과 별도 PR 로 진행. 쿠키 동의 배너 연동 필요 (FOLLOWUP-59 법무 검토 후 진행) — @architect
- [ ] [FOLLOWUP-01] `eslint-import-resolver-typescript` 추가 — `@storywork/*` 패키지명 import 도 역참조 차단 가능. 현재는 상대 경로만 차단됨 — @architect (M1 진입 전)
- [ ] [FOLLOWUP-02] `pnpm dev` (turbo --parallel) 일부 패키지가 시작되지 않는 이슈 — turbo 2.9.7 의 `--parallel` deprecated 이슈로 추정. `turbo run dev` 만 사용하도록 변경(persistent: true 이미 있음) 또는 `concurrency` 설정 추가 — @architect
- [ ] [FOLLOWUP-03] Storybook 8.6 호환성 경고(`@storybook/addon-essentials@8.6.14` vs `8.6.18`) — 마이너 패치 — @ui-designer
- [ ] [FOLLOWUP-04] Sheet `aria-describedby` 이중 description 위험 — SheetDescription 직접 제공 시 조건부 처리 — @ui-designer (M1 편집기 모바일 패널 작업 시)
- [ ] [FOLLOWUP-05] Pretendard webfont (`next/font/local`) 추가 — M8 SNS 카드 디자인 시점에 — @ui-designer
- [ ] [FOLLOWUP-06] ESLint no-raw-color 커스텀 룰 — 직접 hex 사용 자동 감지 — @architect
- [ ] [FOLLOWUP-07] Storybook visual regression (Chromatic 또는 Playwright snapshot) — M9 안정화에서 — @qa-tester
- [ ] [FOLLOWUP-08] `packages/shared-schema/package.json` 에 `"type": "module"` 추가 — node 의 ESM/CJS 추론 경고 제거 — @architect
- [x] [FOLLOWUP-09] pgvector `search_path` — 마이그레이션 SQL 에 `SET search_path = public, extensions;` 추가 ✅ 2026-05-05 (커밋 f008321) — Cloud 전환 시 실제 발생, 즉시 해결
- [ ] [FOLLOWUP-10] GitHub Actions Node 20 → Node 24 업그레이드 (`actions/checkout@v5`, `actions/setup-node@v5`, `pnpm/action-setup@v5`) — 2026-09-16 까지 — @architect
- [x] [FOLLOWUP-11] DB 비밀번호 입력 ✅ 2026-05-05 — username `yohan` + 11자 password 로 prisma db pull 16 모델 인식 + prisma generate 성공
- [ ] [FOLLOWUP-12] PgBouncer prepared statement 비호환 — `prisma db execute --stdin` hang 발생. 실제 앱 코드는 `pgbouncer=true` 로 회피되지만, 마이그레이션/raw SQL 직접 실행은 `DIRECT_URL`(5432) 명시 사용 — `pnpm db:exec` 등 helper script 추가 권고 — @architect
- [ ] [FOLLOWUP-13] Vercel preview 환경변수 — main 이 production branch 라 같은 이름의 preview env 등록 불가. PR 워크플로우 시작 시 별도 preview branch 명 정해서 추가 — @architect
- [ ] [FOLLOWUP-14] env.ts 빌드 시점 검증 강제 — 현재 page module import 시점에야 `validateEnv()` 호출되어 정적 page 면 build 통과. 첫 빌드 단계에서 강제 검증되도록 `next.config.ts` 또는 `instrumentation.ts` 에 import — @architect
- [ ] [FOLLOWUP-15] Vercel web 프로젝트 deploy 'ERROR' (build READY 인데 promotion 실패) — M1 결과물 push 시 재검증. 안되면 Vercel UI 의 deployment log 직접 확인 — @architect
- [x] **[FOLLOWUP-16] Storige 가이드 P0 핫픽스 8건** ✅ 2026-05-05 (커밋 0234fd1..b4e0f93) — bound 핸들러 7건 / dispose 가드 / 모바일 factory 분기 / History capacity 모바일 / useRef+EditorContext / touch-action / user-scalable=no / unhandledrejection. 14 신규 단위 테스트, 회귀 0. **부가**: node_modules 의 macOS Finder 중복(` 2.js`) 220 건 발견 → 클린 재설치로 해결 (clean install 후 0건). — @editor-engineer
  근거: [docs/reference/STORIGE_GUIDE_REVIEW.md](../reference/STORIGE_GUIDE_REVIEW.md) §3, §9
  - StoryCanvas 익명 이벤트 핸들러 7건 → bound member + dispose() off (BUG-002 류)
  - StoryCanvas 모든 핸들러 첫 줄 `if (!_canvas?.getContext()) return` 가드
  - StoryCanvas factory 에 `isCoarsePointer()` 분기 (`enableRetinaScaling`, `cornerSize`, `touchCornerSize`, `padding`, `renderOnAddRemove:false`) — BUG-006 류 모바일 메모리
  - editor-history `History` capacity 모바일 자동 분기 (15/200)
  - apps/web `EditorShell` 의 `useState<StoryCanvas>` → `useRef + Context` (가이드 §25 ❌ 위반)
  - apps/web `globals.css` 에 `touch-action:none` + `body { overscroll-behavior:none }`
  - Next.js metadata.viewport 에 `user-scalable=no, viewport-fit=cover`
  - `window.addEventListener('unhandledrejection')` 글로벌 핸들러 (BUG-015 React freeze 방지)
- [x] [FOLLOWUP-17] ResizeObserver 3중 가드 + getEventPoint + ControlBar fixed (BUG-013/014/SELECT-1) ✅ 2026-05-05 (M1-07 에 통합 — 커밋 615b695, df9f164, 0a3f47e)
- [ ] [FOLLOWUP-18] extendFabricOption 화이트리스트 정의 — Schema v1 의 fabric 내부 커스텀 속성(styles/charSpacing/cmykFill 등) 보존 강제 — @editor-engineer (M5 텍스트 작업 직전)
- [x] [FOLLOWUP-64] `eslint-plugin-react-hooks` 추가 — @architect ✅ 2026-06-13 (※ ID 중복 정정: 기존 FOLLOWUP-60 → 64). `eslint.config.js` 에 `react-hooks/rules-of-hooks: error` + `exhaustive-deps: error` 배선(repo `--max-warnings 0` 정책상 warn 불가 → 전수 해소 후 error). **실제 버그 1건 수정**: `EntityForm.tsx` 위젯별 early-return 분기 안에서 `useState` 조건부 호출(rules-of-hooks 위반) → 컴포넌트 최상단으로 호이스트. `exhaustive-deps` 10건 처리: 실제 수정 4건(ControlBar `getObj` useCallback 안정화 / useAutosave 함수형 업데이터로 stale-closure 해소 / MobileBottomSheet ref cleanup 캡처 / KeypointEditor STEP 상수 모듈 호이스트), 의도적 reduced-deps 6건은 사유 주석 + `eslint-disable-next-line`(EditorShell ×4 mount/페이지전환 효과, useStoryCanvas mount-once 캔버스 init, usePoseSearch filterKey 안정화). 검증: 전체 repo react-hooks 위반 0 · web 545 + admin 372 test green · tsc 0 · 루트 devDep 명시(frozen-lockfile 정합)
- [ ] [FOLLOWUP-61] `ai-script/src/` 빌드 산출물 재발 방지 — `.gitignore` 에 `packages/ai-script/src/**/*.js` 추가 또는 tsconfig.json `noEmit: true` 강제(현재 base에만 있음). CI lint step 에서 `src/**/*.js` 존재 체크 — @architect
- [ ] [FOLLOWUP-62] async RSC + jsdom 테스트 패턴 가이드라인 — `Footer`처럼 `async Server Component` 가 `vi.mock` 없이 jsdom 에서 쓰이면 Suspense 블록으로 빈 DOM 반환. 신규 async RSC 를 import 하는 테스트는 반드시 컴포넌트 레벨 mock 필수. `docs/process/testing-async-rsc.md` 작성 권고 — @architect
- [ ] [FOLLOWUP-63] prisma format cosmetic drift — `pnpm prisma format` 이 현재 schema 의 컬럼 정렬을 변경하지만 의미 차이 없음. CI 에 `prisma format --check` 추가 여부 결정 필요 (현재 미추가) — @architect
- [x] [COVER-ADMIN-01] 표지(Cover) 설정 admin 1차 — @admin-builder ✅ 2026-06-08 — Format 기본값(`coverEnabled`/`coverWidthMm`/`coverHeightMm`/`isActive`) + TemplateSet 오버라이드(상속=null tri-state) 스키마/마이그레이션(`20260608000000_format_templateset_cover_settings`, prod 적용·8컬럼 검증)·admin 폼(Format Edit/New, TemplateSet Edit)·API(POST/PATCH)·테스트(365 green, 신규 cover 검증 19). Storige 편집기 학습(`docs/reference/STORIGE_EDITOR_STUDY.md`) 반영.
- [x] [FOLLOWUP-COVER-02] 표지 설정 **편집기 소비** (phase 2) — @editor-engineer ✅ 2026-06-12 — ① `GET /api/formats`(신규, isActive=true 만) 를 FormatPicker 가 fetch → admin 비활성 판형 자동 숨김 + coverEnabled 판형 코랄 "표지 포함" 배지(오프라인 시 하드코드 프리셋 폴백), ② 표지 판형 시작 시 pages=[표지(index 0), 본문] 자동 생성 + PagePanel "표지" 라벨, ③ 해석 규칙 `lib/cover-config.ts` 순수 함수(`set.override ?? format.default ?? 판형치수`), ④ 캔버스 독립 치수 — `canvas.format` 단일 소스 3지점(생성/포맷변경/페이지전환) `effectivePageFormat` 동기화, ⑤ 영속화 `Project.settings.cover`(마이그레이션 불요) 저장+복원. **운영 픽스**: prod Format 테이블 0행 발견(시드 미실행 — 기존 save 잠복 깨짐) → seed-formats 멱등 실행으로 4 프리셋 복구. 신규 테스트 21 · web 533 green.
- [x] [FOLLOWUP-COVER-03] 표지 **PDF 출판 통합** — @pdf-publisher ✅ 2026-06-12 — pdf-engine 에 페이지별 치수 오버라이드(`PageInput.dims`) 도입: ① `renderPage` 가 페이지별 MediaBox/TrimBox + y-flip 기준(`ctx.pageHeightPt`) 동기화(순차 렌더 ctx 변이), ② preflight 4룰(bleed/safe/dpi/page-count)이 `effectivePageDims` 기준 검사 — 표지 fabricJson 치수 불일치 오탐 제거(무결성 검사는 dims 기준 유지), ③ 호출자 3곳(publish/preflight 라우트 + Inngest worker)이 `Project.settings.cover` → `pages[0].dims` 연결. bleed/safe/dpi 는 format 상속. 신규 테스트 6 · pdf-engine 108 green · 결정론 유지.
- [x] [DESIGN-C-01~03] 디즈니 다이나믹 리디자인 3단계 — @ui-designer ✅ 2026-06-12 — 웹툰/디즈니/지브리 방향(사용자 시안 승인 C안). ① web 마케팅(`8027773`): `--mkt-*` 웜톤 + 마커 하이라이트 + 스티커 4컷 팝인 + 스프링 버튼 + 스크롤 리빌, ② admin(`660c7db`): `nike-*` 웜톤 + 버튼/카드 스프링 + 시각회귀 baseline 12종 갱신, ③ editor(`dc262bb`): `--editor-*` 웜톤 + `--editor-accent-pop` 코랄 + FormatPicker/EmptyCanvasHint 안전구역 액센트(+`border-[var()]` width/color 모호 잠복 버그 수정). 전 단계 `prefers-reduced-motion` 가드 · /editor 104kB 유지.
- [x] [AUDIT-FIX-01] API 런타임/보안 audit 수정 — @qa-tester ✅ 2026-06-08 — HIGH(#1 `/api/search/poses` 세션 인증·#2 embed-server HTTP status) + MED(#3 좋아요 카운터 멱등·#4 inquiries 작성자 세션유도·#5 logout `NEXT_PUBLIC_APP_URL`) + LOW(#6 `.env.example` CRON_SECRET·#7 pdf-build 자격증명 누락 throw). 신규 테스트 14, web 509 green. 마이페이지 탈퇴 화면 개인정보 파기 노티 추가(처리방침 §3 일치).
- [x] [OPS-CRON-01] hard-delete cron 스케줄 등록 — @architect ✅ 2026-06-08 — `apps/web/vercel.json` `crons` 에 `/api/cron/hard-delete-users` 매일 18:00 UTC(03:00 KST) 등록. Vercel Cron 이 `CRON_SECRET` 설정 시 Authorization 헤더 자동 첨부. **휴먼 게이트 잔여**: ① 프로덕션 `CRON_SECRET` env 등록(미설정 시 401→파기 미실행), ② **배포 차단 해제** — 레포 PRIVATE 전환 후 Vercel(Hobby) 가 private 레포 배포를 BLOCK 중(2026-06-05~, 마지막 READY=`4c3d571`, 미배포 24커밋). 레포 PUBLIC 복귀 또는 Pro 업그레이드 필요 (핸드오프 §9 리스크 현실화).

## ☁️ Vercel 배포 상태 (M0 종료 시점)
- **admin**: https://storywork-editor-admin.vercel.app ✅ 200 — env 16, root `apps/admin`, vercel.json (turbo build)
- **web**: https://storywork-editor-web.vercel.app ⚠️ 404 — build READY 후 promotion ERROR. FOLLOWUP-15 로 추적, M1 결과물로 재검증 예정

## 🎨 마케팅 표면 (M3 외, 2026-05-10~11) — 4/7 ✅

- [x] [MKT-01] 마케팅 4 페이지 (랜딩 / 서비스소개 / 편집기기능 / 더비맨 사례) — `72b57af`
- [x] [MKT-02] DESIGN.md 디자인 시스템 토큰 명세 (Figma 마케팅 캔버스 기반, 578줄) — `72b57af`
- [x] [MKT-03] `--mkt-*` CSS 변수 네임스페이스 + 8 공용 컴포넌트 — `72b57af`
- [x] [MKT-04] 포즈 자산 실 연결 — Supabase Storage thumb → 22 자산 (16 unique) — `f3b2a8d`
- [x] [MKT-05] OG 이미지 + 메타데이터 — Edge runtime 4 템플릿 + favicon + sitemap + robots — `a74db15`
- [x] [MKT-06] Storybook 49 스토리 (9 파일) + next/* mock 인프라 — `b637dfc`
- [x] [MKT-08] 랜딩 컨텐츠 풍성화 + SEO + 컴플라이언스 — 가치제안 3-up / 페르소나 4종 / FAQ 9개 / 사용 사례 3종 / 사회적 증거 / JSON-LD 3종 / robots 강화 / sitemap legal 추가 / /legal/terms + /legal/privacy placeholder (FOLLOWUP-59) — @ui-designer (pending commit)
- [ ] [MKT-07] Pretendard webfont 정식 등록 (next/font/local) (FOLLOWUP-33, M5-01 마무리에 통합 예정)

## 🛠 편집기 Phase 1+2 (Bookmoa Storige 흡수, 2026-05-11) ✅

- [x] [EDIT-P1] Phase 1 — 다중선택/클립보드/정렬/레이어단축키/회전15°스냅/자동저장 — `eb8ff86`
- [x] [EDIT-P2] Phase 2 — editor-text 활성화 + 인라인편집 + ControlBar + 한글 splitByGrapheme — `0243653`
- [ ] [EDIT-P3] Phase 3 — 이미지 필터 + 클리핑 마스크 + 텍스트 특수효과 (Storige 차별화 잔여)

## M10+ (Parking)

- [ ] **SVG 어댑터 입점** — `editor-pose/adapters/svg.ts` + 인입 파이프라인 SVG 분기. 색상 슬롯 풀 지원([ADR-0011](decisions.md#adr-0011--포즈-자산-포맷-png-우선-svg-추후))
- [ ] AI 자동 더빙(TTS + 감정) — 별도 ADR
- [ ] AI 영상 생성(컷 → 모션) — 별도 ADR
- [ ] 협업 편집(Yjs + y-fabric) — `editor-history` OT 슬롯 활용

---

## 작업 추가 규칙
- 신규 작업은 **마일스톤 + ID** 부여, DoD 한 줄, 책임 에이전트 명시
- 휴먼 게이트(결제/마이그레이션/배포/가격)는 `🚦` 이모지 표시
