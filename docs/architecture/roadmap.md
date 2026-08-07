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

## CONTI — 콘티 자동생성 모듈 (research 2026-07-21 §2, 착수 승인 2026-07-30)

> 정본: [docs/research/2026-07-21_conti_pose3d_oss_research.md](../research/2026-07-21_conti_pose3d_oss_research.md) §2

- [ ] [CONTI-01] 장면 메타 실가동·영속화 — LLM enhance 콘티 경로 활성 + 샷사이즈 어휘 + SceneDoc.meta 장면별 메타 저장 + Inngest 비동기 — 🚦 `AI_GATEWAY_API_KEY` 게이트 — @scene-analyzer
- [x] [CONTI-02] 콘티 시트 합성기 + PDF — `composeContiSheets()`(ai-layout, 2×4 그리드 순수함수·결정론) + `conti-2x4` 템플릿 + publish API `conti:true`(본문 앞 prepend, 동기 전용) — pdf-engine 무수정 통과, 단위 16 + 실물 PDF 스모크(결정론 byte-identical) — @layout-composer ✅ 2026-07-30. shotLabel 은 CONTI-01 이후 `cameraAngleToShotLabel` 훅으로 채움
- [x] [CONTI-03] 콘티 뷰 UI — import 마법사 5단계화("대본→콘티 확정→페이지 생성"): 무영속 분석(`/api/script/analyze` projectId 옵셔널) → `ContiBoard` 컷 리스트(제외 토글·대사 펼치기·0컷 안내) → 확정 시에만 full-pipeline 영속화(`excludeSceneIndices`·재확정 시 projectId 재사용으로 중복 프로젝트 방지). 시드 0 고정 + 랜덤 재시드 제거(ADR-0007). 36-에이전트 적대 리뷰 27건 반영: LLM env 하드 게이트(body llmEnabled 상향 오버라이드 차단), 인메모리 rate limit(analyze 10/min·full-pipeline 5/min), WCAG AA 대비/aria-live/role=alert/모바일 랩, 재생성 버튼은 rule-only에서 숨김(시드 변주 no-op — CONTI-01 LLM 활성 후 자동 노출). Storybook tailwind 미배선(기존 격차)도 수정. 테스트: 마법사 33·API 34·rate-limit 4 — @ui-designer + @editor-engineer ✅ 2026-07-31. **잔여**: Upstash 실 rate limit(SEC-RATE-01 — 인메모리 스톱갭은 인스턴스별 한계), 사용자당 프로젝트 수 상한(제품 결정)
- [x] [CONTI-03b] 컷 DnD 재정렬 + 컷 교체 활성화 (2차) — ① 재정렬: ContiBoard 드래그 핸들(⠿) DnD+↑/↓ 버튼(aria-disabled 로 경계 포커스 보존), `sceneOrder` 상태(콘티 구조 변경 시에만 리셋), full-pipeline `sceneOrder`(제외 필터→순열 검증→index 순차 재부여 — 페이지 분할·SceneDoc·콘티 시트가 확정 순서 준수, 불일치 시 `SCENE_ORDER_MISMATCH` 400→마법사 자동 재분석 복구) ② 컷 교체: **M4-05 대안 UI 의 생산자 부재 갭 해소** — compose 양 경로가 포즈 후보 K개를 `layer.data.meta.alternatives`(kind/resourceId 파싱 계약)로 영속 + full-pipeline 이 실자산 검증·파생본 thumbnail 주입(placeholder 후보 제거, 후보 0개면 필드 삭제 — 무동작 교체 방지). 24-에이전트 적대 리뷰 15건 반영(외부 드래그 차단 커스텀 MIME·signature 내용 기반 강화·SR 이동 통지·reasoning 영속 제외 등) — @layout-composer + @ui-designer ✅ 2026-07-31

## SCRIPT-KO — 한국어 화자귀속 3단 하이브리드 (research 2026-07-21 §4.1, 착수 승인 2026-07-30)

- [x] [SCRIPT-KO-01] 1층 룰 강화 — 발화동사 어간 패턴(활용형 커버, 기존 11종 고정형→44 어간군) + 따옴표 delimiter 플러그인(곧은/굽은·「」·『』·대시) + BookNLP식 캐릭터 ID 레지스트리(애칭 '이'·호격·성+이름 병합) + 인물성(animacy) 술어 게이트 + 행동/대명사/교대 귀속 — golden novel 대사 13줄 기준 귀속 1→12(오귀속 0), scene F1 0.899·format 0.900 무회귀. Kiwi(LGPL v3)는 별도 프로세스 인프라 결정 필요로 어댑터 경계만 유지(SPEECH_VERB_RE 교체 지점 주석) — @scene-analyzer ✅ 2026-07-30
- [ ] [SCRIPT-KO-02] 한국어 화자·청자 평가셋(PDNC 스키마) + Claude 폴백 계층 — 🚦 `AI_GATEWAY_API_KEY`
- [ ] [SCRIPT-KO-03] CSN식 스코어러(klue/roberta) 자체 학습 — 🚦 말뭉치 약관·GPU

## BUBBLE — 말풍선 배치 정식화 (research 2026-07-21 §4.3, 착수 승인 2026-07-30)

- [x] [BUBBLE-02] 배치 비용함수 4항 정식화 + 자동 QA 대조기 — `bubble-cost.ts`(w1 화자 mouth 근접+꼬리 각도 / w2 얼굴 가림 / w3 읽기순서 단조성 / w4 패널 경계, 전부 결정론) + `assignBubblesByCost()` 순열 전수(슬롯≤7)·그리디 폴백으로 slot-assign 의 나이브 인덱스 매핑 교체(화자 위치 기반 교차 배치) + `bubble-qa.ts` IoU 매칭·가림 QA 평가기(mock 검출기 테스트). 신규 23 테스트, 기존 compose/slot-assign 무회귀 — @layout-composer ✅ 2026-07-30. **잔여**: ONNX 검출기 실연결(comic-translate YOLOv8m → ONNX 변환 + onnxruntime-node 의존성 + 가중치 다운로드)은 🚦 의존성·모델 반입 승인 게이트 — `BubbleDetector` 인터페이스 교체 지점 확보됨. 키포인트 실좌표 앵커는 CHAR-GEN-01(DWPose 보강) 후 `speakerAnchorFromPoseSlot` keypoints 인자로 자동 개선

