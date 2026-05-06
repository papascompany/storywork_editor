# 세션 핸드오프 — 2026-05-06

> 본 문서는 **2026-04-25 ~ 2026-05-06** 동안 진행된 모든 작업을 정리한 핸드오프 문서다.
> 다음 세션은 [RESUME_PROMPT.md](./RESUME_PROMPT.md) 의 시작 프롬프트로 즉시 이어갈 수 있다.

---

## 1. 한 줄 요약

> StoryWork (PNG 1,270개 자산 기반 fabric.js v6 스토리보드 편집기) — **M0(부트스트랩) + M1(편집기 코어) + M2(포즈 라이브러리) 핵심 완료**. GitHub `papascompany/storywork_editor` push 완료, Vercel **admin/web 두 도메인 배포 완료**, Supabase Cloud 연결 완료, **편집기 UI(`/editor`) 에서 포즈 검색·드래그·캔버스 추가까지 동작**. 다음 단계는 **M3 (관리자 콘솔)** 권장.

---

## 2. 마일스톤 진행 매트릭스

| 마일스톤 | 작업 수 | 완료 | 미완 | 비고 |
|---|---|---|---|---|
| **M0 부트스트랩** | 6 | 6 | 0 | ✅ 완료 |
| **M1 편집기 코어** | 7 (+8 UI/UX) | 15 | 0 | ✅ M1-01~07 + M1-08a~f |
| **M2 포즈 라이브러리** | 10 | 7 | 3 | ✅ 핵심 완료 (M2-03b/07/08/09 보류) |
| **M3 관리자 콘솔** | 6 | 0 | 6 | ❌ **미진행 — 다음 우선순위** |
| M4 AI 파이프라인 | 5 | 0 | 5 | ❌ |
| M5 텍스트/말풍선/효과 | 4 | 0 | 4 | ❌ |
| M6 POD PDF | 4 | 0 | 4 | ❌ |
| M7 크리에이터/결제 | 4 | 0 | 4 | 🚦 휴먼 게이트 |
| M8 소셜 | 4 | 0 | 4 | ❌ |
| M9 안정화 | 4 | 0 | 4 | ❌ |

**합계: 53건 작업 중 28건 완료 (52.8%)**

---

## 3. 환경 정보 (다음 세션 즉시 사용 가능)

### 3.1 로컬 머신
- 사용자: `yohan` (`yohan73@gmail.com`)
- OS: macOS, Node v22 LTS / pnpm 9.15.0 / git 2.50.1
- 작업 디렉토리: **`/Users/yohan/Documents/claude/storywork`**
- 셸: zsh, OrbStack 의 docker PATH 영구 등록됨 (`~/.zshrc`)

### 3.2 GitHub
- Repo: **https://github.com/papascompany/storywork_editor** (PUBLIC)
- 활성 계정: `papascompany` (`workflow` scope 보유)
- 보조 계정: `storigehub` (READ-only on this repo)
- 브랜치: `main` 만 사용 (PR 워크플로 미시작)
- `gh auth status` 로 확인 가능
- CI: GitHub Actions `lint/typecheck/test/build` 5잡 — 매 push 자동 실행

### 3.3 Supabase Cloud (Free tier)
- Project ref: **`wjpyeqckuxyfeytuzgon`**
- URL: `https://wjpyeqckuxyfeytuzgon.supabase.co`
- Studio: `https://supabase.com/dashboard/project/wjpyeqckuxyfeytuzgon`
- Region: Northeast Asia (Seoul)
- DB 비밀번호: 사용자 보관 (`.env.local` 안)
- 16 테이블 + 8 enum + pgvector 0.8.0 + ivfflat 인덱스 3 + RLS 활성 11 + 정책 15
- **현재 DB Resource 카운트: 1,270건** (PNG 자산)
- **Storage 사용: 171.8 MB** (Free 1GB 중 17%)
- CLI: `supabase` (v2.90.0, 2.95.4 업그레이드 권장)

### 3.4 Vercel (papas-yohan 계정, Yohan's projects 팀)
- Team ID: `team_dOpgsAqfLyl4qNlVgSiFVm6B`
- 배포 도메인:
  - **Web**: https://storywork-editor-web.vercel.app ✅
  - **Admin**: https://storywork-editor-admin.vercel.app ✅
