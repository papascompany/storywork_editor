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
2. **`docs/handoff/SESSION_HANDOFF_2026-05-11.md`** — 직전 세션 (마케팅 강화 + 편집기 Phase 1+2 흡수) FOLLOWUP-34~38
3. **`docs/handoff/SESSION_HANDOFF_2026-05-10.md`** — 그 이전 (마케팅 4 페이지 + DESIGN.md) FOLLOWUP-30~33
4. **`docs/handoff/SESSION_HANDOFF_2026-05-07.md`** — 그 이전 (M3 100% 완료) FOLLOWUP-19~29
5. **`docs/handoff/SESSION_HANDOFF_2026-05-06.md`** — 그 이전 (M0~M2 완료) FOLLOWUP-01~18
6. **`DESIGN.md`** (루트) — Figma 마케팅 캔버스 디자인 시스템 토큰
7. **`docs/reference/FABRIC_EDITOR_GUIDE.md`** (3,106줄) — Bookmoa Storige Fabric.js 운영 백서 (편집기 작업 시 필수)
4. **`docs/architecture/roadmap.md`** — 53건 작업의 체크박스 (위에서 아래로 미완 픽)
5. **`docs/architecture/decisions.md`** — ADR 11건 (특히 ADR-0011 포즈 자산 정책)
6. **`.claude/agents/orchestrator.md`** — 본인이 루틴 진행자 역할일 때의 가드레일

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
- 마지막 커밋이 `feat(editor): followup-42 format remount + followup-46 모바일 pagepanel` 또는 `docs(handoff): ...`
- DB Resource 카운트: **1,270건**
- admin 328 + web **386** + editor-text 41 + editor-bubble 33 + editor-template 46 + editor-effects 81 + editor-history 66 + editor-core 78 + 기타 = **1000+ tests green**
- Vercel admin `e220aa5` + web `e8b6815` 모두 READY ✅

### 📊 현재 진행 위치 (한 줄 요약)

> **M0~M3 + 마케팅 + 편집기 Phase 1+2 + M5 100% + Templates API + ESLint 통일 (ADR-0012) + ★ 페이지 시스템 풀 구현 (8/8)**.
> Vercel 두 도메인 모두 READY. Supabase Cloud PNG 1,270.
> 사용자 web 풀: 마케팅 4 페이지 + 편집기 (FormatPicker → 다중 페이지 → 자동저장 → 복구 토스트 → 모든 도구 + 워드효과 45 + 말풍선 5 + 템플릿 5 + 한글/Pretendard + 모바일 PagePanel + Format remount + Storige UX 흡수).
> admin: 로그인 + 2FA + 풀 CRUD + Templates API.
> **다음 우선순위**: M4 (ANTHROPIC 키 게이트) 또는 M6 POD PDF (페이지 시스템과 자연 연결).

### 🎯 권장 다음 작업 (사용자 결정 후 진행)

남은 마일스톤 진입 옵션:

| 옵션 | 마일스톤 | 시간 | 가치 | 권장 |
|---|---|---|---|---|
| **A** | **M4 AI 파이프라인** (5 sub-task — ai-script 분석 / 추천 / 자동배치 / E2E / alternatives UI) | 8~12h | ★★★★ 핵심 사용자 가치 ("대본만 넣으면 페이지 자동 생성") | **권장** |
| B | M5 텍스트/말풍선/효과/템플릿 (4 sub-task — 한글 줄바꿈/꼬리 추적/워드효과/템플릿 적용) | 6~8h | ★★★ M4 결과를 다듬는 데 필요 | M4 후 |
| C | M2 마무리 (M2-07 ai-layout lowDpi / M2-09 tintMaskUrl) — 작은 작업 | 1~1.5h | ★★ M4 진입 전 사전 정리 | |
| D | FOLLOWUP 정리 (특히 23 admin lint 통일 / 24 AuditLog 인덱스 / 27 SlotCanvas 썸네일) | 2~3h | ★★ 부채 정리 | |
| E | M6 POD PDF (4 sub-task) — `pdf-engine` + 인쇄 사양 + 프리플라이트 | 8~10h | ★★ 출판 흐름 | M4/M5 후 |
| F | FOLLOWUP-16 (Storige P0 핫픽스 8건 — 모바일 안정성) | 2~3h | ★★ | |

**A (M4) 가 가장 권장** — M3 자산 운영 도구가 갖춰졌으니 이제 그 자산을 사용자 가치로 연결할 차례. 다음과 같이 진행하면 5 sub-task 가 자연스럽게 흐릅니다:
- M4-01 `ai-script` 분석 (대본 → 장면/대사) — `@scene-analyzer`
- M4-02 `ai-recommend` 포즈/배경/말풍선 추천 — `@scene-analyzer`
- M4-03 `ai-layout` compose() 결정론 시드 — `@layout-composer`
- M4-04 사용자 흐름 (대본 → 자동 페이지 N개) E2E — `@layout-composer + @editor-engineer`
- M4-05 alternatives UI (한 클릭 교체) — `@ui-designer`

**M4 진입 전 휴먼 게이트**:
- 🚦 **ANTHROPIC API 키 발급** + Vercel env 등록 (M4 핵심 의존성)
- 🚦 **VOYAGE 또는 OPENAI embedding 키** 발급 (M2-04 mock → 실 임베딩, 추천 정확도 측정)

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