## CHAR-GEN — 캐릭터 에셋 파이프라인 (research 2026-07-21 §4.4, 착수 승인 2026-07-30)

- [x] [CHAR-GEN-01] dwpose 키포인트 일괄 보강 — `scripts/enrich-keypoints.py`(uv+onnxruntime, 알파 bbox=person bbox 로 검출기 생략) → **1,058장 전량 25점 사이드카 생성**(파서 전수 검증 1,058/1,058 통과, 평균 21.3점/장, meanW 0.154, 검수큐 125건=11.8%). 파일럿 오버레이 실사로 SimCC 신뢰도 보정·bbox 이탈 가드·파생점 가중치 확정. **동물(사족)·사랑(2인)은 도메인 밖 제외**(3점 휴리스틱 유지 — POSE3D 3D 렌더 경로 대상). 선행: KP 규약 통일(admin 10종 하이픈→shared-schema 25종 언더스코어, 레거시 정규화, 보정 API 상한 10→25) — @pose-curator ✅ 2026-07-30. **잔여 해소 ✅ 2026-08-03**: 재적재 완료(1,260/1,260, prod) — 단 6월 적재분과 slug 불일치로 이중화 발생 → 스테일 1,268행 정리(작품 참조 2행 보존, 최종 1,262행, `scripts/cleanup-stale-poses.ts`). 말풍선 앵커는 실측 25점 키포인트 가동

## M7 — Creator Mode + Billing

- [ ] [M7-01] Stripe 연결 + Webhook 멱등 — 재처리 테스트 — @architect
- [ ] [M7-02] 구독 플랜 게이트(업로드 한도/공유 토글) — RLS + 미들웨어 이중 — @architect
- [ ] [M7-03] 마이데이터 패널 — 편집기 드래그 인서트 — @admin-builder + @editor-engineer
- [ ] [M7-04] 결제/요금 페이지 — 모바일 대응 — @ui-designer

## M8 — Social

- [ ] [M8-01] OG 이미지 자동 생성(nano-banana 2) — Lighthouse SEO 100 — @ui-designer
- [x] [M8-02] 공모전 시즌 모듈 + admin CRUD — 사용자 목록/상세 페이지 완료, pg_cron 자동 동결은 BOARD-05로 별도 분리 — @admin-builder ✅ 2026-06-03 (commit 1ea593f)
- [x] [M8-03] 뽐내기 갤러리 + 좋아요/댓글 — 무한 스크롤(cursor-based) + Reaction(like/heart/wow) + 댓글 CRUD 완료 — @ui-designer ✅ 2026-06-03 (commit 690a145)
- [x] [M8-04] SNS 공유 — @ui-designer ✅ 2026-06-14 (무의존 채널). `ShareBar`(client) 신규: Web Share API(모바일 네이티브 시트, hydration-safe 피처 디텍션) + X(intent) + Facebook(sharer) + 링크 복사(clipboard+토스트). showcase 상세 + contest 상세에 배치 + openGraph/twitter 리치 카드 메타데이터(og:image=브랜드 default OG, metadataBase 절대화). 라이브 검증: X/Facebook/링크 원형 버튼 렌더 + SSR HTML + OG 절대 URL 확인(prod 임시 시드→스크린샷→삭제). 카카오톡 공유는 JS SDK+앱키(외부 의존) 필요 → [FOLLOWUP-66] 로 분리.
- [ ] [FOLLOWUP-66] 카카오톡 공유 채널 — `ShareBar` 에 카카오 추가. Kakao JS SDK 로드 + `NEXT_PUBLIC_KAKAO_JS_KEY`(외부 앱키, 🚦 휴먼 게이트) 필요. 앱키 발급 후 SDK init + Kakao.Share.sendDefault(피드 템플릿) 연결 — @ui-designer
- [ ] [FOLLOWUP-67] 동의 기록 영속 저장 (LEGAL-04 후속) — 현재 개인정보/약관 동의는 제출 게이트(미동의 시 차단)로만 처리하고 동의 시각·버전을 별도 저장하지 않는다. PIPA 분쟁 대비 증빙용으로 회원가입 시 `User.privacyConsentAt`/`termsConsentAt`, 문의 시 `Inquiry.privacyConsentAt` + 약관 버전 컬럼 추가(🚦 마이그레이션 휴먼 게이트). 법무 확정(FOLLOWUP-59) 후 필요성 재평가 — @architect

## BOARD — 공모전/공지/Q&A/갤러리 (2026-06-03)

