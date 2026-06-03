# ADR — Architecture Decision Records

> 형식: 짧게. 결정/맥락/대안/결과만. 한 결정 한 항목.

---

## ADR-0001 — fabric.js v6 채택
- **결정**: 캔버스 엔진은 fabric.js v6 사용
- **맥락**: 사용자 요구사항. 레이어/그룹/SVG 일급 지원, 풍부한 커뮤니티
- **대안**: Konva (React 친화적이나 SVG 핸들링 약함), Excalidraw 코어(스타일 잠겨 있음)
- **결과**: 모든 캔버스 코드는 `editor-core` 어댑터 뒤에 둔다(엔진 교체 비용 격리)

## ADR-0002 — Next.js 15 App Router + RSC + Server Actions
- **결정**: 풀스택 단일 코드베이스
- **이유**: 편집기는 클라이언트 무거움 + 관리자/PDF는 서버 무거움 → 같은 레포에서 관리하는 편이 빠름
- **대안**: Remix(SSR 우수), 분리된 SPA + API(역할 분리 명확하나 빌드/CI 비용)
- **트레이드오프**: RSC + 캔버스 라이브러리는 클라이언트 경계 표시(`"use client"`)에 신경

## ADR-0003 — 모노레포 (pnpm + Turborepo)
- **결정**: 모노레포로 시작
- **이유**: `editor-*` 패키지 재사용성 보장 + 변경 영향 범위를 캐시로 관리
- **대안**: 멀티레포(통합 비용↑), nx(러닝커브)

## ADR-0004 — Supabase + Prisma
- **결정**: DB는 Postgres(Supabase), ORM은 Prisma
- **이유**: RLS + Auth + Storage 통합. Prisma 의 타입 안정성
- **대안**: Drizzle(가벼우나 마이그레이션 도구 약함), Neon + 직접 RBAC(구축 비용)
- **주의**: Prisma 의 RLS 우회 가능성 → 서버 액션은 RLS 통과 클라이언트 사용

## ADR-0005 — pgvector 시맨틱 검색
- **결정**: 임베딩 저장/검색은 pgvector
- **이유**: DB 한곳, 운영 단순. 인덱스: ivfflat + cosine
- **대안**: Pinecone/Weaviate(관리형이나 비용/지연), Qdrant(추가 인프라)

## ADR-0006 — fabricJson Schema 버저닝
- **결정**: `Page.fabricJson` 은 자체 schema. 마이그레이터 보관, in-place 수정 금지
- **이유**: 사용자 작품을 영원히 열 수 있어야 함
- **결과**: 모든 schema 변경은 forward 마이그레이터 + 골든 파일 회귀 테스트

## ADR-0007 — 자동 배치는 결정론적
- **결정**: `ai-layout.compose()` 는 seed 입력 → 동일 출력
- **이유**: 사용자 작품 재현/디버그/회귀 테스트
- **수단**: 모델 호출은 캐시, 의사난수는 명시 시드

## ADR-0008 — PDF는 벡터 우선
- **결정**: `@react-pdf/renderer` 로 벡터, 폴백만 래스터
- **이유**: 인쇄 품질 + 파일 크기
- **알려진 한계**: 일부 fabric 효과(그림자/필터)는 래스터 폴백

## ADR-0009 — AI 생성 이미지의 위치
- **결정**: nano-banana 2 결과물은 보조(배경/공유 카드)로만. 핵심 캐릭터/포즈는 큐레이션된 사람 검수 자산
- **이유**: 일관성·라이선스·브랜드 보호

## ADR-0010 — i18n
- **결정**: ko 우선, en 점진. 키는 코드 옆 `.json`, CI 가 누락 키 검사
- **대안**: 키 자동 추출(react-intl), DB 기반(과잉)

## ADR-0011 — 포즈 자산 포맷: PNG 우선, SVG 추후
- **결정**: 포즈 라이브러리의 1차 포맷은 **PNG(투명 배경)**. SVG 는 향후 동일 파이프라인에 어댑터로 입점
- **맥락**: 현 시점 보유 자산 = **PNG 1,058개, 750×750(96%) 알파 채널 보유**. SVG 변환 비용 + 일정 우선
- **결과**:
  - `Resource.format` 컬럼 도입(`png|svg|webp`). 추후 SVG 추가 시 마이그레이션 불필요
  - 키포인트는 **사이드카 JSON**(`<id>.kp.json`)으로 통일 — 포맷 무관 동일 스키마(`PoseSidecar`)
  - 색상 변경(팔레트 슬롯)은 PNG 단계에선 fabric `BlendColor` 필터 + 선택적 `tintMaskUrl` 로 보조
  - 보안: PNG 매직바이트 검증 + EXIF strip + sharp 재인코딩(악성 페이로드 차단)
- **트레이드오프**:
  - PNG 는 색상 변경/무한 확대 불가 → 슬롯 크기 자동 제한으로 보완
  - 파일 크기 증가 → sharp 가 WebP/AVIF 파생본 자동 생성 + CDN
