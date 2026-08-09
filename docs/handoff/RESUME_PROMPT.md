# 새 세션 시작 프롬프트 (2026-08-09 갱신 — MODE-02 + prod 장애 복구 반영)

> 새 Claude Code 세션을 열 때 **"🚀 프롬프트" 섹션부터 끝까지 그대로 복사 붙여넣기** 하세요.
> 이 파일은 세션 마무리 때마다 갱신됩니다 — 상단 날짜로 최신 여부 확인.

---

## 🚀 프롬프트 (이 줄 아래부터 끝까지 복사)

안녕하세요. **StoryWork**(PNG 1,260장 자산 기반 fabric.js v6 스토리보드 편집기) 개발을 이어서 진행합니다.

### 📁 프로젝트 위치 + 시작 순서 (고정)

```
/Users/yohan/Developer/claude/storywork
```

1. `git pull` → `pnpm install` → 디스크 확인(`df -h /System/Volumes/Data`, 98%+ 면 **병렬 pnpm 절대 금지**·`turbo --concurrency=1`)
2. 문서 읽기 (이 순서, 핵심만):
   - `CLAUDE.md` — 프로젝트 SSOT (도메인·스택·모듈 규칙·마일스톤)
   - `docs/handoff/SESSION_HANDOFF_2026-08-08.md` — **최신 핸드오프: 완료 내역·미완 액션·함정 전체**
   - `docs/architecture/roadmap.md` — 작업 큐 (SW-BIZ (A) · MODE 섹션이 최신)
3. `git log --oneline -10` + `git status -sb` — 내가 만들지 않은 변경은 사용자 작업으로 보존

### ✅ 현재 상태 (MODE-02 push 시점 기준)

- 워킹트리 clean · web/admin prod 라이브 · 전체 검증 79 태스크 green.
  시작 시 `gh run list --branch main --limit 1` 로 최종 HEAD CI 확인
- **MODE-01+02 완료 · prod 마이그레이션 적용 완료**(2026-08-09 01:13, 대표님 실행 —
  FOLLOWUP-68 이력 정리 겸용). 모드 선택 UX(웹툰은 "준비 중" 비활성) + 판형 단위계 필터 +
  서버 px 가드 + admin unit 지원. 웹툰 프리셋 시드만 잔여(액션 5번)
- **08-09 prod 장애 사후 기록**: 스키마 push 가 마이그레이션보다 먼저 배포돼 P2022 로
  판형 API 503·저장 실패 ~2.5h → 마이그레이션 적용으로 복구. 함정 노트 ★★ 참조
- **자동배치**: 채택률 100% · 대사 보존 100% · 페이지 222(장면 217 = 1.02배). 리포트 4건 `docs/eval/`
- **배치 품질**(LAYOUT-04 지표 + LAYOUT-05 개선) — 종합 **87.6%**. 구도 균형 61.5% ·
  지면 밀도 90.2% · 대사 밀도 86.5% · 시선 흐름 100% · 얼굴 가림 회피 **100%**.
  LAYOUT-06(잔여 축)은 수확 체감 — 실사용 로그(FOLLOWUP-60) 이후 재개
- **대사/지문 구분**(SCRIPT-KO-04) — 헤딩은 장면 메타로 흡수, 서술·지문은 캡션 박스로.
  페이지 255 → 222
- 포즈 자산 수치 정본 확정(ADR-0019): raw 1,260 · 태깅 대상 1,243 · 사이드카 1,058 · prod 1,262
- 한글 PDF 실가동 — prod 배포 완료, 실 publish 육안 확인만 남음

### 🔴 대표님 액션 — 잔여 4건(1·3·4·5). 세션 시작 시 진행 여부부터 물을 것

2번(마이그레이션)은 2026-08-09 완료. 실행 결과만 공유해 주시면 후속은 어시가 이어받습니다.

1. **AI_GATEWAY_API_KEY 등록** ← **파급 최대**. `.env.local` 3곳(루트·apps/web·apps/admin) +
   `cd apps/web && vercel env add AI_GATEWAY_API_KEY production`.
   등록 즉시 CONTI-01 · AI-ACT-03 · SCRIPT-KO-02 착수 가능
