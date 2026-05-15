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

1. **`CLAUDE.md` 또는 `AGENTS.md`** — 프로젝트 마스터 사양(SSOT). 도메인/기술 스택/모듈 규칙
2. **`docs/handoff/SESSION_HANDOFF_2026-05-15.md`** — 최신 세션. admin/editor Nike 정렬, 인증, 슬롯 좌표, navigation 성능 이슈의 실제 상태
3. **`DESIGN-nike.md`** — admin dashboard + editor chrome 의 현재 디자인 기준
4. **`DESIGN.md`** — web marketing 전용 Figma/sticky-note 디자인 기준. admin/editor 에 혼용 금지
5. **`docs/handoff/SESSION_HANDOFF_2026-05-11.md`** — 이전 세션(마케팅 강화 + 편집기 Phase 1+2 흡수)
6. **`docs/reference/FABRIC_EDITOR_GUIDE.md`** — 편집기/fabric 작업 시 필수 운영 백서
7. **`docs/architecture/roadmap.md`** + **`docs/architecture/decisions.md`** — 오토파일럿 큐와 ADR

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
- `main` 은 `origin/main` 이상이어야 합니다. 2026-05-15 기준 최소 최신 커밋은 `56a0cd2 style(admin): 인증 페이지 nike 토큰 일관 적용`.
- 그 직전 필수 커밋:
  - `2d2b03c fix(editor): 템플릿 적용 후 슬롯이 좌상단에 겹쳐 보이는 P0 버그 수정`
  - `01f8cf2 perf(admin): 메뉴 전환 4초 지연 개선 — requireRole cache + templates select`
- DB Resource 카운트: **1,270건**
- web/admin production 도메인 READY 기대

### 📊 현재 진행 위치 (한 줄 요약)

> **M0~M3 + 마케팅 + 편집기 Phase 1+2 + M5 100% + 페이지 시스템 + 사용자 인증 + admin Nike 1차 정렬 완료**.
> 2026-05-15 이후의 우선순위는 AI 마일스톤 진입 전 **디자인 시스템 안정화와 admin navigation 성능 체감 개선**입니다.
> admin 은 `DESIGN-nike.md`, marketing web 은 `DESIGN.md`, editor 는 `DESIGN-nike.md` 를 tool chrome 으로 번역한 `--editor-*` 토큰을 기준으로 합니다.

### 🎯 권장 다음 작업

1. **DESIGN-SYS 검증** — admin `mkt-*` 0건 유지, editor Nike-neutral chrome 시각 확인, visual regression 추가.
2. **PERF-ADMIN navigation 측정** — local/prod waterfall 로 4초 지연 개선 효과와 남은 병목 확인.
3. **M4 AI 파이프라인** — 위 1~2가 안정되면 진입. ANTHROPIC/VOYAGE 또는 OPENAI 키가 필요합니다.

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

1. **DESIGN-SYS 검증 이어가기** — admin/editor Nike 기준 시각 확인, snapshots/visual regression 추가
2. **PERF-ADMIN navigation 측정/개선** — 4초 이동 지연의 실제 waterfall 확인과 추가 최적화
3. **M4 AI 파이프라인 시작** — API 키 휴먼 게이트 확인 후 진행
4. 다른 특정 작업

---

**최신 핸드오프 문서**: `docs/handoff/SESSION_HANDOFF_2026-05-15.md`