- **롤백**: 포맷 정책 변경은 새 ADR 로. 기존 PNG 자산은 영구 호환
- **관련 작업**: M2-01 ~ M2-07 (PNG 우선), M10+ 로 "SVG 어댑터 입점" 별도 항목

### ADR-0011a — 해상도 정책 (현실 반영, 2026-04-26 갱신)
- **현황**: 보유 자산의 96% 가 750×750. 권장 1500px 미달
- **결정**: 750×750 자산도 **그대로 적재**한다. 단, `lowDpi` 태그를 자동 부여하고 `ai-layout` 의 슬롯 매칭 시 다음을 강제:
  - **lowDpi 자산은 페이지 한 변의 `1/2` 이하 슬롯에만 배치 가능**(B5 기준 인물 인쇄 환산 ≥ 200dpi 보장)
  - 그 이상으로 강제 확대하려는 사용자 액션 → 인스펙터에 경고 배지 + preflight 단계에서 warning
  - 5000px / 4252px 등 고해상도 자산은 풀 페이지 슬롯 가능
- **계산식**: `effectiveDpi = (assetMinSide / slotMaxSideMm) * 25.4`. 200 미만이면 warn, 150 미만이면 error
- **사용자 영향**: 작은 컷/말풍선 컷에서는 자유롭게 사용. 풀샷 단독 페이지는 고해상도 자산 또는 향후 업스케일 자산이 우선

### ADR-0011b — 키포인트 자동 추정 범위 (최소 3점)
- **결정**: 사이드카 미보유 자산은 **머리(head) · 입(mouth) · 중심(center)** 3개 키포인트만 자동 추정해 인입한다. 나머지 22개는 비워둔다
- **이유**: MediaPipe 등 범용 추정기는 2D 일러스트 캐릭터의 손/발 정확도가 낮음. 핵심 자동화(말풍선 꼬리, 인물 위/아래/좌/우 배치)는 3점으로 충분
- **결과**:
  - `PoseMeta.keypoints[]` 에 3점만 들어감. 모두 `inferred=true`
  - 누락 키포인트 의존 기능(예: 손에 소품 자동 부착)은 **그 자산에서 비활성**, UI 에 옅은 안내
  - 사용자/관리자가 후속 보강 가능(검수 큐의 키포인트 편집기에서 클릭으로 추가)
- **품질 게이트**: 추정 신뢰도 < 0.5 인 경우 검수 큐로 진입(`status=review`)

### ADR-0011c — 라이선스 메타 상속 규칙
- **결정**: 폴더 루트의 `LICENSE.json` 을 **폴더 디폴트 라이선스**로 사용한다. 개별 사이드카(`<id>.kp.json`)에 `license` 필드가 있으면 그것이 우선
- **이유**: 1,058개 자산에 동일 라이선스를 매번 적는 것은 무의미. SSOT 1곳에서 관리
- **결과**:
  - 인입 파이프라인은 폴더를 스캔할 때 `LICENSE.json` 을 먼저 로드 → 모든 자산에 자동 상속
  - 사이드카에 `license` 가 있으면 자산별 오버라이드(향후 외부 라이선스 자산 섞일 때 대비)
  - `LICENSE.json` 누락 + 사이드카에도 license 없음 → 적재 거부
- **현재 적용**: `data/poses/raw/LICENSE.json` 에 `holder=StoryWork`, `terms=all-rights`, `commercialUse=true`

## ADR-0012 — ESLint 룰 통일: `no-explicit-any: error` + `--max-warnings 0`

- **결정**: 모노레포 전체의 ESLint 를 단일 root `eslint.config.js` 로 통일하고, 모든 lint 스크립트에 `--max-warnings 0` 을 강제한다
- **맥락**: M3-04(e58730c), M5-02, M5-04(44727eb) 에서 3번 동일한 `(x: any)` 패턴이 반복됐다. 패키지 lint(`pnpm --filter <pkg> lint`)는 통과하지만 `next build` 가 내부적으로 더 엄격한 설정으로 ESLint 를 실행해 Vercel 빌드 실패로 이어졌다
- **근본 원인**:
  1. 패키지 lint 스크립트: `eslint src --ext .ts` — `--max-warnings 0` 없이 warning=exit 0
  2. apps lint 스크립트: `next lint` — Next.js 15 에서 deprecated, `--max-warnings -1`(무제한) 기본값
  3. `next build` 는 내부적으로 ESLint 를 `--max-warnings 0` 수준으로 실행 → 빌드 단계에서만 실패 발견
- **결정 내용**:
  - root `eslint.config.js`: `@next/eslint-plugin-next` Flat Config 통합, 테스트/스토리/백업 파일 적절히 제외
  - 패키지 lint 스크립트: `eslint src --ext .ts` → `eslint src --max-warnings 0`
  - apps lint 스크립트: `next lint` → `eslint . --max-warnings 0`
  - `lint-staged`: `eslint --fix` → `eslint --fix --max-warnings 0`
  - ESLint 9 Flat Config 에서 `--ext` 플래그는 deprecated — `files` 배열로 대체됨
  - 백업 파일(`* 2.tsx`) 은 ignores 에 추가