2. ~~FOLLOWUP-68 + MODE-01 deploy~~ — **✅ 2026-08-09 완료** (prod 200 + unit 백필 실측)
3. **PERF-ADMIN-03 인증 저장** — `pnpm perf:admin:save-auth --env prod` (비번은 어시 취급 불가).
   저장 후 알리면 측정·P75 분석은 어시가
4. **prod 한글 PDF 육안 확인** — 편집기에서 publish 1회
5. **MODE-01 웹툰 프리셋 시드** — 2번 성공 후 1회 (isActive:false 라 사용자 노출 없음):
   ```bash
   set -a; source .env.local; set +a; pnpm tsx scripts/seed-formats.ts
   ```

> 어시스턴트는 prod DB 변경 CLI(권한 분류기 차단)·키 발급·비밀번호·결제를 수행할 수 없음.
> **재확인 2026-08-08**: `.env.local` 3곳 모두 `AI_GATEWAY_API_KEY` 0건 · `tmp/perf/admin-auth.json`
> 부재 — 1·3번 미실행 확정.

### 🎯 다음 코드 큐 — 키 없이 바로 착수 가능

- 🟢 **MODE-03** ai-layout 웹툰 분기 — **웹툰은 수용량 초과가 페이지 분할이 아니라 스트립 연장**,
  분할 전략 자체가 다르다. px 판형의 인쇄 경로(pdf-engine·preflight) 가드 포함.
  mm 와 px 를 한 타입에 섞지 말 것(`Format.unit` 이 판별자). 완성 시 웹툰 세그먼트
  활성화(FormatPickerModal disabled 해제) + 프리셋 isActive 활성화 + 서버 가드 해제가 한 세트
- 🟢 산문 서술 문장 단위 분할 — `parse-novel` 이 단락을 200자에서 자른다. 캡션이 여러 줄을 담게 된
  지금은 문장 단위가 더 맞다
- ⏸ LAYOUT-06 배치 품질 잔여 축(균형 61.5 · 대사 밀도 86.5) — 수확 체감 구간.
  실사용 로그(FOLLOWUP-60) 도입 후 실측 채택률과 상관을 보고 재개
- 🚦 키 등록 시: **CONTI-01** → **AI-ACT-03** → **SCRIPT-KO-02**
- 🚦 기타 게이트: onnxruntime-node(BUBBLE-02 ONNX 검출기) · Upstash(SEC-RATE-01) · POSE3D-01 결제

### 🔧 핵심 환경 (반복 질문 방지)

- GitHub: `papascompany/storywork_editor` (PUBLIC, main). push = Vercel prod 자동배포
- Supabase prod: `wjpyeqckuxyfeytuzgon` — 다른 계정이라 MCP 접근 불가. **로컬 `.env.local` 이 prod DB 를 가리킴**(스크립트 실행 주의)
- 마이그레이션 이원화: 앱 스키마 `prisma/migrations/` · RLS/트리거 `supabase/migrations/`
- AI 키(ANTHROPIC/VOYAGE/OPENAI/AI_GATEWAY) 미등록 — 검색은 mock 임베딩, LLM 경로는 env 하드 게이트
- 포즈 자산: `data/poses/raw/` 1,260 PNG(gitignored) + 25점 사이드카 1,058건(커밋됨) — 수치 정본 ADR-0019
- PDF 폰트: `packages/pdf-engine/assets/fonts/PretendardVariable.ttf` 커밋됨 — cwd 자동 발견, env 불필요
- 평가 자산: `data/eval/scripts/` 21편/217장면 + `data/eval/adoption-*.json`

### 📋 자주 쓰는 명령