- [x] [BOARD-01] Notice 모델 + 사용자 페이지(/notices, /notices/[id]) + admin CRUD — @architect ✅ 2026-06-03 (commit 81ee2a8 + 690a145 + 1ea593f)
- [x] [BOARD-02] Inquiry(Q&A) 모델 + 사용자 폼(/contact) + 마이페이지(/mypage/inquiries) + admin 응답 큐 — @architect ✅ 2026-06-03
- [x] [BOARD-03] 공모전 시즌 사용자 페이지(/contest, /contest/[seasonId]) + admin — @architect ✅ 2026-06-03
- [x] [BOARD-04] 갤러리(/showcase) + 댓글 + Reaction + admin 모더레이션 — @architect ✅ 2026-06-03
- [x] [BOARD-05] 공모전 출품 플로우 + 시즌 자동 동결 — @architect ✅ 2026-06-13 (P1). pg_cron 대신 Vercel cron 채택(OPS-CRON-01 패턴). **출품 POST 플로우 신규 구현**(기존 미존재): `POST /api/contest/[seasonId]/submit` — 소유권·기간(opensAt/closesAt)·동결·페이지수·중복 검증 + P2002 race 백스톱. 마이페이지 출품 모드(MyPageShell→ProjectsTab→신규 ContestSubmitCard)로 `?contestId=` 진입 시 작품별 "이 작품 출품" 버튼. 자동 동결 cron `GET /api/cron/freeze-seasons`(매일 01:00 UTC, CRON_SECRET) → closesAt 경과 시즌 frozen=true + audit. **마이그레이션** `20260613100000_contest_season_freeze`: `ContestSeason.frozen` + `@@index([frozen,closesAt])` + `Showcase @@unique([projectId,contestId])`(중복 출품 DB 차단). contest 목록/상세 페이지 frozen→마감 반영. 시간 게이트가 권위·frozen은 영속 스냅샷. 검증: 신규 테스트 19(출품 12+cron 7) · web 564 green · tsc 0 · lint 0. 런북 [contest-season-freeze.md](../runbooks/contest-season-freeze.md). 🚦 마이그레이션 휴먼 승인 완료. **적대적 리뷰 후속 보강(5건)**: ① 공개 표면 PII — `name??email` 전체 이메일 노출(출품으로 활성화)을 `publicDisplayName` 마스킹으로 전수 차단(showcase/contest/comment/notice 6곳) + 출품 UI 공개 고지 ② archived 작품 출품 차단(403) ③ ContestSubmitCard duplicate 상태 terminal(재클릭 방지) ④ freeze cron update+audit `$transaction` 원자화. 발견된 마이그레이션 baseline drift는 선존 이슈라 [FOLLOWUP-65] 로 분리. (web 570 green)
- [x] [BOARD-06] FAQ 별도 페이지 + 카테고리 — @ui-designer ✅ 2026-06-12 — `lib/faq-data.ts` 단일 소스(5 카테고리·18문항)를 랜딩 FAQ(featured 8)와 `/faq` 전용 페이지가 공유. /faq: 카테고리 앵커 칩 네비 + 색구분 섹션 + 아코디언(스프링 +→×) + FAQPage JSON-LD(SEO) + sitemap/Footer 링크. 최근 기능(표지·신고·탈퇴 파기) 문항 보강. 신규 테스트 6, web 545 green.
- [x] [BOARD-07] 신고 큐 (Comment/Showcase 신고 접수 + admin 처리) — @admin-builder ✅ 2026-06-12 — Report 모델 + 3 enum + Showcase.hidden(마이그레이션 `20260613000000_report_queue`, prod 적용). 접수: POST /api/reports(로그인 필수·세션 reporterId·멱등 createMany skipDuplicates) + ReportButton(사유 6종 모달, /showcase/[id] 작품 + 댓글 아이콘) + 공개 목록 3곳 hidden 필터. admin /reports: status 탭 큐 + 누적 신고수(groupBy) + hide(숨김+같은 대상 일괄 resolved)/dismiss/reviewing + recordAudit. 신규 테스트 13.

## LEGAL-OPS — 한국 법규 출시 필수 (P0, 출시 전 완료 필수)

- [ ] [LEGAL-01] 개인정보처리방침 정식화 (법무 검토 + 실 약관) — FOLLOWUP-59 인계 — 🚦 휴먼 게이트
- [ ] [LEGAL-02] 이용약관 정식화 + 전자상거래법 청약철회 조항 — 🚦 휴먼 게이트
- [ ] [LEGAL-03] 쿠키 동의 배너 (GDPR 최소화 + 한국 정통망법) — @ui-designer
- [x] [LEGAL-04] 개인정보 수집·이용 동의 체크박스 (회원가입 + 문의 폼) — @ui-designer ✅ 2026-06-15. PIPA 명시적·분리 동의 준수. `components/legal/ConsentCheckbox`(공유, [필수] 빨강/[선택]) 신규. **회원가입**: 이용약관+개인정보 결합 동의 1개 → 분리된 [필수] 2개(/legal/terms·/legal/privacy 실링크, 기존 데드링크 `href="#"` 수정) + 미동의 시 해당 체크박스 강조. **문의 폼**: 묵시적 동의("제출 시 ... 간주됩니다", PIPA 위반) → 명시적 opt-in [필수] 체크박스(수집항목·목적·보유기간 명시) + 제출 게이트. 동의 타임스탬프 영속 저장은 [FOLLOWUP-67](마이그레이션, 휴먼게이트)로 분리. ⚠️ 로컬 node_modules/.bin 손상으로 CI 가 lint/tsc/build 권위 검증.
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

