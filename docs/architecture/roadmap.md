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

## M1 — Editor Core MVP

- [x] [M1-01] `editor-core` 패키지 스캐폴드 + fabric v6 어댑터 — 헤드리스 단위 테스트 통과 — @editor-engineer ✅ 2026-05-05 (커밋 f3e5c83..02e3fb6) — 67 tests pass, 100객체 라운드트립 157ms (<200ms 임계), 5 골든 라운드트립 100%
- [x] [M1-02] Schema v1 + 라운드트립(JSON ↔ fabric) — 골든 파일 5개 통과 — @editor-engineer ✅ M1-01 에 포함됨 (5 골든: empty/single-pose/pose-with-bg/grouped/locked)
- [x] [M1-03] `editor-layers` — 레이어 트리/잠금/그룹 — @editor-engineer ✅ 2026-05-05 (커밋 ed8091c) — 85 tests pass, 골든 3개 라운드트립, fabric 양방향 동기화, lock/hidden propagation
- [x] [M1-04] `editor-history` Command + 100스텝 라운드트립 — @editor-engineer ✅ 2026-05-05 (커밋 a44dcd5) — 63 tests, 100-step random sequence undo/redo OK, coalesce 5→1, OT slot, recursive lock/hidden undo
- [x] [M1-05] `editor-export` PNG/JSON — 비주얼 회귀 5장 — @editor-engineer ✅ 2026-05-05 (커밋 4468324) — 43 tests pass, 5 golden PNG visual regression (pixelmatch diff=0), DirtyTracker debounce autosave, PDF mock interface
- [ ] [M1-06] `apps/web` 빈 페이지 편집기 셸 — 포즈 1 + 배경 1 올리고 저장/복원 — @editor-engineer + @ui-designer
- [ ] [M1-07] 모바일 인스펙터 BottomSheet — 핀치 줌, 44px 타겟 — @ui-designer

## M2 — Pose Library (PNG 1차, 1,058개 적재)

- [ ] [M2-01] `scripts/ingest-poses.ts` PNG 파이프라인 — `LICENSE.json` 폴더 디폴트 로딩 + 매직바이트 + EXIF strip + sharp 재인코딩 + WebP 파생본, 적재 ≥ 95% — @pose-curator
- [ ] [M2-02] 키포인트 **3점 자동 추정**(head/mouth/center) — 신뢰도 < 0.5 검수 큐, 누락 키포인트 의존 기능 자산별 비활성 (ADR-0011b) — @pose-curator
- [ ] [M2-03a] **파일명 키워드 사전(1차 무료 태깅)** — `data/filename-action-dict.ko.json` 작성, 매칭률 70%+ 목표 — @pose-curator
- [ ] [M2-03b] 미매칭 자산만 Claude API 2차 태깅(캐시) — 종합 정확도 ≥ 85% — @pose-curator + @scene-analyzer
- [ ] [M2-04] pgvector 인덱스(시각+텍스트 임베딩) + 시맨틱 검색 API — top-10 정확도 ≥ 0.7 — @pose-curator + @architect
- [ ] [M2-05] 검색 UI(필터: bodyType/view/action/mood, format, lowDpi 토글) — 키보드 사용 가능 — @ui-designer
- [ ] [M2-06] **slug 정규화** — 한글/공백/괄호 → URL-safe, `originalFilename` 보존 — @pose-curator
- [ ] [M2-07] **lowDpi 슬롯 제약** — `ai-layout` 가 lowDpi 자산을 페이지 1/2 이하 슬롯에만 배치 (ADR-0011a) — @layout-composer
- [ ] [M2-08] 키포인트 검수 편집기(관리자) — 클릭으로 누락 점 보강 — @admin-builder + @editor-engineer
- [ ] [M2-09] PNG 색상 변경 보조: `tintMaskUrl` 기반 BlendColor 데모 (마스크 미보유 시 UI 비활성) — @editor-engineer

## M3 — Admin Console

- [ ] [M3-01] `apps/admin` 부트스트랩 + 별도 도메인 + 2FA — 일반 사용자 우회 차단 — @architect + @admin-builder
- [ ] [M3-02] DataTable/EntityForm/ReviewQueue 공용 컴포넌트 — Storybook — @admin-builder + @ui-designer
- [ ] [M3-03] Format CRUD — B5/A5/정사각/세로형 프리셋 — @admin-builder
- [ ] [M3-04] Resource CRUD + 검수 큐 + 일괄 액션 — 1,000개 PNG ZIP(`<id>.png` + `<id>.kp.json` 페어 검증) < 60초 — @admin-builder
- [ ] [M3-05] Template/TemplateSet 빌더 — 슬롯 정의 UI — @admin-builder + @editor-engineer
- [ ] [M3-06] Audit Log 패널 — 모든 상태 전환 기록 — @admin-builder