- 환경변수: 두 프로젝트에 8개 (production + development) 등록 완료
  - DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ADMIN_JWT_SECRET, INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY
- vercel.json: 두 앱 모두 `cd ../.. && pnpm install && pnpm turbo build --filter=...` 패턴
- preview 환경변수는 미등록 (FOLLOWUP-13 — main 이 production branch 라 등록 불가)
- Vercel CLI 51.7.0 → 53.1.1 업그레이드 권장 (`npm i -g vercel@latest`)

### 3.5 .env.local (gitignore 처리됨, 절대 commit 금지)
필수 변수 (이미 설정됨):
```bash
DATABASE_URL=postgresql://yohan:비밀@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=10
DIRECT_URL=postgresql://yohan:비밀@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://wjpyeqckuxyfeytuzgon.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_JWT_SECRET=...
INNGEST_EVENT_KEY=dev-event-key
INNGEST_SIGNING_KEY=dev-signing-key
```

> ⚠️ **선택 추가 — 시맨틱 검색 품질 향상을 위해**
> ```
> VOYAGE_API_KEY=...     # 또는
> OPENAI_API_KEY=...
> ```
> 없어도 동작 (mock 임베딩 fallback). 있으면 M2-04 검색 정확도 P@10 ≥ 0.7 기대.

---

## 4. 데이터/자산 현황

### 4.1 포즈 자산 (1,270건)
- 입력: `data/poses/raw/` PNG 1,260개 (루트 1,058 + 동물/ 140 + 사랑/ 45, 중복/ 17 제외)
- LICENSE.json: holder=`StoryWork`, terms=`all-rights`, commercialUse=true (폴더 디폴트 상속)
- 적재 결과:
  - DB: 1,270 Resource 레코드 (M2-01 의 5건 reupload + 풀 인입 1,265)
  - Storage: `storage://poses/{slug}/{master.png, v1.webp, v2.webp, thumb.png}`
  - 모든 자산 keypoints 3점 자동 추정 (head/mouth/center) + bbox + anchorPoint
  - 파일명 태깅 매칭률 98.7%
  - 1,238건 **lowDpi=true** (750×750 자산이 96% 이라 그렇게 됨)
  - 0건 검수 큐 (모두 confidence ≥ 0.5)

### 4.2 데이터 모델 (16 테이블, 모두 RLS 적용)
User · Subscription · Format · Template · TemplateSet · Resource · Project · Page · SceneDoc · Scene · Line · PublishJob · Showcase · Reaction · ContestSeason · AuditLog

### 4.3 사용자에게 검증된 화면
- ✅ `/editor` (web) — 좌측 ToolBar 11종 + 클릭 시 FeatureSidebar 슬라이드, **PosePanel 1,270개 검색·필터·드래그/클릭 캔버스 추가** + 우측 RightPanel(속성/레이어 탭) + Footer(페이지/줌) + 모바일 BottomSheet
- ✅ admin/ — 로그인 폼 placeholder만 (M3 미진행)

---

## 5. 모노레포 구조 (현재)