- **결과**: `pnpm lint` == `next build` 엄격도 동등 보장. 로컬 lint 통과 = Vercel 빌드 통과
- **에이전트 영향**: `.claude/agents/{architect,admin-builder,editor-engineer,ui-designer}.md` 에 검증 섹션 추가
- **위반 수정 내역** (이번 PR):
  - `apps/web/components/editor/panels/PoseGridItem.tsx`: `<img>` → `<Image />`
  - `apps/web/components/editor/TopBar.tsx`: `<a href="/">` → `<Link href="/">`
  - `apps/admin/...` 8개 파일: `<img>` → `<Image />` (blob URL 예외 1건은 eslint-disable 주석)

---

## ADR-0013 — Tailwind v4 monorepo `@source` directive 의무화

- **결정**: `packages/shared-ui/src/styles/globals.css` 의 `@import 'tailwindcss'` 직후 `@source` directive 로 monorepo 의 모든 source 경로(apps/web, apps/admin, packages) 를 명시한다. 신규 패키지에 className 사용처 추가 시 `@source` 갱신 의무.
- **맥락**: 2026-05-17 회고 (Layer 3). Tailwind v4 의 자동 source detection 은 `@import 'tailwindcss'` 가 위치한 CSS 파일의 **package** 만 scan 한다. shared-ui 안에 entry 가 있고 utility 사용처는 `apps/web/components/**`, `apps/admin/components/**`, `packages/editor-*/src/**` 에 있으므로 **utility 가 아예 생성되지 않는 사일런트 버그** 발생. prod CSS 의 `.p-N` rule count = 0. 회고 §3 spacing 12 commits 가 헛수고였던 진짜 root cause 중 하나.
- **결정 내용**:
  ```css
  @import 'tailwindcss';
  @source "../../../../apps/web";
  @source "../../../../apps/admin";
  @source "../../../../packages";
  ```
- **회귀 방지**:
  - FOLLOWUP-55 — CI 에 빌드 산출물 CSS sanity check 추가
  - 신규 패키지/앱 추가 시 PR 체크리스트에 `@source` 갱신 항목
- **fix commit**: `14bdeb8` (2026-05-17)

## ADR-0014 — Layer 밖 universal `*` selector reset 금지

- **결정**: `* { margin: 0; padding: 0 }` 같은 layer 밖 universal box-model reset 을 두지 않는다. Tailwind v4 의 preflight (`*, ::backdrop, ::after, ::before` in `@layer base`) 만 사용한다.
- **맥락**: 2026-05-17 회고 (Layer 2). `packages/shared-ui/src/styles/globals.css:227-230` 의 무명 `* { margin: 0; padding: 0 }` 가 Tailwind 의 `@layer utilities .p-N` 보다 **cascade 순서상 뒤**에 와서 padding utility 를 모두 0 으로 덮어씀. prod CSS 에 `.p-5{padding:calc(var(--spacing) * 5)}` rule 이 있어도 `computed paddingLeft: 0px`. gap 은 작동(padding 만 reset 됨)하는 비대칭 증상.
- **anti-pattern**:
  ```css
  /* ❌ 금지 — layer 밖 universal reset */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  ```
- **권장**: Tailwind v4 preflight 동일 reset 을 `@layer base` 에서 제공. 추가 reset 필요 시 명시적 `@layer base { ... }` 안에 둘 것.
- **회귀 방지**: FOLLOWUP-57 — ESLint/stylelint custom rule 로 자동 검출
- **fix commit**: `1900713` (2026-05-17)

---

## ADR-0015 — 회원 탈퇴 Soft Delete + 30일 Hard Delete (LEGAL-OPS-03)

- **결정**: 회원 탈퇴를 expand-contract 방식의 soft delete 로 구현한다.
  - `User.deletedAt = now()` 설정 시 서비스 접근 차단.
  - `User.deletionScheduledFor = deletedAt + 30일` 로 hard delete 예정일 설정.
  - 30일 이내 관리자 복원 가능 (`/admin/users/[id]` 복원 버튼).
  - `/api/cron/hard-delete-users` 가 `CRON_SECRET` 헤더 인증 후 영구 삭제.
- **맥락**: 한국 개인정보보호법(PIPA) + GDPR 권고 패턴. 분쟁 대비 30일 보관, 이후 파기 의무.
- **이동권**: `GET /api/account/export` 로 전체 데이터 JSON 다운로드 (PIPA 35조).
- **마케팅 동의**: 서비스 필수 동의와 분리. `User.marketingConsent` 별도 필드 + `/api/account/marketing-consent` PATCH.
- **미들웨어**: `deletedAt != null` 인 사용자가 보호 경로(`/mypage`, `/editor`) 접근 시 `/goodbye` 리다이렉트.
- **RLS**: `anon_cannot_see_deleted_users` 정책으로 삭제 사용자 public select 차단.
- **Stripe placeholder**: M7 결제 미구현이라 구독 취소는 `console.warn` placeholder. M7 완료 시 `POST /api/account/delete` 의 TODO(M7) 블록 연결.
- **결정일**: 2026-06-03

---

신규 ADR 은 다음 번호로 추가하고 `roadmap.md` 의 관련 작업에서 링크.
