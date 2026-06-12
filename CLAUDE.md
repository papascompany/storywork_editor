# StoryWork — AI 스토리보드 편집기 (Master Spec)

> 이 문서는 **프로젝트의 단일 진실 원천(SSOT)** 입니다.
> 모든 서브에이전트, 휴먼 컨트리뷰터는 이 문서의 용어·아키텍처·계약(Contract)을 기준으로 작업합니다.

---

## 1. 프로젝트 개요

**StoryWork** 는 1,000+개의 **PNG 포즈 라이브러리**(향후 SVG 병행), 관리자 등록 리소스(배경/미장센/소품/말풍선/워드효과/꾸미기), AI 대본 분석을 결합해 **fabric.js 기반 캔바급 온라인 스토리보드 편집기**를 제공하고, 완성된 페이지를 **POD(Print-On-Demand) PDF**로 출판하는 서비스다.

> **자산 포맷 정책 (요약)**
> - **1차(현재)**: PNG 마스터 — 투명 배경 RGBA. 보유 1,058개 (대부분 750×750)
> - **2차(향후)**: SVG — 동일 `Resource(kind=pose)` 위에 `format='svg'` 분기, 같은 메타 스키마 공유
> - **라이선스**: 폴더 루트 `data/poses/raw/LICENSE.json` 1개로 전 자산 상속 (`holder=StoryWork`, `terms=all-rights`, 상업 사용 OK). 자산별 오버라이드는 사이드카로
> - **키포인트**: 사이드카 미보유 자산은 **최소 3점 자동 추정**(head/mouth/center). 손/발 등은 검수에서 점진 보강
> - **저해상도(750px) 처리**: `lowDpi` 태그 자동 부여 → `ai-layout` 가 페이지 1/2 이하 슬롯에만 배치. 풀샷 단독 페이지엔 고해상도 자산 우선
> 자세한 결정 근거는 [ADR-0011 / 0011a / 0011b / 0011c](docs/architecture/decisions.md#adr-0011--포즈-자산-포맷-png-우선-svg-추후).

### 1.1 핵심 가치 제안
| 사용자 | 가치 |
|---|---|
| 일반 사용자 | 대본만 넣으면 장면 분리 → 포즈/배경 자동 배치 → 편집 → 출판까지 원샷 |
| 크리에이터(구독) | 자기 리소스를 "마이데이터"로 등록·관리·공유·판매 |
| 관리자 | 판형/템플릿/리소스를 등록·검수·정책 운영 |
| 커뮤니티 | 공모전 / 뽐내기 / SNS 공유 |

### 1.2 기능 도메인
1. **관리자 시스템** — 판형, 템플릿, 템플릿셋, 리소스, 편집데이터 CRUD/검수
2. **온라인 편집기** — fabric.js 기반 레이어 편집기 (캔바 수준)
3. **AI 대본 분석 에이전트** — 장면/대사 분리 + 포즈/배경 추천
4. **PDF 출판 엔진** — POD 인쇄 사양 PDF 생성
5. **크리에이터 모드** — 구독 상품 + 마이데이터 관리
6. **소셜** — SNS 공유, 공모전, 뽐내기 갤러리
7. **(로드맵)** AI 자동 더빙 / AI 영상 생성

### 1.3 비기능 요구사항(NFR)
- **반응형 우선**: 데스크톱(1280+) ↔ 태블릿(768+) ↔ 모바일(360+) 모두 1급 시민
- **모듈화**: 모든 편집기 기능은 `@editor/*` 패키지로 분리. 외부 프로젝트에서 재사용 가능
- **성능 예산**:
  - 편집기 초기 인터랙티브 ≤ **2.5s** (P75, 4G)
  - 캔버스 200 객체에서 60fps 유지(데스크톱), 30fps 이상(모바일)
  - PDF 16페이지 변환 ≤ **6s** (서버 사이드)
- **접근성**: WCAG 2.1 AA, 키보드 단독 편집 가능
- **국제화**: ko/en (i18n 디폴트로 적재, 번역은 점진)

---

## 2. 기술 스택 (확정)

| 레이어 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | **Next.js 15 (App Router) + React 19 + TypeScript 5.6** | RSC + 서버 액션 + 풀스택 단일 코드베이스 |
| 캔버스 엔진 | **fabric.js v6** | 요구사항 명시. 레이어/그룹/PNG·SVG 모두 일급 지원 |
| 스타일 | **Tailwind CSS v4 + shadcn/ui + Radix Primitives** | 빠른 프로토타이핑 + 접근성 |
| 상태 | **Zustand + Immer + zundo(undo/redo)** | 캔버스 외부 상태에 가장 가벼움 |
| 폼/검증 | **React Hook Form + Zod** | 공용 스키마(서버/클라이언트) |
| 데이터 | **PostgreSQL (Supabase)** + **Prisma** | 마이그레이션·RLS·실시간 한 번에 |
| 스토리지 | **Supabase Storage**(PNG 마스터 + WebP 변환본 + 향후 SVG) + 서명 URL | S3 호환, CDN 내장 |
| 이미지 변환 | **sharp**(서버) — PNG → WebP/AVIF, 멀티 사이즈 파생본 | 모바일 트래픽/캔버스 텍스처 비용 절감 |
| 인증 | **Supabase Auth** (구독은 Stripe Customer 연동) | Auth+RLS 통합 |
| 결제 | **Stripe** (구독 + 일회성) | — |
| AI: 텍스트 | **Anthropic Claude (claude-sonnet-4-6, 캐시 활성)** | 대본 분석/태깅/추천 |
| AI: 이미지 | **nano-banana 2 (Gemini 2.5 Flash Image)** via 게이트웨이 | 사용자 보조 이미지 생성 |
| AI: 임베딩 | **voyage-3** 또는 OpenAI text-embedding-3 | 포즈/리소스 시맨틱 검색 |
| PDF | **@react-pdf/renderer** (벡터 우선) + **pdf-lib**(병합) + **Puppeteer**(폴백 래스터) | POD 인쇄 사양 |
| 큐/잡 | **Inngest** 또는 Supabase Edge + pg_cron | 분석/PDF 변환 비동기 |
| 모니터링 | **Sentry + PostHog + OpenTelemetry** | 에러/제품 분석/트레이싱 |
| 테스트 | **Vitest + Playwright + Storybook** | 단위/E2E/시각 회귀 |
| 모노레포 | **pnpm + Turborepo** | 모듈 분리 강제 |

> **결정 로그**: 대안과 트레이드오프는 [docs/architecture/decisions.md](docs/architecture/decisions.md) 참조.

---

## 3. 모노레포 구조

```
storywork/
├── apps/
│   ├── web/              # Next.js — 사용자 편집기 + 공개 페이지
│   ├── admin/            # Next.js — 관리자 콘솔 (separate auth)
│   └── workers/          # Inngest 함수 (PDF, AI 잡)
├── packages/
│   ├── editor-core/      # @storywork/editor-core — fabric 추상 + 이벤트
│   ├── editor-layers/    # @storywork/editor-layers — 레이어 모델
│   ├── editor-pose/      # @storywork/editor-pose — 포즈 객체 (PNG 1차, SVG 어댑터 입점)
│   ├── editor-text/      # @storywork/editor-text — 텍스트/말풍선
│   ├── editor-effects/   # @storywork/editor-effects — 워드효과/필터
│   ├── editor-template/  # @storywork/editor-template — 템플릿 적용/저장
│   ├── editor-history/   # @storywork/editor-history — undo/redo + 협업 OT 후크
│   ├── editor-export/    # @storywork/editor-export — PNG/PDF/JSON
│   ├── editor-ui/        # @storywork/editor-ui — 도구 패널·인스펙터 (헤드리스 옵션)
│   ├── ai-script/        # @storywork/ai-script — 대본 분석 에이전트
│   ├── ai-layout/        # @storywork/ai-layout — 자동 배치 알고리즘
│   ├── ai-recommend/     # @storywork/ai-recommend — 포즈/리소스 추천
│   ├── pdf-engine/       # @storywork/pdf-engine — POD PDF 빌더
│   ├── shared-schema/    # @storywork/schema — Zod + Prisma 공유 타입
│   ├── shared-ui/        # @storywork/ui — 디자인 시스템(shadcn 래핑)
│   └── shared-utils/     # @storywork/utils
├── prisma/               # 스키마 + 마이그레이션
├── docs/                 # 본 문서 + 모듈 명세
├── .claude/
│   ├── agents/           # 서브에이전트 정의
│   ├── commands/         # 슬래시 커맨드
│   └── settings.json     # 프로젝트 설정
├── SKILLS.md             # 스킬 카탈로그
└── CLAUDE.md             # ← 본 문서
```

### 3.1 모듈 의존성 규칙
- `editor-*` 패키지는 React/UI에 의존하지 **않는다**(`editor-ui` 제외). DOM/Node 양쪽에서 가져갈 수 있게 한다.
- `apps/web` 만 `editor-ui`를 알며, 모든 `editor-*`는 `apps/web`이 조립한다.
- `ai-*`, `pdf-engine` 은 서버에서 실행, 클라이언트는 워커 호출만.
- 단방향: `apps/* → packages/*`, `packages/* → packages/shared-*`. 역참조 금지(ESLint 룰).

자세한 모듈 명세는 [docs/modules/index.md](docs/modules/index.md).

---

## 4. 데이터 모델 (요약)

전체 ERD: [docs/data-schema/erd.md](docs/data-schema/erd.md). 핵심 엔티티만 발췌:

```ts
// Format(판형): 인쇄 규격
Format { id, name, widthMm, heightMm, dpi, bleedMm, safeMm, gridDef }

// Template / TemplateSet: 페이지 단위 / 묶음
Template { id, formatId, name, thumbnail, fabricJson, slots: Slot[] }
TemplateSet { id, name, templates: Template[], coverIdx }

// Resource: 관리자 등록 리소스 (포즈 포함)
Resource {
  id,
  kind: 'pose'|'background'|'mise-en-scene'|'prop'|'speech-bubble'|'word-fx'|'decoration',
  ownerType: 'system'|'creator',
  ownerId,
  format: 'png'|'svg'|'webp',     // 1차 = png, 향후 svg 병행
  fileUrl,                         // 마스터 파일 (PNG/SVG)
  variants: {                      // PNG의 경우 sharp 가 생성한 파생본
    webp1x?: string, webp2x?: string,
    thumb?: string                 // 256px thumbnail
  },
  masterDpi: number,               // 인쇄 환산 dpi (PNG only). SVG=null
  meta: ResourceMeta,              // kind 별 다형
  tags: string[],
  embedding: vector,               // pgvector — 텍스트(태그) + 시각(이미지) 결합
  status: 'draft'|'published'|'rejected'
}

// Pose 전용 메타 — 포맷 무관 동일 스키마 (PNG/SVG 공유)
PoseMeta {
  bodyType: 'M'|'F'|'child'|'beast'|...,
  view: 'front'|'side'|'back'|'three-quarter',
  action: string,                  // '걷기','놀람','싸움' 등 표준 키
  keypoints: KP[],                 // 머리/입/어깨/허리/손/발 — 정규화 좌표(0..1, viewBox 1024 기준)
  bbox, anchorPoint,               // 0..1 정규화
  flippable: boolean,              // 좌우 대칭 변형 허용 여부
  tintMaskUrl?: string,            // PNG 한정 — 색 변경용 알파 마스크(선택)
  styleVariants: string[]
}

// 사이드카 키포인트 파일 — 인입 시 PNG와 함께 입력
// data/poses/raw/<id>.png  +  data/poses/raw/<id>.kp.json  형태
type PoseSidecar = {
  v: 1,
  format: 'png'|'svg',
  size: { w: number, h: number },  // 마스터 픽셀(또는 SVG viewBox)
  keypoints: { name: KPName, x: number, y: number, weight?: number, inferred?: boolean }[],
  bbox: { x:number, y:number, w:number, h:number },
  flippable: boolean,
  license: { id: string, holder: string, terms: string }  // 누락 시 적재 거부
}

// 사용자 작품
Project { id, ownerId, formatId, title, status, settings }
Page    { id, projectId, index, templateId?, fabricJson, thumbnail }
SceneDoc { id, projectId, scriptRaw, scenes: Scene[] } // AI 분석 결과
Scene   { id, sceneDocId, index, slug, summary, dialogue: Line[], pageId? }

// 출판
PublishJob { id, projectId, kind:'pdf', status, pdfUrl, spec }

// 커뮤니티
Showcase { id, projectId, ownerId, mode:'contest'|'gallery', likes }
```

> **계약**: `Page.fabricJson` 은 `editor-core` 가 정의하는 **Schema v1**. 마이그레이터는 `packages/shared-schema/migrations/` 에 보관, 절대 in-place 수정 금지.

---

## 5. 핵심 아키텍처 결정

### 5.1 자동 배치 파이프라인 (대본 → 페이지)
```
대본 입력
  ↓ ai-script.analyze()        # 장면 분할 + 등장인물 + 감정 + 시점
SceneDoc
  ↓ ai-recommend.poseFor(scene) # 포즈 후보 K개 (임베딩 + 룰)
  ↓ ai-recommend.bgFor(scene)
  ↓ ai-layout.compose(scene, format, template?) # 슬롯 매핑 + 충돌 해소
fabricJson 초안
  ↓ editor-core 에서 후편집
```
- 각 단계는 **결정론적 시드**를 받고, 동일 입력 → 동일 출력 보장(테스트 가능).
- AI 결과는 항상 `confidence` + `alternatives[]` 를 포함시켜 사용자에게 다음 후보 노출.

### 5.2 편집기 코어 책임 분리
| 모듈 | 책임 | 비책임 |
|---|---|---|
| `editor-core` | fabric 인스턴스 수명, 좌표계, 이벤트 버스 | UI, 단축키 정의 |
| `editor-layers` | 레이어 트리, z-order, 그룹/잠금 | 렌더 |
| `editor-history` | command 패턴 + zundo, 외부 OT 어댑터 슬롯 | 영속화 |
| `editor-template` | 슬롯/스냅 그리드, 템플릿 인스턴싱 | AI |
| `editor-export` | PNG/JSON/PDF Job 트리거 | 사용자 인증 |

### 5.3 협업(향후)
- 1단계: 잠금 기반 단독 편집 + autosave(2초 디바운스)
- 2단계: Yjs + y-fabric 어댑터 → `editor-history` 의 OT 슬롯에 연결

### 5.4 보안 / 권한
- Supabase RLS 로 owner/role 단위 접근 제어
- 관리자 콘솔은 **별도 도메인 + Service Role 게이트** + 2FA 강제
- 사용자 업로드는 ClamAV 람다 + MIME 화이트리스트 + EXIF 스트립

---

## 6. 개발 계획 (마일스톤)

> 모든 마일스톤은 **데모 가능한 vertical slice** 로 끝낸다. 가로 레이어를 한꺼번에 쌓지 않는다.

### M0 — 부트스트랩 (1주)
- 모노레포, CI(turbo+lint+test), Prisma 스키마 v1, Supabase 로컬, 디자인 토큰
- DoD: `pnpm dev` 한 번에 web/admin 동시 부팅, 로그인 가능, Storybook 기동

### M1 — 편집기 코어 MVP (3주)
- `editor-core` + `editor-layers` + `editor-history` + `editor-export(PNG/JSON)`
- 포즈 PNG 한 개를 캔버스에 올리고 변형/저장/복원 (사이드카 키포인트 핸들 노출)
- DoD: 빈 페이지에 포즈 5개·배경 1개 올린 fabricJson 라운드트립 통과, undo 100스텝

### M2 — 포즈 라이브러리 인덱싱 (1.5주)
- 1,000개 **PNG 입수 파이프라인**: `scripts/ingest-poses.ts`
  - 입력: `data/poses/raw/<id>.png` + 동명의 `<id>.kp.json` 사이드카(없으면 검수 큐)
  - 매직바이트/EXIF strip → sharp 로 WebP/AVIF 파생본 + 256 썸네일 생성
  - 시각 임베딩(이미지) + 텍스트 임베딩(태그) 결합, pgvector 인덱싱
- (향후) SVG 어댑터: 동일 파이프라인 분기, sanitize 단계만 추가
- DoD: 검색창에 "놀란 여자 측면" 입력 → 상위 10개 시각 검수

### M3 — 관리자 콘솔 (2주)
- 판형/템플릿/리소스 CRUD, 검수 워크플로(draft→review→published)
- 일괄 업로드(PNG ZIP 1차 / SVG 추후), 사이드카 JSON 매칭 검증, 썸네일 자동 생성
- DoD: 관리자가 새 판형(B5, 130×200, 3mm bleed) 등록 후 사용자 편집기 옵션에 즉시 반영

### M4 — AI 대본 분석 + 자동 배치 (3주)
- `ai-script` (장면/대사 분리), `ai-recommend`, `ai-layout`
- 사용자 흐름: 대본 붙여넣기 → "자동 배치" → 페이지 N개 생성 → 편집기에서 후편집
- DoD: 800자 대본이 6페이지로 분할되고 포즈/배경/말풍선이 70% 만족도로 배치(인간 평가)

### M5 — 텍스트/말풍선/워드효과 + 템플릿 (2주)
- `editor-text` `editor-effects` `editor-template`
- 말풍선 꼬리 자동 화자 추적, 워드효과 50종, 템플릿셋 적용
- DoD: 페이지 위 대사 자동 흐름, 한글 줄바꿈/금칙어 처리

### M6 — POD PDF 출판 (2주)
- `pdf-engine` + `apps/workers`
- 인쇄 사양(CMYK 변환은 1차 RGB→sRGB ICC 동봉, 추후 본격 CMYK), 재단선·여백 가이드
- DoD: 16p 작품이 인쇄소 프리플라이트(예: bleed/safe area) 통과

### M7 — 크리에이터 모드 + 마이데이터 + 결제 (2주)
- 구독 플랜, 사용자 리소스 업로드 한도, 공유 토글
- DoD: 결제 → 업로드 한도 상향 → 마이데이터 패널에서 편집기로 드래그

### M8 — 소셜(SNS/공모전/뽐내기) (1.5주)
- 공유 카드(OG 이미지 자동 생성), 공모전 시즌, 좋아요/댓글
- DoD: 공모전 시즌 만들기 → 출품 → 마감 자동 동결 → 결과 페이지

### M9 — 관측·성능·접근성 안정화 (1주)
- Sentry, PostHog 퍼널, Lighthouse 90+, 키보드 시나리오 통과

### M10+ — 로드맵 (parking)
- AI 자동 더빙(TTS+감정), AI 영상(컷 → 모션), 협업(Yjs)

각 마일스톤의 작업 분해는 [docs/architecture/roadmap.md](docs/architecture/roadmap.md) 참조.

---

## 7. 오토파일럿 협업 모델

본 프로젝트는 **Claude Code(코드 작성/리뷰) + Claude(디자인 비주얼/카피) + Cursor(IDE 보조 편집) + nano-banana 2(이미지 생성)** 를 조합해 진행한다.

### 7.1 도구 역할 분담
| 도구 | 1차 역할 | 2차 역할 |
|---|---|---|
| **Claude Code (이 환경)** | 코드 생성/리팩터, 모듈 설계, 문서 유지, 서브에이전트 오케스트레이션 | PR 작성, 테스트 생성 |
| **Claude(아티팩트/디자인)** | UI 시안, 디자인 비평, UX 카피 | 마케팅 카피 |
| **Cursor** | 휴먼이 직접 미세 편집, 인라인 리뷰 | 큰 파일 빠른 그렙 |
| **nano-banana 2** | 배경/소품/꾸미기 보조 이미지 생성, 썸네일 변환 | OG 이미지 자동 생성 |

### 7.2 오토파일럿 루프 (Claude Code 주도)
```
1. orchestrator 가 docs/architecture/roadmap.md 의 다음 미완 작업을 픽
2. 작업을 적절한 subagent 에 위임 (architect / editor-engineer / pose-curator / ...)
3. 작업 산출물(코드+테스트+문서) 을 simplify 스킬로 1회 셀프 리뷰
4. PR 생성 → 휴먼 리뷰 또는 ultrareview
5. 머지 후 roadmap.md 체크박스 업데이트, 다음 픽
```
- 각 서브에이전트의 시스템 프롬프트는 `.claude/agents/*.md` 에 고정.
- 오토파일럿은 `loop` 스킬을 사용하지 않고 명시적 트리거(슬래시 커맨드)로만 진행한다(폭주 방지).

### 7.3 휴먼 게이트
다음 작업은 **반드시** 휴먼 승인 후 진행:
- 데이터 마이그레이션, 결제 연동 변경, 외부 API 키 발급, 프로덕션 배포, 가격/플랜 변경.

### 7.4 UI 피드백 워크플로우 (FOLLOWUP-53)

UI 작업 시 다음 SOP 를 반드시 준수한다 (2026-05-15 회고 기반):

1. **명세화** — 사용자 직관 표현("다닥다닥") → `/ui-spec <issue>` 로 측정값+제안 명세표 생성
2. **동의** — 사용자 동의 후 구현 시작 (추측 구현 금지)
3. **구현**
4. **시각 검증** — `/visual-check <route>` 로 AI 직접 screenshot 확인 후 push
5. **CI 확인** — `/ci-watch` 로 Actions green 확인 후 PR

3회 실패 시 즉시 멈추고 사용자 재확인 요청. 4px 변화는 push 하지 않는다.

전체 SOP: [docs/process/ui-feedback-workflow.md](docs/process/ui-feedback-workflow.md)

---

## 8. 코딩 가이드 (요약)
- TypeScript strict, `any` 금지(불가피하면 `// @ts-expect-error` + 사유)
- 함수형 우선, 클래스는 fabric 래퍼/명령 패턴에서만
- 커밋 컨벤션: Conventional Commits (`feat(editor-core): ...`)
- PR: 한 PR 한 관심사. 1,000줄 초과 시 분할 필수
- 테스트: 새 모듈은 ≥70% 라인 커버리지, 핵심 경로(자동 배치/PDF) E2E 필수
- i18n 키 누락 시 CI fail
- 보안 리뷰: 외부 입력 다루는 PR은 `security-review` 스킬 통과

---

## 9. 핵심 위험과 완화

| 위험 | 영향 | 완화 |
|---|---|---|
| fabric.js 캔버스 객체 200+ 시 모바일 성능 | 편집 끊김 | 가상 레이어, off-screen 스테이징, 변경 영역 dirty 트래킹 |
| AI 자동 배치 만족도 부족 | 핵심 가치 훼손 | 후보 K개 + 한 클릭 교체 UI, 사용자 피드백 학습 데이터 축적 |
| POD 인쇄소별 사양 차이 | 인쇄 사고 | 판형 프리셋 + 인쇄소 프리플라이트 프로필 등록제 |
| PNG 마스터 해상도 부족 → 인쇄 흐림 | 인쇄 품질 저하 | 적재 시 `lowDpi` 자동 태깅 → `ai-layout` 슬롯 매칭 시 페이지 1/2 이하만 허용. 인스펙터 경고 + preflight 재검 (ADR-0011a) |
| 사용자 업로드 PNG 악성/위장 | XSS·서버 측 RCE | 매직바이트(PNG signature) 검증, EXIF strip, sharp 재인코딩(re-encode), MIME 화이트리스트 |
| 사용자 SVG 악성 코드(향후) | XSS | DOMPurify + SVG 새니타이저, `<script>`/외부 ref 차단 |
| PNG 색상 변경 불가능(SVG 와의 차이) | 일관된 룩 어려움 | 사이드카 `tintMaskUrl` 또는 fabric 필터(`BlendColor`)로 보조. 색 슬롯 강조 자산은 SVG 권장(향후) |
| 1,000개 포즈 라이선스/일관성 | 법적/품질 리스크 | 사이드카 `license` 필드 강제, 누락 시 적재 거부 + 검수 큐 |
| **Tailwind v4 monorepo utility 사일런트 누락** (2026-05-17 회고) | spacing/padding utility 자체가 CSS 에 없음 → 모든 UI 작업 무효 | `packages/shared-ui/src/styles/globals.css` `@source` directive 로 monorepo 모든 source 경로 명시 + FOLLOWUP-55 CI sanity check |
| **Layer 밖 universal CSS reset** (`* { padding: 0 }`) | Tailwind utility cascade 덮어씀 → utility 작동 안 함 | Tailwind v4 preflight 가 layer base 에서 제공하므로 외부 universal reset 금지 + FOLLOWUP-57 ESLint 룰 |
| **Vercel Hobby Plan + private repo + collaborator** | 모든 deploy BLOCKED, prod 가 옛 빌드 그대로 (13일 spacing 실패의 진짜 원인 중 하나) | repo public 유지 또는 Pro plan 업그레이드. visibility 변경 시 plan 호환성 사전 확인 |
| **turbo-ignore HEAD~1 skip** | shared 변경 commit 이 BLOCKED 후 후속 commit 만 새 빌드되면 app 자동 skip | app entry CSS/code 에 trivial 변경 commit 으로 force trigger. CI 모니터링으로 admin/web 양쪽 빌드 상태 자동 확인 |

---

## 10. 추가 문서 목차
- [SKILLS.md](SKILLS.md) — 본 프로젝트에서 쓰는 Skill/Subagent 카탈로그
- [docs/architecture/decisions.md](docs/architecture/decisions.md) — ADR
- [docs/architecture/roadmap.md](docs/architecture/roadmap.md) — 작업 분해 (오토파일럿 큐)
- [docs/modules/index.md](docs/modules/index.md) — 모듈별 상세 명세
- [docs/data-schema/erd.md](docs/data-schema/erd.md) — ERD 및 Prisma 스키마 초안
- [docs/agents/orchestration.md](docs/agents/orchestration.md) — 에이전트 협업 시퀀스

---

_Last updated: 2026-06-12 · Audit fix 7건 + 배포 복구 + 디즈니 다이나믹 리디자인(DESIGN-C-01~03) + 표지 풀스택(COVER-ADMIN-01/COVER-02) 완료. Handoff: [docs/handoff/SESSION_HANDOFF_2026-06-12.md](docs/handoff/SESSION_HANDOFF_2026-06-12.md)_