```
storywork/
├── apps/
│   ├── web/                  ✅ /editor 풀 동작 (260KB First Load)
│   ├── admin/                ⏸ 로그인 폼 placeholder
│   ├── workers/              ⏸ Inngest 스텁만 (M6 에서 본격)
│   └── storybook/            ✅ 5+ 컴포넌트 스토리
├── packages/
│   ├── editor-core/          ✅ fabric v6 어댑터 (67 tests)
│   ├── editor-layers/        ✅ 트리/그룹/잠금 (85 tests)
│   ├── editor-history/       ✅ Command + 100스텝 (63 tests)
│   ├── editor-export/        ✅ PNG/JSON + DirtyTracker (43 tests)
│   ├── editor-pose/          ⏸ 빈 스캐폴드 (M5 에서 충전)
│   ├── editor-text/          ⏸ 빈 스캐폴드 (M5)
│   ├── editor-effects/       ⏸ 빈 스캐폴드 (M5)
│   ├── editor-template/      ⏸ 빈 스캐폴드 (M5)
│   ├── editor-ui/            ⏸ apps/web 안에 임시 — M5 에서 패키지 추출 가능
│   ├── ai-script/            ⏸ 빈 스캐폴드 (M4)
│   ├── ai-recommend/         ✅ filename-tagger + dict 120 룰 (53 tests)
│   ├── ai-layout/            ⏸ 빈 스캐폴드 (M2-07 + M4)
│   ├── pdf-engine/           ⏸ 빈 스캐폴드 (M6)
│   ├── shared-schema/        ✅ Prisma + Zod + PageJsonV1 (45 tests)
│   ├── shared-ui/            ✅ Tabs/Slider/ColorPicker/Toast/LoadingOverlay/Tooltip + 디자인 토큰
│   └── shared-utils/         ✅ slug.ts + 공통 유틸
├── prisma/                   ✅ schema.prisma v1 (16 모델)
├── supabase/                 ✅ migrations/init.sql 적용 완료
├── scripts/
│   ├── ingest-poses.ts       ✅ PNG 파이프라인
│   ├── lib/embed.ts          ✅ voyage/openai/mock 임베딩
│   ├── lib/estimate-keypoints.ts ✅ sharp 알파 채널 분석
│   ├── eval-search.ts        ✅ 골든셋 P@K 평가
│   ├── validate-filename-dict.ts ✅ 매칭률 검증 도구
│   └── check-vectors.ts      ✅ DB vector 컬럼 확인
├── data/poses/raw/           1,260 PNG (gitignore — Storage 업로드만)
│   ├── LICENSE.json          ✅ commit 됨
│   ├── 동물/, 사랑/, 중복/    하위 폴더
│   └── *.png                 1,058 + 140 + 45 + 17(skip)
├── docs/
│   ├── reference/
│   │   ├── FABRIC_EDITOR_GUIDE.md         (3,106줄, Storige 운영 백서)
│   │   ├── STORIGE_GUIDE_REVIEW.md        (격차 분석 + 적용 매트릭스)
│   │   └── EDITOR_UX_GAP_ANALYSIS.md      (Canva/Storige vs 우리)
│   ├── architecture/
│   │   ├── decisions.md       (ADR 0001~0011c)
│   │   └── roadmap.md         (단일 진실 원천 — 위에서 아래로 미완 픽)
│   ├── modules/index.md       (16 패키지 명세)
│   ├── data-schema/erd.md     (Prisma + RLS)
│   ├── agents/orchestration.md
│   ├── plan.html              (대시보드 — Cmd+P 인쇄 가능)
│   └── handoff/
│       ├── SESSION_HANDOFF_2026-05-06.md  ← 본 문서
│       └── RESUME_PROMPT.md               ← 새 세션 프롬프트
├── tests/golden/pose-search/queries.json   (50쿼리)
├── CLAUDE.md                  단일 진실 원천 (마스터 사양)
├── SKILLS.md                  스킬/슬래시 카탈로그
├── README.md                  진입점
└── .claude/                   서브에이전트 11종 + 슬래시 5종 + settings/launch
```

---

## 6. 누적 테스트
- **총 358+ 테스트** (모든 패키지 합산)
- CI 매 push 자동 실행: lint + typecheck + test + build
- 회귀 0 유지

---

## 7. 등록된 후속 이슈 (FOLLOWUP-01 ~ 18)

| ID | 내용 | 우선도 | 처리 시점 |
|---|---|---|---|
| 01 | `eslint-import-resolver-typescript` 추가 | 낮 | M3 진입 전 |
| 02 | `pnpm dev` (turbo --parallel) 일부 패키지 시작 안 됨 | 중 | M1 진입 전 — 임시 우회 가능 |
| 03 | Storybook 8.6 호환성 경고 | 낮 | 마이너 패치 |
| 04 | Sheet `aria-describedby` 이중 description | 낮 | M1 모바일 작업 시 |
| 05 | Pretendard webfont (`next/font/local`) 추가 | 중 | M8 SNS 카드 |
| 06 | ESLint no-raw-color 커스텀 룰 | 낮 | 후순위 |
| 07 | Storybook visual regression | 낮 | M9 안정화 |
| 08 | shared-schema package.json `"type": "module"` | 낮 | 사소 |
| **09** | **pgvector `search_path` 추가** ✅ 완료 (커밋 f008321) | — | — |
| 10 | GitHub Actions Node 20 → Node 24 업그레이드 | 중 | 2026-09-16 까지 |
| **11** | **DB 비밀번호 입력** ✅ 완료 | — | — |
| 12 | PgBouncer prepared statement 비호환 | 낮 | 차후 |
| 13 | Vercel preview 환경변수 — main 이 production branch | 중 | PR 워크플로 시작 시 |
| 14 | env.ts 빌드 시점 검증 강제 | 중 | 안정화 |
| 15 | Vercel web deploy promotion ERROR ✅ 해결됨 (커밋 a07dad3) | — | — |
| 16 | Storige 가이드 P0 핫픽스 8건 | 중 | M3 진입 전 또는 인입 후 |
| 17 | M1-07 ResizeObserver 3중 가드 (BUG-013 차단) | 중 | 모바일 본격 작업 시 |
| 18 | extendFabricOption 화이트리스트 | 중 | M5 텍스트 진입 직전 |