- [ ] [FOLLOWUP-71] `중복` 폴더 17장 — 태깅 제외 ↔ 적재 포함 불일치 정합화 ([ADR-0019](decisions.md#adr-0019--포즈-자산-수치-정본-ssot-단일화-2026-08-07) 조사 중 발견). `filename-tagger` 는 `subfolderTags.중복.skip=true` 로 제외하는데 `scripts/ingest-poses.ts` 에는 폴더 제외 로직이 없어 **태그 없이 DB 에 적재**된다(skip 조건은 "이미 적재된 slug" 뿐). `llm-tagger.ts` 주석의 "중복 폴더 = 적재 제외"는 사실과 다름. 영향: 태그 없는 자산 17건이 검색 인덱스에 잔존(추천 노이즈 · 인쇄/법적 위험 없음). 선택지 ①ingest 도 제외 + 기존 17행 정리(🚦 prod 데이터 삭제) ②태깅 정책 변경 ③현행 유지 + 주석 정정 — @pose-curator

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
- [x] [FOLLOWUP-15] Vercel web 프로젝트 deploy 'ERROR' (build READY 인데 promotion 실패) ✅ 2026-05-17 — **위 253행 항목과 동일 건**(원인: GitHub repo private 전환 + Vercel Hobby Plan 충돌). 이 줄이 미완으로 남아 작업 큐에 중복 노출되던 것을 정리 — @architect
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
- [x] **[FOLLOWUP-65] (P1) prisma 마이그레이션 baseline 복구 — fresh DB `migrate deploy` 가능** — @architect ✅ 2026-06-15. 9개 마이그레이션이 `db push` baseline 위 ALTER-only 라 빈 DB 에서 `migrate deploy` 가 "relation does not exist" 로 실패했다. **squash 채택**: 9개 → 단일 `20260426000000_init`(`migrate diff --from-empty --to-schema-datamodel` 로 현재 전체 스키마 23 테이블 생성) + `migration_lock.toml`(postgresql). **안전성 검증**: ① schema.prisma == prod(drift=Supabase 플랫폼 확장뿐) ② pgvector docker 에 init `migrate deploy` → 적용 성공 + drift 0("empty migration") ③ prod 정합화 상태(9 stale row + init resolved) 시뮬레이션 → `migrate deploy` no-op + `status` "up to date!". **prod 정합화**: `migrate resolve --applied 20260426000000_init`(1 row 추가, 스키마/데이터 무변경). CI 에 `migrate-smoke` 잡 추가(pgvector 서비스 + fresh DB deploy + drift 0 게이트)로 재발 차단. 구 9개 마이그레이션은 git 히스토리에 보존. 🚦 prod resolve 휴먼 승인 후 실행.
- [x] [COVER-ADMIN-01] 표지(Cover) 설정 admin 1차 — @admin-builder ✅ 2026-06-08 — Format 기본값(`coverEnabled`/`coverWidthMm`/`coverHeightMm`/`isActive`) + TemplateSet 오버라이드(상속=null tri-state) 스키마/마이그레이션(`20260608000000_format_templateset_cover_settings`, prod 적용·8컬럼 검증)·admin 폼(Format Edit/New, TemplateSet Edit)·API(POST/PATCH)·테스트(365 green, 신규 cover 검증 19). Storige 편집기 학습(`docs/reference/STORIGE_EDITOR_STUDY.md`) 반영.
- [x] [FOLLOWUP-COVER-02] 표지 설정 **편집기 소비** (phase 2) — @editor-engineer ✅ 2026-06-12 — ① `GET /api/formats`(신규, isActive=true 만) 를 FormatPicker 가 fetch → admin 비활성 판형 자동 숨김 + coverEnabled 판형 코랄 "표지 포함" 배지(오프라인 시 하드코드 프리셋 폴백), ② 표지 판형 시작 시 pages=[표지(index 0), 본문] 자동 생성 + PagePanel "표지" 라벨, ③ 해석 규칙 `lib/cover-config.ts` 순수 함수(`set.override ?? format.default ?? 판형치수`), ④ 캔버스 독립 치수 — `canvas.format` 단일 소스 3지점(생성/포맷변경/페이지전환) `effectivePageFormat` 동기화, ⑤ 영속화 `Project.settings.cover`(마이그레이션 불요) 저장+복원. **운영 픽스**: prod Format 테이블 0행 발견(시드 미실행 — 기존 save 잠복 깨짐) → seed-formats 멱등 실행으로 4 프리셋 복구. 신규 테스트 21 · web 533 green.
- [x] [FOLLOWUP-COVER-03] 표지 **PDF 출판 통합** — @pdf-publisher ✅ 2026-06-12 — pdf-engine 에 페이지별 치수 오버라이드(`PageInput.dims`) 도입: ① `renderPage` 가 페이지별 MediaBox/TrimBox + y-flip 기준(`ctx.pageHeightPt`) 동기화(순차 렌더 ctx 변이), ② preflight 4룰(bleed/safe/dpi/page-count)이 `effectivePageDims` 기준 검사 — 표지 fabricJson 치수 불일치 오탐 제거(무결성 검사는 dims 기준 유지), ③ 호출자 3곳(publish/preflight 라우트 + Inngest worker)이 `Project.settings.cover` → `pages[0].dims` 연결. bleed/safe/dpi 는 format 상속. 신규 테스트 6 · pdf-engine 108 green · 결정론 유지.
- [x] [DESIGN-C-01~03] 디즈니 다이나믹 리디자인 3단계 — @ui-designer ✅ 2026-06-12 — 웹툰/디즈니/지브리 방향(사용자 시안 승인 C안). ① web 마케팅(`8027773`): `--mkt-*` 웜톤 + 마커 하이라이트 + 스티커 4컷 팝인 + 스프링 버튼 + 스크롤 리빌, ② admin(`660c7db`): `nike-*` 웜톤 + 버튼/카드 스프링 + 시각회귀 baseline 12종 갱신, ③ editor(`dc262bb`): `--editor-*` 웜톤 + `--editor-accent-pop` 코랄 + FormatPicker/EmptyCanvasHint 안전구역 액센트(+`border-[var()]` width/color 모호 잠복 버그 수정). 전 단계 `prefers-reduced-motion` 가드 · /editor 104kB 유지.
- [x] [AUDIT-FIX-01] API 런타임/보안 audit 수정 — @qa-tester ✅ 2026-06-08 — HIGH(#1 `/api/search/poses` 세션 인증·#2 embed-server HTTP status) + MED(#3 좋아요 카운터 멱등·#4 inquiries 작성자 세션유도·#5 logout `NEXT_PUBLIC_APP_URL`) + LOW(#6 `.env.example` CRON_SECRET·#7 pdf-build 자격증명 누락 throw). 신규 테스트 14, web 509 green. 마이페이지 탈퇴 화면 개인정보 파기 노티 추가(처리방침 §3 일치).
- [x] [AUDIT-FIX-02] 전체 코드베이스 전수 감사(8차원 서브에이전트 오케스트레이션) + 수정 8건 — @qa-tester ✅ 2026-06-15 — read-only Explore 8차원 fan-out → 80+ 발견 → 적대적 검증 17 확정(2 rounds). **수정**: ① **CRITICAL** 회원 영구파기 cron silent 실패(Comment/Project/Showcase/Notice 의 FK=RESTRICT 미삭제 → user.delete FK violation → silent swallow → User 영구 잔존 = PIPA 파기 위반) → user.delete 전 개인 콘텐츠 + Reaction 을 단일 `$transaction` 파기 + 회귀 테스트 ② TOTP 좀비 정리(미추적 라우트/lib 4 + middleware dead export + logout stale 쿠키) ③ admin 리소스 facet 카운트 정합성(차원별 필터) ④ **HIGH** 작품저장 비원자성(deleteMany 후 createMany 실패 시 페이지 전멸) → `$transaction` ⑤ cron 상수시간 인증(sha256+`timingSafeEqual` 공유 유틸 `lib/cron-auth.ts`) ⑥ web middleware 탈퇴체크 빈 catch → 로깅(fail-open 유지) ⑦ 공모전 PATCH 시각순서(opensAt<closesAt<resultsAt) 검증 ⑧ **scripts/ CI 타입체크 게이트**(tsx 전용 사각지대) → 숨은 타입오류 8건(seed-formats gridDef·visual-check undefined) 검출·수정. 전 커밋 CI green(scripts 게이트 포함). ⚠️ 세션 중 로컬 디스크 99% → `.bin` 반복 손상으로 로컬 lint/tsc/test 불가, CI(클린 클라우드)가 권위 검증.
- [x] [FOLLOWUP-68] Reaction.userId FK 추가 — @architect ✅ 2026-06-29 — `Reaction.user User @relation(onDelete:Cascade)` + `User.reactions` 역참조. 마이그레이션 `20260629020000_reaction_user_fk`: 고아 Reaction 정리(DELETE) → AddForeignKey `Reaction_userId_fkey`. `prisma migrate diff` 로 drift-safe SQL 생성, web+admin tsc green. 🚦 승인 완료 — prod 적용은 SQL Editor/migrate deploy.
- [x] [FOLLOWUP-69] 탈퇴(deletedAt) 차단 defense-in-depth — @architect ✅ 2026-06-29 (`e0496ab`) — `guardDeletedUser` 헬퍼(`app/api/_lib/require-active-user.ts`) + projects API 5종(save·[id]·publish·alternatives·preflight)·/mypage·`lib/users.ts`(deletedAt select+재검증). 미들웨어 fail-open 대비 서버 재검증. web+admin 순차 typecheck·CI green.
- [x] [FOLLOWUP-70] 감사 잔여 하드닝 6건 — @architect ✅ 2026-06-29 (`e0496ab`+`950fd75`) — 7건 병렬 서브에이전트 분석 후 적용(회귀 2건 사전 차단). ①`/api/projects/save` fabricJson `PageJsonV1Schema.safeParse` 검증(빈 페이지 `{}` 허용해 신규페이지 저장 회귀 차단) ②admin remotePatterns 실호스트 핀 ③비번 8→10자+영문·숫자 ④report 터미널상태(resolved/dismissed) 409 ⑤`env.ts` CRON_SECRET 필수화 + `instrumentation.ts` 부팅검증(진짜 production 한정=`VERCEL_ENV!=='preview'`, preview 서버env 미보유 대비) ⑥CSS 체커 in_layer 단순화. CRON_SECRET Vercel(prod/preview/dev) 등록 → 크론 인증 활성화. CI green·prod Ready.
- [x] [SEC-RLS-01] Supabase Security Advisor 대응 — @architect ✅ 2026-06-29 — public 전체 RLS 활성화(`ff7a6fb`) + 서버전용 9종 deny-all 정책(`9b7771e`) + 함수 search_path 고정·SECURITY DEFINER EXECUTE 회수(`674f0fc`). Advisor **Errors 0·Info 0**. prod 는 SQL Editor 직접 적용(MCP 는 다른 계정 소속이라 미접근). Leaked PW 보호는 Pro 전용이라 보류(Warning 1 잔존).
- [x] [DEMO-01] 데모 모드 — admin 런타임 토글로 인증 우회 시연 (옵션B) — @architect ✅ 2026-06-23 — 시연 시 로그인 없이 편집기 체험. **env 아닌 DB 플래그**(`FeatureFlag` 테이블, key='demoMode')로 재배포 없이 런타임 제어. **web 우회(최소범위)**: 데모 ON 시 미들웨어가 익명 `/editor`·`/api/projects` 통과 + `/api/search/poses` 익명 허용(읽기) — DB 쓰기(`/projects/save`)는 401 유지(localStorage 시연). `lib/feature-flags.ts` service-role 조회 + 30초 캐시 + **fail-closed**(조회 실패 시 인증 유지). **admin 제어**: 대시보드 `DemoModeToggle` 카드 + `GET/PATCH /api/admin/demo-mode`(curator+, audit). 마이그레이션 `20260623000000_feature_flag`(RLS ENABLE/정책 없음, prod 적용·검증). **end-to-end 실증**: ON→익명 /editor 200·포즈검색 200 / OFF→307 복구(~30초). 검증: web 24(데모 2)·admin 6(토글/권한) green · tsc 0 · lint 0 · migrate-smoke green. 런북 [demo-mode.md](../runbooks/demo-mode.md). 🚦 시연 후 OFF 필수.
- [x] [OPS-CRON-01] hard-delete cron 스케줄 등록 — @architect ✅ 2026-06-08 — `apps/web/vercel.json` `crons` 에 `/api/cron/hard-delete-users` 매일 18:00 UTC(03:00 KST) 등록. Vercel Cron 이 `CRON_SECRET` 설정 시 Authorization 헤더 자동 첨부. **휴먼 게이트 잔여**: ① 프로덕션 `CRON_SECRET` env 등록(미설정 시 401→파기 미실행), ② **배포 차단 해제** — 레포 PRIVATE 전환 후 Vercel(Hobby) 가 private 레포 배포를 BLOCK 중(2026-06-05~, 마지막 READY=`4c3d571`, 미배포 24커밋). 레포 PUBLIC 복귀 또는 Pro 업그레이드 필요 (핸드오프 §9 리스크 현실화). **✅ 2026-06-29 게이트 해소**: CRON_SECRET prod/preview/dev 등록 + 배포 정상(prod Ready) → 크론(hard-delete·freeze-seasons) 가동 시작 (FOLLOWUP-70-5).

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

## MODE — 산출물 모드(웹툰 / POD) 선택 (결정 2026-08-07, [ADR-0017](decisions.md#adr-0017--산출물-모드-웹툰--pod-를-프로젝트-생성-시-선택-2026-08-07))

> 웹툰 vs POD 는 **우선순위 문제가 아니라 모드 선택 문제**로 확정됐다. 같은 편집 코어·같은 AI
> 파이프라인 위에서 판형·지면 단위·출력만 갈라진다.
> **주의**: 현행 `ai-layout` 은 mm 좌표 전용이고 `capacity` 는 "고정 크기 페이지에 담기는가"로
> 계획한다. 웹툰은 수용량 초과가 **페이지 분할이 아니라 스트립 연장**이라 분할 전략 자체가 다르다.
> mm 와 px 를 한 타입에 섞지 않는다 — 섞으면 인쇄 사고로 직결된다.

- [ ] [MODE-01] `Project.mode('webtoon'|'pod')` + `Format.unit('mm'|'px')` 스키마 — 기존 Format 은 전부 `mm` 로 백필, 웹툰 프리셋(폭 690/800 · 세로 가변) 등록 — 🚦 마이그레이션 — @architect
- [ ] [MODE-02] 프로젝트 생성 UX — 모드 선택 화면 + 모드별 판형 목록 필터. 기존 프로젝트는 `pod` 로 표시 — @ui-designer + @admin-builder
- [ ] [MODE-03] `ai-layout` 웹툰 분기 — `capacity` 의 페이지 분할을 **스트립 연장**으로 대체(컷 간 여백·스크롤 리듬), safe/bleed 제약은 pod 모드에서만 적용 — @layout-composer
- [ ] [MODE-04] `editor-core` 세로 무한 캔버스 — 뷰포트 가상화(200객체 60fps 예산 유지), 컷 경계 가이드 — @editor-engineer
- [ ] [MODE-05] 웹툰 export — 이미지 시퀀스 + 단일 롱 이미지(플랫폼 업로드 규격: 폭 고정·분할 높이 상한) — @editor-engineer + @pdf-publisher
- [ ] [MODE-06] 웹툰 모드 채택률·품질 측정 — LAYOUT-04 지표를 스트립 기준으로 재정의(페이지당 → 화면 스크롤당) — @qa-tester

## M10+ (Parking)

- [ ] **SVG 어댑터 입점** — `editor-pose/adapters/svg.ts` + 인입 파이프라인 SVG 분기. 색상 슬롯 풀 지원([ADR-0011](decisions.md#adr-0011--포즈-자산-포맷-png-우선-svg-추후))
- [ ] AI 자동 더빙(TTS + 감정) — 별도 ADR
- [ ] AI 영상 생성(컷 → 모션) — 별도 ADR
- [ ] 협업 편집(Yjs + y-fabric) — `editor-history` OT 슬롯 활용

---

## SW-BIZ — 사업화 확장: AI 실가동 + 교육 커리큘럼 + 디자인 마켓플레이스 (2026-06-29)

> 출처: 「2026 혁신 소상공인 AI 활용지원사업」 사업계획 정립 과정에서 다관점 평가패널로 도출한 사업화 방향.
> 핵심 프레이밍 = **"AI로 혁신한 자사 제작공정의 외부화"** (별도 플랫폼/에듀테크 신사업이 아님). 결정 근거: [ADR-0016](decisions.md).

> **일정 위치**: (A) AI 실가동(AI-ACT-01~04)은 그랜트 STEP1 대응 — **근시일 우선 착수**. (B) EDU·(C) MARKET 모듈 스캐폴딩은 M7(결제)·M9(안정화) 이후 **후반 일정에 착수**.

### (A) AI 실가동·정밀화 시퀀스 — 개발 순서 재정의 (근시일 — 그랜트 STEP1)
이미 구축된 기반(M2/M4) 위에서 **'신규 개발'이 아니라 '실가동·정밀화'** 로 순서를 재정의한다.
- [ ] [AI-ACT-01] 시험용(mock) 임베딩 → 실 임베딩(voyage-3/text-embedding-3) 전환 + 1,058종 pgvector 재인덱싱 — 50쿼리 평가셋 검색정확도 baseline — 🚦 외부 API 키 (M2-04 후속) — @pose-curator + @scene-analyzer
- [x] [AI-ACT-02] 미매칭 자산 AI 2차 태깅 캐시 가동(M2-03b) + 자동배치 평가용 골든셋 확장 — @scene-analyzer ✅ 2026-08-05.
  · **전제 오류 실측 정정**: "미매칭 17건 = LLM 태깅 대상"은 착시였다 — 17건 전부 `중복` 폴더(사전 `skip:true`·LICENSE `include:false`·prod DB 미적재)이고 `stand` 규칙이 이미 커버. 원인은 tagger 가 **정책적 skip 과 사전 공백 미매칭을 둘 다 `matched:false`** 로 뭉뚱그린 것 → `FilenameTagResult.skipped` 분리 + 검증 스크립트가 skip 을 매칭률 분모에서 제외 → **실 매칭률 98.7% → 100%**(1,243/1,243), 현행 LLM 태깅 대상 **0건** 확정
  · `llm-tagger.ts` 신설 — M2-03b 의 실효 목적인 **신규 자산 fallback**. 캐시 우선 + `STORYWORK_LLM` env 하드 게이트(CI $0) + 키 부재 시 null 폴백(enhance.ts 선례), 사전 118종 어휘 sanitize(LLM 창작 키워드 차단), confidence 0.6 상한(사전 매칭보다 항상 낮게), 캐시 키에 모델 ID 포함(모델 변경 시 stale 제안 차단), `selectTaggingTargets()` 로 skip 자산 배제를 코드에 고정
  · **골든셋 10 케이스/16 조합 → 50 케이스/102 조합**(5 카테고리: 일상·감정·액션·소품·다인). 통합 후 실 하네스 재측정 **만족도 102/102 = 100%**(목표 70%). 신규 테스트 14 + satisfaction 51 green
- [ ] [AI-ACT-03] 라이브 LLM 대본분석 활성(M4-01-03, `AI_GATEWAY_API_KEY`) + 프롬프트 캐싱 대본 1건당 분석비 측정 — 🚦 외부 API 키 — @scene-analyzer
- [x] [AI-ACT-04] 자동배치 1차본 채택률 측정 체계 + baseline→target 리포트 — @layout-composer + @qa-tester ✅ 2026-08-05.
  · 평가 코퍼스 `data/eval/scripts/` **21편 / 217장면**(novel·screenplay·light-novel·diary·essay 5형식, 장면 수는 실제 analyze 로 실측 검증)
  · `ai-layout/adoption.ts` — 채택률 조작적 정의(**blocker 0 페이지 비율**)와 측정기. 실사용 로그 부재를 명시한 프록시이며 로그 도입 시 교체 계약을 문서에 고정. `dialogue-loss`·`speaker-missing` 은 compose 경고가 못 잡던 신규 지표(fabricJson↔원본 대조)
  · `scripts/measure-adoption.ts` — 전 파이프라인 통과 후 리포트(요약/verbose/JSON). LLM·DB 미사용으로 키 없이 결정론 재현
  · **baseline 실측: 채택률 13.8%(30/217) · 대사 보존 52.2%** — 기존 e2e 가 green 이던 구간에서 **대본 대사 절반이 유실**되고 있었음을 발견. 원인은 템플릿 말풍선 슬롯(1~3) < 장면당 대사(5~10). screenplay 최악(보존 29.9%·채택 0%), essay 최선(92.3%)
  · 리포트 [docs/eval/adoption-baseline-2026-08-05.md](../eval/adoption-baseline-2026-08-05.md) + 회귀 가드 테스트(하한 고정, 개선 시 상향)
  · target: 채택률 60% · 대사 보존 95% — 달성 경로는 아래 LAYOUT-03
- [x] [LAYOUT-03] 대사 수용량 기반 배치 개선 (AI-ACT-04 baseline 후속 — 최대 병목) — @layout-composer ✅ 2026-08-05.
  · **DoD 초과 달성: 채택률 13.8% → 100%(255/255) · 대사 보존 52.2% → 100%**(목표 60%/95%). `empty-slot` 61 → 0, `dialogue-loss` 152 → 0. 페이지 217 → 255(+17.5% — 대사를 버리지 않으려면 지면이 더 필요)
  · `capacity.ts` 신설 — `splitScenes`(연출 규칙) 뒤에 **수용량 재계획** 패스. 템플릿을 `templateId` 로 확정(compose 재매칭 표류 차단) → 합병이 대사·컷을 못 담으면 **합병 해제** → 단일 장면이 넘치면 `lineRanges` 로 **다중 페이지 분할**(균등 배분)
  · `template-match.ts` — 점수 전에 **구조적 실현 가능성 필터**: 필수 포즈 슬롯 ≤ 채울 인물 수(= `empty-slot` 61건의 직접 원인, 화자 0 장면에 2인 템플릿이 붙던 것) · 포즈 슬롯 ≥ 컷 수. 후보 소진 시 단계적 완화로 매칭은 항상 성공
  · `bubble-slots.ts` 신설 — safe area 안 격자에서 얼굴 가림 비용(BUBBLE-02) 최소 순 채택, 페이지 상한 6. **수용량 계산과 실제 생성이 같은 함수** → "계획 ≠ 실제 슬롯" 으로 대사가 새는 경로 없음
  · `compose.ts` 멀티 장면 말풍선 재작성 — 종전엔 **첫 장면 대사만** 꽂아 나머지 컷 대사가 통째 유실. 이제 페이지 전체 대사를 비용함수로 배치하고 앵커를 `장면::인물` 로 키잉해 대사가 자기 컷으로 모임
  · **골든 G5 기대값 정정**: 장면4×대사4=16 을 1페이지 four-cut(슬롯 4)으로 고정한 테스트가 **대사 12개 유실을 정답으로 박아두고 있었음**. 합병 해제 4페이지 + 16개 전량 배치로 교체, R2 커버리지는 page-split 30케이스 + 신규 G5b(수용량 안이면 합병 유지)가 유지
  · 실물 검증(지표 아닌 좌표): screenplay 20페이지·말풍선 72개 — safe area 밖 0 · 상호 겹침 0 · 빈 텍스트 0. 신규 테스트 31 (`capacity.test.ts` 25 + 회귀 가드 3 + 골든 3), ai-layout 191 green
  · 리포트 [docs/eval/adoption-layout03-2026-08-05.md](../eval/adoption-layout03-2026-08-05.md) · 회귀 가드 하한을 목표선(60%/95%)으로 상향
- [x] [SCRIPT-KO-04] 대사/지문 구분 (`AnalyzedLine.kind`) — LAYOUT-03 실측 후속 — @scene-analyzer ✅ 2026-08-07.
  · **페이지 255 → 218(−14.5%) · 장면당 1.175 → 1.005**, 채택률 100% · 대사 보존 100% 유지. screenplay 87 → 51(−41.4%): 17→10 · 20→11 · 19→10 · 12→10 · 19→10. LAYOUT-03 이 대사 유실을 페이지 증가(+17.5%)로 갚았던 부분이 되돌아옴
  · `AnalyzedLine.kind: 'dialogue'|'narration'|'direction'` + `line-kind.ts` — 파서는 항상 채우고, 기존 SceneDoc 은 `lineKindOf()` 폴백(화자 유무 = 종전 동작)으로 읽는다
  · `parse-screenplay.ts` — 헤딩 정규식을 `S#1.`·`S 1:`·`#3.`·`씬 2:`·`INT./EXT.` 로 확장(구분자 필수 → "장면이 바뀌었다" 오탐 차단). **헤딩은 라인이 아니라 `SceneMeta.location/timeOfDay` 로 흡수** — 배경 톤 추천이 실제로 쓰는 두 값. 종전에 통째로 버려지던 지문(`[...]`·`(...)`)은 `direction` 으로 보존
  · `caption-slots.ts` 신설 — 서술·지문은 캡션 박스로. **박스 하나가 연속 3줄·180자를 묶는다**(수용량이 늘어나는 실제 근거). 기하는 말풍선과 같은 격자(`generateGridSlots`)를 공유하고 말풍선을 먼저 배치해 침범 없음. 수용량 계산과 실제 묶음이 같은 함수(`groupCaptionLines`)
  · `capacity.ts` — 페이지 예산이 `{ bubbles, captionBoxes }` 둘로 분리. 분할은 두 예산을 동시에 지키는 그리디 2패스(균등 재분배가 페이지 수를 늘리면 1패스 유지)
  · **PDF 함정 회피**: 캡션을 개행 한 덩어리로 내보내면 pdf-lib `drawText` 가 페이지 기본 lineHeight(24pt)로 박스를 넘김 → 캡션은 **줄당 `text` 레이어**로 나가고 줄 위치를 ai-layout 이 계산. 신규 LayerKind 없음(Schema v1 `'text'` 재사용 — 편집기·PDF 어댑터 기존 경로)
  · 기존 기대값 1건 의도적 정정: "지문은 lines 에 포함되지 않는다" → "지문은 direction 으로 분리된다"(정보를 버리는 것을 정답으로 박아둔 테스트). 신규 테스트 21(`caption-slots.test.ts` 18 + 회귀 가드 3), ai-script 116 · ai-layout 209 green
  · 리포트 [docs/eval/adoption-script-ko-04-2026-08-07.md](../eval/adoption-script-ko-04-2026-08-07.md)
- [x] [LAYOUT-04] 배치 **품질** 지표 (LAYOUT-03 후속) — @layout-composer + @qa-tester ✅ 2026-08-07.
  · `quality.ts` 신설 — 5축 측정. **독립 축**(배치기가 최적화하지 않는 것 = 품질 판단 근거): 구도 균형·지면 밀도·대사 밀도. **의존 축**(배치기가 직접 최적화 = 회귀 감시용): 시선 흐름·얼굴 가림. 둘을 섞으면 "우리가 최적화한 것을 우리가 잘한다고 보고"하는 순환이 된다
  · baseline **종합 73.1% → 79.3%**(채택률 100%·대사 보존 100% 유지). 축별: 구도 균형 50.7% · 지면 밀도 62.5% · 대사 밀도 86.5% · 시선 흐름 100% · 얼굴 가림 회피 62.7%→**97.0%**
  · **지표가 곧바로 결함을 찾아냄** — 의존 축인 얼굴 가림이 62.7%(배치기가 최적화하는데도 낮음 = 고를 자리 자체가 잘못됨). 원인 분해: 말풍선 51.8% vs 캡션 0.5% → `preset-1on1-talk`/`bubble-left` **단일 슬롯**이 157페이지 전부에서 `pose-right` 얼굴을 덮고 있었다(이름과 달리 우상단 x0.48·y0.05 = 얼굴 x0.65~0.87·y0.1~0.38). 말풍선 2개를 하단 좌우로 이동(x0.04/0.52·y0.62). 생성 슬롯은 처음부터 0.0% — LAYOUT-03 의 얼굴가림 비용 정렬은 정상 작동했고 손으로 적은 프리셋만 검증을 안 받았던 것
  · 레이어 계약 추가: 말풍선 `meta.lineIndex` — 레이어 배열은 zIndex 정렬이라 대사 순서를 복원할 수 없다(시선 흐름 측정의 전제)
  · `measure-adoption.ts` 에 품질 섹션 통합(같은 compose 결과 재사용 = 추가 비용 0), JSON 에 `quality.independent/dependent`
  · 신규 테스트 22(`quality.test.ts`) + 회귀 가드 2(얼굴 가림 ≥0.8 · 종합 ≥0.7), ai-layout 234 green
  · 리포트 [docs/eval/layout-quality-2026-08-07.md](../eval/layout-quality-2026-08-07.md)
- [ ] [LAYOUT-05] 구도 균형 개선 (LAYOUT-04 실측 후속 — 가장 낮은 축 50.7%) — 말풍선을 하단으로 모으면서 무게중심이 내려간 트레이드오프 포함(57.0%→50.7%). 위아래 분산이 필요한데 `preset-1on1-talk` 는 포즈가 상단을 다 차지해 자리가 없다 → **포즈 슬롯 기하부터** 재설계. 곁들여 ①지면 밀도를 겹침 제외 합집합 면적으로 정확화(현재 근사·과대추정) ②생성 슬롯 격자를 3열 고정이 아니라 얼굴 위치 기반으로(잔여 얼굴 가림 3%) — @layout-composer

### (B) EDU — 교육 커리큘럼 (신규, 후반 일정 — M9 이후 착수)
StoryWork 편집기를 '대본만으로 웹툰 만들기' 교육 과정으로 패키징 — 자사 제작 노하우의 외부화. 모듈: [`edu-curriculum`](../modules/index.md).
- [ ] [EDU-01] 교육 데이터모델(Course/Lesson/Enrollment/Progress) + Prisma 마이그레이션 — 🚦 마이그레이션 — @architect
- [ ] [EDU-02] B2C 온라인 강의(수강/진도/수료) — LMS-lite + 편집기 연동 실습 — 🚦 결제(MARKET-02/M7-01) 선행 — @admin-builder + @ui-designer
- [ ] [EDU-03] B2B 기관 과정 패키지(단체 계정/워크스페이스/대량 좌석) — @architect + @admin-builder
- [ ] [EDU-04] 편집기 내 튜토리얼·가이드 모드(교육용 단계 템플릿) — @editor-engineer + @ui-designer

### (C) MARKET — 디자인 마켓플레이스 + 정산 (COMMERCE-01/03 승격·구체화, 후반 일정 — M9 이후 착수)
외부 캐릭터 디자이너가 자산을 등록·판매하고 수수료를 공유하는 양면시장. **공급측 KPI(디자이너 온보딩) 우선**. 모듈: [`marketplace`](../modules/index.md).
- [ ] [MARKET-01] 디자이너 자산 등록·검수 파이프라인 — 마이데이터(M7-03) + admin 검수(M3-04) + AI 2차 태깅(AI-ACT-02) 재사용. **AI 생성 에셋 허용 + 생성 표기 의무**([ADR-0018](decisions.md#adr-0018--디자인-마켓-ai-생성-에셋-허용--생성-표기-의무-2026-08-07)): 등록 폼에 `isAiGenerated`·`generatorModel`·상업 사용 가능 여부 필수, 누락 시 등록 거부, 상세 페이지 표시 — @admin-builder + @pose-curator
- [ ] [MARKET-05] 신고·사후 내림(takedown) 절차 — 타인 저작물 학습·모사 신고 채널 + 처리 SLA. 마켓 오픈 **전** 필수(ADR-0018) — @architect
- [ ] [MARKET-02] 거래/결제(Stripe Checkout, M7-01 의존) + 수수료 25% 정책 (COMMERCE-01 구체화) — 🚦 결제·가격 — @architect
- [ ] [MARKET-03] 정산 시스템(월별 수익정산 + 세금계산서) (COMMERCE-03) — 🚦 정산·세무 — @architect
- [ ] [MARKET-04] 공급자 KPI 대시보드(디자이너 온보딩/GMV/수수료) — 목표 온보딩 Y1 30 → Y3 300명 — @admin-builder

### (D) 수익 모델 — 3개년 보수 추정 (단위: 만원)
기반(POD·구독) + 확장(교육·마켓). 현재 유료고객 0(결제 미구현)에서 출발 → 결제·온보딩 가동 첫해(Y1) 보수 산정.

| 수익원 | Y1 | Y2 | Y3 | 가정 |
|---|--:|--:|--:|---|
| POD 인쇄 | 800 | 2,400 | 4,800 | 건당 순마진 8천 × 1,000/3,000/6,000건 |
| 크리에이터 구독 | 2,160 | 9,000 | 21,600 | 연 ARPU 18만 × 120/500/1,200명 |
| 교육 B2B | 900 | 3,000 | 6,000 | 회당 300만 × 3/10/20건 |
| 교육 B2C | 900 | 3,600 | 9,000 | 객단가 9만 × 100/400/1,000명 |
| 디자인 마켓 수수료 | 500 | 2,000 | 5,000 | GMV 2,000/8,000/20,000 × 25% |
| **합계** | **≈5,300** | **≈20,000** | **≈46,400** | 연 2~3배 보수 성장 |

> ⚠️ 가정 기반 추정. top-line만(영업·강사·검수 인건비 선행 투입 별도). 마켓 GMV는 공급자 확보에 강하게 연동. 실데이터로 보정 필수.

---

## 작업 추가 규칙
- 신규 작업은 **마일스톤 + ID** 부여, DoD 한 줄, 책임 에이전트 명시
- 휴먼 게이트(결제/마이그레이션/배포/가격)는 `🚦` 이모지 표시
