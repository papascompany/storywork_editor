# 새 세션 시작 프롬프트 (2026-11-28 갱신 — PR #1~#29 · M9-01 Lighthouse 게이트 · Anthropic 키 등록 · CONTI-01 반영)

> 새 Claude Code 세션을 열 때 **"🚀 프롬프트" 섹션부터 끝까지 그대로 복사 붙여넣기** 하세요.
> 이 파일은 세션 마무리 때마다 갱신됩니다 — 상단 날짜로 최신 여부 확인.

---

## 🚀 프롬프트 (이 줄 아래부터 끝까지 복사)

안녕하세요. **StoryWork**(PNG 1,260장 자산 기반 fabric.js v6 스토리보드 편집기) 개발을 이어서 진행합니다.

### 📁 프로젝트 위치 + 시작 순서 (고정)

```
/Users/yohan/Developer/claude/storywork
```

1. **로컬 상태부터 확인 (pull 전)** — 이 저장소는 원래 로컬에서 작업해 왔고, 2026-11-05~19 작업만
   **클라우드 세션**(브랜치 `claude/sharp-einstein-3ob2c6` → PR #1~#25 rebase 머지)에서 했다.
   로컬에 08월 이후 push 안 한 커밋·미커밋 변경이 남아 있을 수 있다:
   ```bash
   git status -sb
   git fetch origin && git log --oneline origin/main..HEAD
   ```
   - 미커밋 변경 → 지우지 말고 사용자에게 확인 후 커밋 또는 `git stash`
   - push 안 한 커밋 → pull 시 merge 가 생긴다. 내용 확인 후 사용자와 정리 방식 결정(rebase·force push 임의 금지)
   - 둘 다 비었으면 → `git checkout main && git pull`
2. `pnpm install` → 디스크 확인(`df -h /System/Volumes/Data`, 98%+ 면 **병렬 pnpm 절대 금지**·`turbo --concurrency=1`).
   원격 `claude/*` 브랜치는 머지 완료 — 지워도 됨. `data/poses/raw/`·`.env.local` 은 gitignored 라 pull 영향 없음
3. 문서 읽기 (이 순서, 핵심만):
   - `CLAUDE.md` — 프로젝트 SSOT (도메인·스택·모듈 규칙·마일스톤)
   - `docs/handoff/SESSION_HANDOFF_2026-11-28.md` — **최신 핸드오프: 완료 내역·미완 액션·함정**
     (직전 `SESSION_HANDOFF_2026-11-16.md` · 이전 누적 함정은 `SESSION_HANDOFF_2026-08-08.md` §5)
   - `docs/architecture/roadmap.md` — 작업 큐 (SW-BIZ (A) · MODE 섹션이 최신)
   - (시각 요약) `docs/reports/2026-11-19_progress_dashboard.html` · `docs/plan.html#status` — 브라우저로 열기
4. `git log --oneline -10` — 내가 만들지 않은 변경은 사용자 작업으로 보존

### ✅ 현재 상태 (2026-11-28 · PR #1~#29 머지 시점)

- **CONTI-01 장면 메타(PR #29)** — LLM 컨텍스트 확대 · view · 샷사이즈 규칙 · 묶음 병렬+타임아웃 ·
  `SceneDoc.meta.sceneMeta` 영속화 · 콘티 힌트로 확정 단계 LLM 재호출 차단. **`STORYWORK_LLM` 꺼짐 → 실호출 미검증**

- **M9-01 Lighthouse 회귀 게이트(PR #27)** — CI 에서 공개 6페이지 하한 검사. perf 는 러너 노이즈로 거친 하한
  (min(baseline,90)−25, 3회 중간값). 점수를 올리면 `pnpm lighthouse:baseline` 으로 예산 갱신 커밋
- **Anthropic 키 등록 완료(11-28)** — `ANTHROPIC_API_KEY` 로컬 3곳 + Vercel prod. Console `storywork` 워크스페이스 월 $50.
  `AI_GATEWAY_API_KEY` 불필요(코드가 ANTHROPIC 키 직접 지원). **`STORYWORK_LLM` 은 꺼져 있음 — 켜기 = 과금 시작, 대표 결정**
- `pnpm.overrides.zod = 4.4.2` 고정(lighthouse 추가 시 zod 상향으로 web 타입 깨진 전례)
- 원격 `claude/eager-johnson-6rmo0m` · `claude/heuristic-dubinsky-735b19` 와 `stash@{0}` 는 대표 결정으로 보존

- main = prod(원격 기준 — 로컬 워킹트리는 위 1번으로 확인). 시작 시 `gh run list --branch main --limit 1` 로 최종 HEAD CI 확인
- **웹툰 트랙 코드 완료** — MODE-01~06 · LAYOUT-07/08. 이미지 내보내기(시퀀스 ZIP · 롱 이미지),
  화면 스크롤 품질 지표(`pnpm adoption:webtoon`), 인물 없는 세그먼트 중앙 정렬, 세그먼트당 말풍선 4.
  **웹툰 모드는 아직 닫혀 있다** — 개방은 대표님 결정(아래 액션 표 "신규")
- **서술 손실 버그 2건 수정**(SCRIPT-KO-05/06) — 200자 초과 서술 잘림 + 대사 섞인 단락의 행동 묘사
  전량 폐기(코퍼스 18.5%). 원고 글자가 배치에 돌아왔다
- **측정**: POD 223p · 채택률/대사 보존 100% · 품질 87.9% / 웹툰 264seg · 스크롤 종합 95.4%
- CI 액션 Node 24(checkout v7 · setup-node v7 · pnpm/action-setup v6) + Playwright apt 장애 폴백
- `.nvmrc` v24 · Playwright 1.64.1 · CI 러너 ubuntu-latest(26.04) · ESLint 의존성 매트릭스 룰 실동작(FOLLOWUP-01)
- 시각 회귀가 실제 화면을 비교(더미 env) · admin 웹폰트 실적용 + FCP −42% · web 폰트 preload 제거 · 쿠키 동의(분석 도구 켜질 때 노출)
- M9-03 PDF 이미지 SSRF 차단 · M9-02 키보드 E2E 5종(CI) + 단축키/포커스/복제 선택 버그 수정
- **M9-02 잔여 종결(11-19)**: 직접 구현 모달 5종 포커스 복귀 + Tab 트랩(`apps/web/lib/use-modal-focus.ts`, PR #23) ·
  RightPanel 은 사용자가 고른 탭 유지 — 선택 변경 시 자동 전환 제거(대표 결정, PR #24)
- 포즈 자산 수치 정본(ADR-0019): raw 1,260 · 태깅 대상 1,243 · 사이드카 1,058 · prod 1,262

### 🔴 대표님 액션 — 세션 시작 시 진행 여부부터 물을 것

1. ~~AI 키 등록~~ — ✅ 2026-11-28 `ANTHROPIC_API_KEY` 등록 완료
2. **`STORYWORK_LLM=1` 켜기 결정** — = 과금 시작(워크스페이스 한도 $50). 모델 교체(`claude-sonnet-4-6` → `5-5`) 여부도
3. **PERF-ADMIN-03 인증 저장** — `pnpm perf:admin:save-auth --env prod` (비번은 어시 취급 불가)
4. **prod 한글 PDF 육안 확인** — 편집기에서 publish 1회
5. **웹툰 프리셋 시드 재실행** — prod DB 쓰기(없는 행만 생성). 프리셋은 `isActive:false` 로 들어감 → 개방은 6번:
   ```bash
   set -a; source .env.local; set +a; pnpm tsx scripts/seed-formats.ts
   ```
6. **웹툰 모드 개방 결정** — 코드 준비 완료. 개방 = ① 모달 "준비 중" 해제 ② 서버 px 가드 해제
   (`projects/save` · `script/full-pipeline` · `script/compose`) ③ prod 프리셋 isActive(5번 시드 후).
   main 머지 = prod 배포
7. **FOLLOWUP-71 prod `중복` 17행 삭제** — 코드는 PR #8 로 완료, 데이터 삭제만 남음(휴먼 게이트)

> 어시스턴트는 prod DB 변경 CLI(권한 분류기 차단)·키 발급·비밀번호·결제를 수행할 수 없음.
> 세션 시작 시 `.env.local` 키 존재 여부만 확인(값 출력 금지).

### 🎯 다음 코드 큐 — 키 없이 바로 착수 가능

- 🟢 **AI-ACT-03** → **SCRIPT-KO-02** — 키 등록 완료로 착수 가능(실호출은 `STORYWORK_LLM` 결정 후)
- 🚦 CONTI-01 실호출 측정 · ContiBoard 샷 라벨 UI(`/ui-spec`) · Inngest 비동기(키 필요) — CONTI-01 후속
- 🟢 **PERF-WEB-05** `/login` LCP 12.7s · `/` TBT 493ms → 90 달성 시 `pnpm lighthouse:baseline`
- 🟢 **M9-04** 부하/벤치(동시 편집 100)
- ✅ ~~FOLLOWUP-71 코드~~ (PR #8) · ~~M9-01~~ (PR #27) · ~~CONTI-01~~ (PR #29, 11-28)
- ✅ ~~키보드 잔여(모달 포커스 · RightPanel 탭)~~ — 11-19 PR #23 · #24
- ✅ `.nvmrc` v25 → v24 (운영 Vercel 24.x 와 일치, 2026-11-17). `engines.node: >=20.0.0` 고정 여부는 별도 검토
- 🟢 플랫폼별 웹툰 분할 높이 프리셋 — 규격 확인 후 `maxSliceHeightPx` 메뉴 노출
- ⏸ LAYOUT-06 · 웹툰 상한/화면 지표 상수 교정 — 실사용 로그(FOLLOWUP-60) 이후
- 🚦 AI-ACT-01 실 임베딩 — Voyage 또는 OpenAI 키 필요
- 🚦 기타 게이트: onnxruntime-node(BUBBLE-02) · Upstash(SEC-RATE-01) · POSE3D-01 결제

### 🔧 핵심 환경 (반복 질문 방지)

- GitHub: `papascompany/storywork_editor` (PUBLIC, main). push = Vercel prod 자동배포
- Supabase prod: `wjpyeqckuxyfeytuzgon` — 다른 계정이라 MCP 접근 불가. **로컬 `.env.local` 이 prod DB 를 가리킴**(스크립트 실행 주의)
- 마이그레이션 이원화: 앱 스키마 `prisma/migrations/` · RLS/트리거 `supabase/migrations/`
- AI 키: `ANTHROPIC_API_KEY` 등록(11-28) · VOYAGE/OPENAI 미등록 — 검색은 mock 임베딩, LLM 경로는 `STORYWORK_LLM=1` 스위치(꺼짐)
- 포즈 자산: `data/poses/raw/` 1,260 PNG(gitignored) + 25점 사이드카 1,058건(커밋됨) — 수치 정본 ADR-0019
- PDF 폰트: `packages/pdf-engine/assets/fonts/PretendardVariable.ttf` 커밋됨 — cwd 자동 발견, env 불필요
- 평가 자산: `data/eval/scripts/` 21편/217장면 + `data/eval/adoption-*.json`

### 📋 자주 쓰는 명령

```bash
# dev 서버는 preview MCP 사용 (.claude/launch.json: web=3000, admin=3001, storybook=6006)
# ⚠ 로컬 3000 은 다른 프로젝트가 쓰고 있을 수 있다 — prod 빌드 검증은 next start --port 3100
# Lighthouse 게이트 (web 을 더미 env 로 빌드·기동한 뒤) / 점수 개선 후 예산 갱신
pnpm lighthouse:gate --base-url http://localhost:3100
pnpm lighthouse:baseline --base-url http://localhost:3100
# 검증 (병렬 금지)
pnpm turbo run typecheck lint test --concurrency=1
# 채택률 + 배치 품질 재측정 (키·DB 불요, 결정론). --verbose 로 하위 페이지 상세
pnpm adoption:measure
# 웹툰(690px) 판형 + 화면 스크롤 품질 → data/eval/adoption-webtoon-baseline.json
pnpm adoption:webtoon
# 키보드 E2E 로컬 실행 (web 을 더미 Supabase URL 로 빌드·기동한 뒤 — CI 시각 회귀 단계와 동일 조건)
#   env 값은 .github/workflows/ci.yml "Set dummy env for visual regression" 7개를 셸에 export 한 뒤
#   pnpm --filter @storywork/web build && pnpm --filter @storywork/web start  (셸 env 가 .env.local 보다 우선)
WEB_BASE_URL=http://localhost:3000 pnpm --filter @storywork/web exec playwright test e2e/keyboard.spec.ts --workers=1 --trace off
# push 후 CI 확인 (600초 타임아웃 — CI 는 ~11분이라 자주 놓친다. gh run view <id> 로 재확인)
# 연속 push 하면 앞선 run 은 concurrency 로 cancelled — 최종 HEAD 의 run 만 보면 된다
bash scripts/ci-watch.sh
```

### ⚠️ 함정 노트 (실측 누적 — 상세는 핸드오프 §5)

- **`pnpm add` 는 lockfile 을 재해석해 무관한 의존성을 올린다** — 추가 후 `git diff pnpm-lock.yaml` 확인(zod 상향 전례)
- **web 단독 빌드 전 전체 `pnpm build`** — 패키지 dist 가 오래되면 export 누락으로 실패
- **Lighthouse perf 는 공용 러너에서 ±25 흔들린다** — CI 게이트는 큰 퇴보만, 정밀 측정은 로컬

- **"보존" 지표는 대사만 센다** — 서술 손실 버그 2건이 수개월간 안 잡혔다. 파서를 바꿀 때는
  원문 글자 대비 보존율을 직접 확인할 것
- **CI 가 `Temporary failure resolving 'azure.archive.ubuntu.com'` 로 실패하면 러너 apt 장애** —
  Playwright 설치 단계에 폴백이 있으니 재실행 1회로 확인. 코드 문제 아님
- **같은 브랜치에 열린 PR 이 있으면 다음 작업을 push 하지 말 것** — PR 에 섞이고 CI 가 취소된다.
  로컬 `wip/*` 에 커밋 → 머지 후 `checkout -B <branch> origin/main` + cherry-pick
- **직접 만든 모달은 `useModalFocus(open, ref, { onEscape })`** — 포커스 복귀·Tab 트랩(WCAG 2.4.3). Radix Dialog 는 자체 지원
- **새 필수 env 추가 시 `.github/workflows/ci.yml` "Set dummy env for visual regression" 에도** — 없으면 CI 의 web/admin 전 페이지 500
- **편집기 E2E 로그인은 `apps/web/e2e/support/fake-supabase.ts`** 로 — 프로덕션 코드에 인증 우회 금지
- `parse-novel` 은 "그날·다음날·한편…"으로 시작하는 단락을 장면 구분자로 빼낸다(테스트 문장 주의)

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

위 내용 검토 후: ① `.env.local` 키 존재 여부 확인(값 출력 금지) ② 대표님 액션(2~7) 진행 결과와 웹툰 개방 결정
③ 다음 작업 선택을 확인하고 진행해 주세요. 기본 다음 작업은 **AI-ACT-03**(웹툰 개방 결정 시 개방이 우선. `STORYWORK_LLM` 을 켰다면 CONTI-01 실호출 측정 먼저).
작업 흐름(11월 세션 방식): 기능 브랜치 → PR → CI green → rebase 머지(= prod 배포).
세션 종료 시 `docs/handoff/SESSION_HANDOFF_<날짜>.md` 신규 작성 + 이 파일 갱신을 잊지 말 것.