---

## 8. 완료된 ADR (Architecture Decision Records)

`docs/architecture/decisions.md` 에 11개 ADR 등록:
- 0001 fabric.js v6 채택
- 0002 Next.js 15 App Router + RSC
- 0003 모노레포 (pnpm + Turborepo)
- 0004 Supabase + Prisma
- 0005 pgvector
- 0006 fabricJson Schema 버저닝
- 0007 자동 배치 결정론
- 0008 PDF 벡터 우선
- 0009 AI 생성 이미지 위치
- 0010 i18n
- **0011** 포즈 자산 PNG 우선 (+ 0011a 해상도 정책 + 0011b 키포인트 3점 + 0011c 라이선스 상속)

---

## 9. 다음 작업 권장 — M3 (관리자 콘솔)

**근거**: 1,270개 자산이 적재됐는데 **관리자 화면이 없어서** 검수/태그수정/일괄처리 불가능. 자산 운영 도구가 가장 시급.

**M3 sub-tasks 6건 (~4-6시간)**
- M3-01: apps/admin 부트스트랩 + 별도 도메인 + 2FA
- M3-02: DataTable / EntityForm / ReviewQueue 공용 컴포넌트
- **M3-03: Format CRUD** (B5/A5/정사각/세로형 프리셋)
- **M3-04: Resource CRUD + 검수 큐 + 일괄 액션** ★ 가장 임팩트
- M3-05: Template/TemplateSet 빌더 (슬롯 정의 UI)
- M3-06: Audit Log 패널

**M3 안에서 통합 처리하면 좋은 것**:
- M2-08 키포인트 검수 편집기 → M3-04 안에 자연스럽게 통합

---

## 10. 이번 세션 (2026-04-25 ~ 05-06) 주요 커밋 흐름

```
M0 부트스트랩 (4/26)          ed7c2db..0292375  (모노레포 + 16 패키지 + Storybook + 디자인 토큰)
M0-03 Phase B/A (4/26~5/4)    f055038..f008321  (Prisma + Zod + Supabase Cloud + pgvector)
GitHub push (5/5)              workflow scope 추가, papascompany/storywork_editor 푸시
Vercel 두 프로젝트 (5/5)        env 16개 + vercel.json + Root Directory 수정
M1 코어 (5/4~5)                editor-core/layers/history/export — 258 tests
M1-08 UI/UX (5/5)             6 sub-task — Tabs/Slider/ColorPicker/Toast/Loading/Tooltip + 11종 ToolBar + FeatureSidebar + ControlBar/RightPanel + EmptyHint/DnD/Footer/Floating + ⌘K + 모바일 11탭
M2-01~05 (5/5~6)               PNG 파이프라인 + 키포인트 + 사전 + pgvector + PosePanel
풀 인입 (5/6)                  1,260 PNG → DB 1,270, Storage 171.8MB, 4분 20초
UI 검증 (5/6)                  preview MCP — 모든 핵심 화면 정상, 코드 leak 1건 수정
```

총 50+ 커밋, 358+ 테스트, GitHub Actions CI 모두 green.

---

## 11. 기억할 위험 / 사용자 의사결정 후 진행 필요

- 🚦 **결제/플랜** (M7) — Stripe 가격 확정 + 한국 PG 분기 결정 (D4 미결)
- 🚦 **인쇄소 사양** (M6) — 제휴 인쇄소 선정 또는 기본 B5/A5 진행 (D5 일부)
- ⚠️ **AI 비용 한도** (M4) — Claude API + nano-banana 2 사용량 모니터링
- ⚠️ **포즈 자산 라이선스 일관성** — 신규 자산은 동일 폴더 룰 따라야 함

---

_작성: Claude Code (orchestrator)_
_완료 시각: 2026-05-06_
