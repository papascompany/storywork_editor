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
- [ ] [M2-07] **lowDpi 슬롯 제약** — `ai-layout` 가 lowDpi 자산을 페이지 1/2 이하 슬롯에만 배치 (ADR-0011a) — @layout-composer (M4 진입 직전 처리)
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

- [ ] [M4-01] `ai-script` 분석기 + 골든셋 20 — F1 ≥ 0.8 — @scene-analyzer
- [ ] [M4-02] `ai-recommend` 포즈/배경/말풍선 추천 — 만족도 ≥ 70% — @scene-analyzer
- [ ] [M4-03] `ai-layout` compose() + 결정론 시드 — 충돌 0, safe 침범 0 — @layout-composer
- [ ] [M4-04] 사용자 흐름: 대본 → 자동 페이지 N개 — E2E 통과 — @layout-composer + @editor-engineer
- [ ] [M4-05] alternatives UI(한 클릭 교체) — 모바일에서도 동작 — @ui-designer

## DESIGN-SYS — Admin/Editor Nike 안정화 (2026-05-15)

- [x] [DESIGN-01] 루트 `DESIGN-nike.md` SSOT 추가 — admin/editor 작업자가 같은 디자인 기준을 읽음 — @ui-designer
- [x] [DESIGN-02] admin `mkt-*` 직접 사용 제거 — `rg -n "mkt-|--mkt-" apps/admin` 0건 — @admin-builder
- [x] [DESIGN-03] editor chrome Nike-neutral bridge — `/editor` scope `--editor-*` 가 ink/canvas/soft-cloud/hairline 기준으로 동작 — @editor-engineer
- [x] [PERF-ADMIN-01] admin navigation 4초 지연 1차 개선 — auth cache + query payload 축소 + route loading skeleton — @architect
- [ ] [DESIGN-04] 시각 회귀 자동화 — `/login`, `/reset-password`, `/403`, admin nav, `/editor` desktop/mobile snapshots — @qa-tester
- [ ] [PERF-ADMIN-02] 실제 navigation timing 측정 — local/prod waterfall 로 P75 목표 수립 — @qa-tester + @architect

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

- [ ] [M6-01] `pdf-engine` 벡터 빌더 + 표지 — 결정론 출력 — @pdf-publisher
- [ ] [M6-02] `apps/workers` Inngest 잡 + 진행 % 푸시 — 16p ≤ 6초 — @pdf-publisher + @architect
- [ ] [M6-03] preflight 검증기 — 인쇄소 3사 통과 — @pdf-publisher + @qa-tester
- [ ] [M6-04] 인쇄소 사양 프리셋 + 등록 UI — 관리자 추가 가능 — @admin-builder + @pdf-publisher

## M7 — Creator Mode + Billing

- [ ] [M7-01] Stripe 연결 + Webhook 멱등 — 재처리 테스트 — @architect
- [ ] [M7-02] 구독 플랜 게이트(업로드 한도/공유 토글) — RLS + 미들웨어 이중 — @architect
- [ ] [M7-03] 마이데이터 패널 — 편집기 드래그 인서트 — @admin-builder + @editor-engineer
- [ ] [M7-04] 결제/요금 페이지 — 모바일 대응 — @ui-designer

## M8 — Social

- [ ] [M8-01] OG 이미지 자동 생성(nano-banana 2) — Lighthouse SEO 100 — @ui-designer
- [ ] [M8-02] 공모전 시즌 모듈 + 자동 동결 — pg_cron — @admin-builder
- [ ] [M8-03] 뽐내기 갤러리 + 좋아요/댓글 — 무한 스크롤 모바일 — @ui-designer + @admin-builder
- [ ] [M8-04] SNS 공유 카드(카카오/X/페북) — 검증 — @ui-designer

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
- [ ] **[FOLLOWUP-58] (P2) 회고 §7.4 SOP 에 Step 0 deploy/build sanity 삽입** — UI 피드백 처리 트리에 0단계 "prod CSS hash 최신 + 변경 utility 존재 확인" 추가. ui-spec 슬래시 커맨드 + ui-designer agent 프롬프트 갱신 → "코드 변경했는데 안 보임" 함정 차단 — @architect + @ui-designer
- [x] **[FOLLOWUP-54] (P1) visual-check 인프라 한계 보강** ✅ 2026-05-17 — 산출: `scripts/visual-check.ts` 에 `--url`/`--click`/`--seed-storage`/`--device`/`--wait-for-selector`/`--emulate-media` 6개 옵션 추가, `scripts/visual-check.sh` passthrough + 빈 배열 unbound 버그 fix, `.claude/commands/visual-check.md` 사용 예시 갱신, `docs/process/ui-feedback-workflow.md` 신규 옵션 기록. 검증: `pnpm visual-check --url https://storywork-editor-web.vercel.app/editor` prod 캡처 정상. dev 의 panel click 은 FormatPickerModal dismissable=false 라 `--seed-storage` 또는 chain click 필요(`--click` 자체 정상). @architect
- [x] **[FOLLOWUP-49] (P1) `apps/web` typecheck + test 부채** — vitest.config.ts `@/` alias 추가 + setup.ts Supabase env 주입 + users.test.ts mock `as never` 타입 단언으로 5개 marketing 테스트 파일 (og/landing/features/intro/showcase-derbyman) 통과. typecheck 1건(users.test.ts L35) 수정. typecheck/test script echo 스킵 해제. 27개 테스트 파일 407 tests all pass — SHA: effce8c
- [x] **[FOLLOWUP-50] (P1) `apps/storybook` Storybook 8.x type migration** — 11개 stories 파일 meta에 `args: {}` 기본값 추가 (render() 전용 스토리 args optional화). `StickyNote` 컴포넌트 `style` prop 추가. storybook tsconfig + vite main.ts 에 `@/` alias 추가. `AdminResourceUpload` unknown→string 타입 수정. typecheck/build script echo 스킵 해제. storybook build 통과 — SHA: effce8c
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
