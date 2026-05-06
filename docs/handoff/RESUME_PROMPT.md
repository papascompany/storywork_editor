# 새 세션 시작 프롬프트

> 새 Claude Code 세션을 열 때 **그대로 복사 붙여넣기** 하시면 됩니다. 각 섹션은 독립적입니다 — 전체를 보내거나 핵심 섹션만 보내도 됩니다.

---

## 🚀 프롬프트 (이 줄부터 끝까지 복사)

안녕하세요. **StoryWork** (PNG 1,270개 자산 기반 fabric.js v6 스토리보드 편집기) 프로젝트의 다음 작업을 이어서 진행할게요.

### 📁 프로젝트 위치 + 즉시 읽어야 할 문서 (우선순위 순)

```
/Users/yohan/Documents/claude/storywork
```

순서대로 꼭 먼저 읽어주세요. 자기 분량을 넘지 말고 핵심만:

1. **`CLAUDE.md`** — 프로젝트 마스터 사양 (단일 진실 원천 SSOT). 도메인/기술 스택/모듈 규칙
2. **`docs/handoff/SESSION_HANDOFF_2026-05-06.md`** — 직전 세션의 모든 진행 상황 + 환경 정보
3. **`docs/architecture/roadmap.md`** — 53건 작업의 체크박스 (위에서 아래로 미완 픽)
4. **`docs/architecture/decisions.md`** — ADR 11건 (특히 ADR-0011 포즈 자산 정책)
5. **`.claude/agents/orchestrator.md`** — 본인이 루틴 진행자 역할일 때의 가드레일