## M4 — AI Pipeline

- [ ] [M4-01] `ai-script` 분석기 + 골든셋 20 — F1 ≥ 0.8 — @scene-analyzer
- [ ] [M4-02] `ai-recommend` 포즈/배경/말풍선 추천 — 만족도 ≥ 70% — @scene-analyzer
- [ ] [M4-03] `ai-layout` compose() + 결정론 시드 — 충돌 0, safe 침범 0 — @layout-composer
- [ ] [M4-04] 사용자 흐름: 대본 → 자동 페이지 N개 — E2E 통과 — @layout-composer + @editor-engineer
- [ ] [M4-05] alternatives UI(한 클릭 교체) — 모바일에서도 동작 — @ui-designer

## M5 — Text/Bubble/Effects/Templates

- [ ] [M5-01] `editor-text` 한글 줄바꿈/금칙어 + textbox 변형 — 시각 회귀 — @editor-engineer
- [ ] [M5-02] 말풍선 꼬리 자동 화자 추적 — 입 키포인트로 — @editor-engineer + @layout-composer
- [ ] [M5-03] `editor-effects` 워드효과 50종 + 필터 — 모바일 30fps — @editor-engineer
- [ ] [M5-04] `editor-template` 템플릿 적용/저장 — 슬롯 매핑 — @editor-engineer

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
- [ ] **[FOLLOWUP-16] Storige 가이드 P0 핫픽스 8건 (M1-07 진입 전 권장) — @editor-engineer**
  근거: [docs/reference/STORIGE_GUIDE_REVIEW.md](../reference/STORIGE_GUIDE_REVIEW.md) §3, §9
  - StoryCanvas 익명 이벤트 핸들러 7건 → bound member + dispose() off (BUG-002 류)
  - StoryCanvas 모든 핸들러 첫 줄 `if (!_canvas?.getContext()) return` 가드
  - StoryCanvas factory 에 `isCoarsePointer()` 분기 (`enableRetinaScaling`, `cornerSize`, `touchCornerSize`, `padding`, `renderOnAddRemove:false`) — BUG-006 류 모바일 메모리
  - editor-history `History` capacity 모바일 자동 분기 (15/200)
  - apps/web `EditorShell` 의 `useState<StoryCanvas>` → `useRef + Context` (가이드 §25 ❌ 위반)
  - apps/web `globals.css` 에 `touch-action:none` + `body { overscroll-behavior:none }`
  - Next.js metadata.viewport 에 `user-scalable=no, viewport-fit=cover`
  - `window.addEventListener('unhandledrejection')` 글로벌 핸들러 (BUG-015 React freeze 방지)
- [ ] [FOLLOWUP-17] M1-07 진입 시 ResizeObserver 3중 가드 + TouchEvent getEventPoint + ControlBar `position:fixed` 적용 (BUG-013 iOS 크래시 차단) — @ui-designer + @editor-engineer
- [ ] [FOLLOWUP-18] extendFabricOption 화이트리스트 정의 — Schema v1 의 fabric 내부 커스텀 속성(styles/charSpacing/cmykFill 등) 보존 강제 — @editor-engineer (M5 텍스트 작업 직전)

## ☁️ Vercel 배포 상태 (M0 종료 시점)
- **admin**: https://storywork-editor-admin.vercel.app ✅ 200 — env 16, root `apps/admin`, vercel.json (turbo build)
- **web**: https://storywork-editor-web.vercel.app ⚠️ 404 — build READY 후 promotion ERROR. FOLLOWUP-15 로 추적, M1 결과물로 재검증 예정

## M10+ (Parking)

- [ ] **SVG 어댑터 입점** — `editor-pose/adapters/svg.ts` + 인입 파이프라인 SVG 분기. 색상 슬롯 풀 지원([ADR-0011](decisions.md#adr-0011--포즈-자산-포맷-png-우선-svg-추후))
- [ ] AI 자동 더빙(TTS + 감정) — 별도 ADR
- [ ] AI 영상 생성(컷 → 모션) — 별도 ADR
- [ ] 협업 편집(Yjs + y-fabric) — `editor-history` OT 슬롯 활용

---

## 작업 추가 규칙
- 신규 작업은 **마일스톤 + ID** 부여, DoD 한 줄, 책임 에이전트 명시
- 휴먼 게이트(결제/마이그레이션/배포/가격)는 `🚦` 이모지 표시
