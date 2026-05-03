# StoryWork

> AI 스토리보드 편집기 — 1,000+ **PNG 포즈 라이브러리**(향후 SVG) + AI 대본 분석 + fabric.js 기반 캔바급 편집기 + POD 출판

## 📚 문서

- **[CLAUDE.md](CLAUDE.md)** — 마스터 사양서 (단일 진실 원천)
- **[SKILLS.md](SKILLS.md)** — 스킬/슬래시 커맨드 카탈로그
- **[docs/architecture/decisions.md](docs/architecture/decisions.md)** — ADR
- **[docs/architecture/roadmap.md](docs/architecture/roadmap.md)** — 마일스톤 작업 큐
- **[docs/agents/orchestration.md](docs/agents/orchestration.md)** — 에이전트 협업 시퀀스
- **[docs/modules/index.md](docs/modules/index.md)** — 모듈 명세
- **[docs/data-schema/erd.md](docs/data-schema/erd.md)** — ERD / Prisma

## 🤖 서브에이전트

| 역할            | 파일                                                                         |
| --------------- | ---------------------------------------------------------------------------- |
| 오케스트레이터  | [.claude/agents/orchestrator.md](.claude/agents/orchestrator.md)             |
| 아키텍트/플랫폼 | [.claude/agents/architect.md](.claude/agents/architect.md)                   |
| 편집기 엔진     | [.claude/agents/editor-engineer.md](.claude/agents/editor-engineer.md)       |
| 포즈 큐레이터   | [.claude/agents/pose-curator.md](.claude/agents/pose-curator.md)             |
| 대본 분석       | [.claude/agents/scene-analyzer.md](.claude/agents/scene-analyzer.md)         |
| 자동 배치       | [.claude/agents/layout-composer.md](.claude/agents/layout-composer.md)       |
| 관리자 콘솔     | [.claude/agents/admin-builder.md](.claude/agents/admin-builder.md)           |
| PDF 출판        | [.claude/agents/pdf-publisher.md](.claude/agents/pdf-publisher.md)           |
| UI 디자인       | [.claude/agents/ui-designer.md](.claude/agents/ui-designer.md)               |
| QA/보안         | [.claude/agents/qa-tester.md](.claude/agents/qa-tester.md)                   |
| 외부도구 브리지 | [.claude/agents/integration-bridge.md](.claude/agents/integration-bridge.md) |

## ⌨️ 슬래시 커맨드

- `/sw-next` — 다음 작업 1건 자동 진행
- `/sw-pose-ingest` — 포즈 자산 인입(PNG 1차 / SVG 자동 분기)
- `/sw-compose <projectId>` — 자동 배치
- `/sw-pdf <projectId>` — PDF 빌드 + 프리플라이트
- `/sw-review` — 변경에 대한 셀프 리뷰

## 시작 (M0 완료 후)

```bash
pnpm i
pnpm dev   # web + admin 동시 부팅
```

## DB 연동

```bash
# 1. 환경 변수 설정
cp .env.example .env.local
# .env.local 에서 DATABASE_URL, SUPABASE_* 값 채우기

# 2. Prisma client 생성 (Docker 불필요)
pnpm db:generate

# 3. DB 마이그레이션 (Docker + supabase start 필요 — Phase A)
pnpm db:migrate:dev

# 4. Supabase 로컬 스택 시작 (Docker 필요 — Phase A)
pnpm supabase:start
```

> Phase A (Docker 준비 후) 에서 진행할 것:
>
> - `docker desktop` 실행 후 `pnpm supabase:start`
> - Supabase studio: http://localhost:54323
> - `pnpm db:migrate:dev` 로 `supabase/migrations/20260426000000_init.sql` 적용
> - `supabase start` 출력의 `anon key` / `service_role key` 를 `.env.local` 에 기입

## 🛠 도구 협업

**Claude Code**(코드/문서/오케스트레이션) + **Claude(아티팩트)**(시안/카피) + **Cursor**(휴먼 인라인 편집) + **nano-banana 2**(이미지 생성). 자세한 흐름은 [docs/agents/orchestration.md](docs/agents/orchestration.md).