> 다른 문서(modules/index.md, erd.md, plan.html, reference/* 등)는 작업 종류 정해진 후 필요시 그 시점에 열어보세요.

### ✅ 환경 점검 (시작 전 한 번)

```bash
cd /Users/yohan/Documents/claude/storywork

# 환경 sanity
node --version    # v22 LTS 권장
pnpm --version    # 9.x
git status        # main 브랜치, 변경 없음 기대
git log --oneline | head -5

# DB 연결 확인 (선택)
pnpm --filter @storywork/schema build && \
  pnpm tsx scripts/check-vectors.ts | head

# 빌드/테스트 한 번 (선택)
pnpm test && pnpm build
```

기대 상태:
- 마지막 커밋이 `feat(handoff): ...` 또는 `chore(...)` 류 — 직전 세션 커밋이 모두 push 됨
- DB Resource 카운트: **1,270건**
- 358+ 테스트 모두 green

### 📊 현재 진행 위치 (한 줄 요약)

> **M0(부트스트랩) + M1(편집기 코어 + UI/UX 6단계) + M2(포즈 라이브러리 풀 인입) 핵심 완료**.
> Vercel 두 도메인(`https://storywork-editor-web.vercel.app` + `https://storywork-editor-admin.vercel.app`) 배포 완료.
> Supabase Cloud (`wjpyeqckuxyfeytuzgon`) 에 PNG 1,270 / Storage 171.8MB.
> 사용자 web `/editor` 페이지에서 포즈 검색·드래그·캔버스 추가까지 동작 검증됨 (preview MCP 로 스크린샷 확인 완료).
> **다음 우선순위: M3 (관리자 콘솔) — 자산 검수/태그/일괄 운영 도구**.

### 🎯 권장 다음 작업 (사용자 결정 후 진행)

남은 마일스톤 진입 옵션:

| 옵션 | 마일스톤 | 시간 | 가치 | 권장 |
|---|---|---|---|---|
| **A** | **M3 관리자 콘솔** (6 sub-task — 인증/공용컴포넌트/Format/Resource CRUD/Template/Audit) | 4~6h | ★★★ 1,270개 자산 운영 도구 — 가장 시급 | 권장 |
| B | M2 마무리 (M2-07 ai-layout lowDpi 슬롯 / M2-09 tintMaskUrl) — 작은 작업 | 1~1.5h | ★★ M4 진입 전 처리 가능 | |
| C | FOLLOWUP-16 (Storige P0 핫픽스 8건 — useState canvas, 익명 핸들러, dispose 가드, retina/history mobile 분기, touch-action, viewport, unhandledrejection) | 2~3h | ★★ 모바일 안정성 | |
| D | M4 AI 파이프라인 (대본 분석 → 포즈 추천 → 자동 배치) | 8~10h | ★★ 핵심 가치 | 큰 작업 |
| E | 기타 — VOYAGE/OPENAI 키 도입해서 M2-04 검색 정확도 측정 / Supabase 풀러 환경변수 정리 / M0-06 Sentry/PostHog | varies | varies | |

**A (M3) 가 가장 권장** — 자산은 다 적재됐는데 관리 도구 0 인 상태. 다음과 같이 진행하면 6 sub-task 가 자연스럽게 흐릅니다:
- M3-01 apps/admin 부트스트랩 + 인증/2FA
- M3-02 DataTable/EntityForm/ReviewQueue 공용 컴포넌트
- M3-03 Format CRUD
- M3-04 Resource CRUD + 검수 큐 + 일괄 (★ M2-08 키포인트 검수 편집기를 여기에 통합)
- M3-05 Template/TemplateSet 빌더
- M3-06 Audit Log

### 🔧 핵심 환경 정보 (반복 질문 방지용)

- GitHub: `papascompany/storywork_editor` (PUBLIC, main 브랜치). 활성 계정 `papascompany` (workflow scope 보유).
- Supabase: `wjpyeqckuxyfeytuzgon` (Seoul, Free). DB 16 테이블, pgvector 0.8.0, RLS 활성. `.env.local` 에 자격증명 있음.
- Vercel: papas-yohan / Yohan's projects (team_dOpgsAqfLyl4qNlVgSiFVm6B). storywork-editor-web + storywork-editor-admin 두 프로젝트, 환경변수 등록 완료.
- 포즈 자산: `data/poses/raw/` 1,260 PNG + LICENSE.json (holder=StoryWork, all-rights). 풀 인입 완료.
- AI: ANTHROPIC/VOYAGE/OPENAI 키 미설정 (M2-04 검색은 mock 임베딩으로 동작).

### 📋 자주 쓰는 명령

```bash
# dev (web only — turbo --parallel 이슈 회피)
pnpm --filter @storywork/web dev      # http://localhost:3000
pnpm --filter @storywork/admin dev    # http://localhost:3001

# 또는 preview MCP 로 (.claude/launch.json 정의됨)
# preview_start name="web" 또는 "admin"

# 빌드/테스트/lint 회귀
pnpm build && pnpm test && pnpm lint

# 포즈 인입 (이미 1,270 적재됨, 신규 자산 추가 시만)
pnpm tsx scripts/ingest-poses.ts --dry-run
pnpm tsx scripts/ingest-poses.ts --limit 5 --reupload
pnpm tsx scripts/ingest-poses.ts                  # 전체

# DB vector 컬럼 확인
pnpm tsx scripts/check-vectors.ts

# Supabase 마이그레이션 push (스키마 변경 후)
supabase db push --linked

# Prisma client 재생성 (스키마 변경 후)
pnpm db:generate
```

### 🤖 서브에이전트 호출 매트릭스

직접 코드 작성보다 **위임이 효율적**입니다:

| 작업 종류 | 에이전트 | 위치 |
|---|---|---|
| 모노레포/Prisma/CI/Stripe/배포 | `architect` | `.claude/agents/architect.md` |
| editor-* 패키지 (fabric.js 코어/레이어/히스토리) | `editor-engineer` | `.claude/agents/editor-engineer.md` |
| 포즈 SVG/PNG 인입/태깅/임베딩 | `pose-curator` | `.claude/agents/pose-curator.md` |
| AI 대본 분석/장면 분리/추천 | `scene-analyzer` | `.claude/agents/scene-analyzer.md` |
| 자동 페이지 컴포지션 알고리즘 | `layout-composer` | `.claude/agents/layout-composer.md` |
| **관리자 콘솔/CRUD/검수 큐** | `admin-builder` | `.claude/agents/admin-builder.md` ★ M3 핵심 |
| POD PDF / preflight | `pdf-publisher` | `.claude/agents/pdf-publisher.md` |
| UI/UX/반응형/디자인 시스템/OG | `ui-designer` | `.claude/agents/ui-designer.md` |
| 테스트/보안/접근성 | `qa-tester` | `.claude/agents/qa-tester.md` |
| 외부 도구 산출물 흡수 (Cursor/Claude Artifacts) | `integration-bridge` | `.claude/agents/integration-bridge.md` |
| 작업 라우팅 | `orchestrator` | `.claude/agents/orchestrator.md` |

위임 시 항상 **자기완결 프롬프트** (목표 / DoD / 관련 모듈·계약 / 휴먼 게이트 여부) 작성.

### 🚦 휴먼 게이트 (반드시 사용자 승인 후 진행)

다음 작업은 자동 진행하지 말 것:
- 결제/플랜 변경, 가격 결정 (M7)
- DB 마이그레이션 실행 (단순 schema 변경 외)
- 외부 API 키 발급/회전
- 프로덕션 배포는 자동이지만 **breaking change 가 있는 push 는 사용자에게 보고 후**

### ⚠️ 절대 하지 말아야 할 것

`docs/reference/FABRIC_EDITOR_GUIDE.md` §25 의 금기 + 우리 추가:
- canvas 인스턴스를 React `useState` 에 보관 (use ref + Context)
- `canvas.on()` 에 익명 함수 직접 전달 (off 불가)
- src 디렉토리 안에 빌드 산출물 commit (.gitignore 가 차단하지만 주의)
- editor-* 패키지에 React 의존 추가 (editor-ui 만 허용)
- 직접 hex 색상 (CSS 변수만)
- `// @ts-expect-error` JSX 안에 코멘트로 (페이지에 출력됨 — 직전 세션 버그)

### 🎬 시작 — 사용자에게 물어보세요

위 내용을 빠르게 검토했다고 알려주신 후, 다음 중 어디로 갈지 확인:

1. **A — M3 관리자 콘솔 풀 진행** (권장)
2. B — M2 마무리 / FOLLOWUP-16 / M4 등 다른 우선순위
3. 다른 특정 작업이 있으시면 말씀

진행 옵션 선택 후 해당 마일스톤의 sub-task 1번을 적절한 서브에이전트에 자기완결 프롬프트로 위임하세요.

---

**핸드오프 문서**: `docs/handoff/SESSION_HANDOFF_2026-05-06.md` 에 모든 환경/완료작업/이슈/통계가 정리되어 있습니다.
