# Roadmap — 오토파일럿 작업 큐

> 이 파일은 **단순한 체크리스트**다. orchestrator 는 위에서 아래로 미완 항목을 픽한다.
> 각 항목 형식: `- [ ] [ID] 제목 — DoD 한 줄 — @책임에이전트`

---

## M0 — Bootstrap

- [x] [M0-01] pnpm + Turborepo 모노레포 초기화 — `pnpm i && pnpm build` 무오류 — @architect ✅ 2026-04-26 (커밋 ed7c2db..7c9d4e4)
- [x] [M0-02] tsconfig.base + ESLint(import/no-restricted-paths) — 패키지 역참조 시 lint 실패 — @architect ✅ M0-01 에 포함됨 (※ eslint-import-resolver-typescript 추가 권고 → 후속 이슈)
- [ ] [M0-03] Supabase 로컬 + Prisma schema v1 — `prisma migrate dev` 통과 — @architect
- [x] [M0-04] 디자인 토큰 + shadcn 베이스 + Storybook — 토큰/기본 컴포넌트 가시화 — @ui-designer ✅ 2026-04-26 (커밋 030e466..0292375). 토큰 8종 + 컴포넌트 5개(Button/Input/Card/Dialog/Sheet) + Storybook 5스토리 + ThemeProvider, axe a11y 0 위반
- [ ] [M0-05] CI(lint/typecheck/test/build) GitHub Actions — main 브랜치 보호 + 5개 잡 green — @architect
- [ ] [M0-06] Sentry/PostHog 부트스트랩 — 두 앱에서 테스트 이벤트 수신 — @architect

## M1 — Editor Core MVP

- [ ] [M1-01] `editor-core` 패키지 스캐폴드 + fabric v6 어댑터 — 헤드리스 단위 테스트 통과 — @editor-engineer
- [ ] [M1-02] Schema v1 + 라운드트립(JSON ↔ fabric) — 골든 파일 5개 통과 — @editor-engineer
- [ ] [M1-03] `editor-layers` — 레이어 트리/잠금/그룹 — Storybook 인터랙션 — @editor-engineer
- [ ] [M1-04] `editor-history` Command + zundo — 100스텝 라운드트립 — @editor-engineer
- [ ] [M1-05] `editor-export` PNG/JSON — 비주얼 회귀 5장 — @editor-engineer
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

## M10+ (Parking)

- [ ] **SVG 어댑터 입점** — `editor-pose/adapters/svg.ts` + 인입 파이프라인 SVG 분기. 색상 슬롯 풀 지원([ADR-0011](decisions.md#adr-0011--포즈-자산-포맷-png-우선-svg-추후))
- [ ] AI 자동 더빙(TTS + 감정) — 별도 ADR
- [ ] AI 영상 생성(컷 → 모션) — 별도 ADR
- [ ] 협업 편집(Yjs + y-fabric) — `editor-history` OT 슬롯 활용

---

## 작업 추가 규칙
- 신규 작업은 **마일스톤 + ID** 부여, DoD 한 줄, 책임 에이전트 명시
- 휴먼 게이트(결제/마이그레이션/배포/가격)는 `🚦` 이모지 표시