```bash
# dev 서버는 preview MCP 사용 (.claude/launch.json: web=3000, admin=3001, storybook=6006)
# 검증 (병렬 금지)
pnpm turbo run typecheck lint test --concurrency=1
# 채택률 + 배치 품질 재측정 (키·DB 불요, 결정론). --verbose 로 하위 페이지 상세
pnpm adoption:measure
# push 후 CI 확인 (600초 타임아웃 — CI 는 ~11분이라 자주 놓친다. gh run view <id> 로 재확인)
# 연속 push 하면 앞선 run 은 concurrency 로 cancelled — 최종 HEAD 의 run 만 보면 된다
bash scripts/ci-watch.sh
```

### ⚠️ 함정 노트 (실측 누적 — 상세는 핸드오프 §5)

- **스키마 컬럼 추가는 "DB 먼저, 코드 나중"** — push=prod 자동배포라, 마이그레이션 미적용
  상태로 스키마 커밋을 push 하면 Prisma 가 select 없는 조회에도 새 컬럼을 나열해 **모든
  관련 조회가 P2022 로 죽는다**(08-09 실측 ~2.5h 장애). 순서: 마이그레이션 파일 커밋 →
  **prod deploy 실행·확인** → 스키마 소비 코드 push. additive 라도 예외 없다

- **품질 지표는 배치기의 목적함수와 독립이어야 변별력이 있다** — 배치기가 최소화하는 항을 그대로
  지표로 쓰면 순환 논증. 의존 축은 "높은 게 당연, **떨어지면 회귀**"로만 읽는다
- **의존 축이 낮으면 알고리즘이 아니라 입력(슬롯 좌표)을 의심하라** — 얼굴 가림 62.7%의 범인은
  배치 로직이 아니라 손으로 적은 프리셋 좌표 하나였다(157페이지 전부 영향)
- **캡션·다줄 텍스트는 줄당 개별 레이어로** — pdf-lib `drawText` 의 `\n` 은 페이지 기본
  lineHeight(24pt)로 렌더돼 박스를 넘친다
- **세션 종료 시 핸드오프+RESUME_PROMPT 갱신은 커밋과 한 세트** — 08-05 커밋 3건이 문서 없이 남아
  인계가 끊긴 전례
- **roadmap 작업 ID 는 전역 유일** — 신규 등록 전 `grep -n "\[XXX-NN\]" docs/architecture/roadmap.md`.
  중복 전수 점검은 `grep -o "\[[A-Z][A-Z0-9-]*-[0-9][0-9]*\]" docs/architecture/roadmap.md | sort | uniq -d`
- **pdf-lib `subset:true` + 한글 = 글리프 파괴** — 전체 임베드만 정상. fontkit 2.x 는 pdf-lib 비호환
- **ingest upsert 는 slug 안정성 전제** — 체계 변경 후 재적재는 전량 신규 insert 로 이중화.
  `ingest:dry` 선행, 사고 시 `scripts/cleanup-stale-poses.ts`
- **prod DB 변경 CLI 는 권한 분류기 차단** — 조사만 하고 실행 명령은 대표님께 전달
- macOS 파일명 NFD — 한글 폴더명 비교 전 NFC 정규화
- 실기 브라우저: 하이드레이션 전 클릭 유실 → `read_page` 후 ref 클릭
- UI 작업 SOP: `/ui-spec` → 동의 → 구현 → `/visual-check` → `/ci-watch`
- editor-* 패키지 React 의존 금지(editor-ui 만), canvas 인스턴스 useState 보관 금지, 직접 hex 금지(CSS 변수)
- 커밋 subject 소문자/한글 시작(commitlint), body ≤100자/줄, `Co-Authored-By` 유지

### 🚦 휴먼 게이트 (자동 진행 금지)

결제/플랜/가격 · DB 마이그레이션 실행/데이터 삭제 · 외부 API 키 발급/회전 · 새 런타임 의존성 추가 ·
breaking change push 는 보고 후

### 🎬 시작

위 내용 검토 후: ① 대표님 액션 5건 진행 결과 ② 다음 작업 선택을 확인하고 진행해 주세요.
**키 등록 전이면 MODE-03 부터** (MODE-01/02 완료, 웹툰 시드는 액션 5번).
세션 종료 시 `docs/handoff/SESSION_HANDOFF_<날짜>.md` 신규 작성 + 이 파일 갱신을 잊지 말 것.
