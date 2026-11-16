# 새 세션 시작 프롬프트 (2026-11-16 갱신 — MODE-05/06 · LAYOUT-07/08 · SCRIPT-KO-05/06 반영)

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
   - `docs/handoff/SESSION_HANDOFF_2026-11-16.md` — **최신 핸드오프: 완료 내역·미완 액션·함정**
     (이전 누적 함정은 `SESSION_HANDOFF_2026-08-08.md` §5)
   - `docs/architecture/roadmap.md` — 작업 큐 (SW-BIZ (A) · MODE 섹션이 최신)
3. `git log --oneline -10` + `git status -sb` — 내가 만들지 않은 변경은 사용자 작업으로 보존

### ✅ 현재 상태 (2026-11-16 · PR #1~#6 머지 시점)

- main = prod. 워킹트리 clean. 시작 시 `gh run list --branch main --limit 1` 로 최종 HEAD CI 확인
- **웹툰 트랙 코드 완료** — MODE-01~06 · LAYOUT-07/08. 이미지 내보내기(시퀀스 ZIP · 롱 이미지),
  화면 스크롤 품질 지표(`pnpm adoption:webtoon`), 인물 없는 세그먼트 중앙 정렬, 세그먼트당 말풍선 4.
  **웹툰 모드는 아직 닫혀 있다** — 개방은 대표님 결정(아래 액션 표 "신규")
- **서술 손실 버그 2건 수정**(SCRIPT-KO-05/06) — 200자 초과 서술 잘림 + 대사 섞인 단락의 행동 묘사
  전량 폐기(코퍼스 18.5%). 원고 글자가 배치에 돌아왔다
- **측정**: POD 223p · 채택률/대사 보존 100% · 품질 87.9% / 웹툰 264seg · 스크롤 종합 95.4%
- CI 액션 Node 24(checkout v7 · setup-node v7 · pnpm/action-setup v6) + Playwright apt 장애 폴백
- 포즈 자산 수치 정본(ADR-0019): raw 1,260 · 태깅 대상 1,243 · 사이드카 1,058 · prod 1,262

### 🔴 대표님 액션 — 잔여 4건 + 개방 결정. 세션 시작 시 진행 여부부터 물을 것

1. **AI_GATEWAY_API_KEY 등록** ← **파급 최대**. `.env.local` 3곳(루트·apps/web·apps/admin) +
   `cd apps/web && vercel env add AI_GATEWAY_API_KEY production`.
   등록 즉시 CONTI-01 · AI-ACT-03 · SCRIPT-KO-02 착수 가능
2. ~~FOLLOWUP-68 + MODE-01 deploy~~ — ✅ 2026-08-09 완료
3. **PERF-ADMIN-03 인증 저장** — `pnpm perf:admin:save-auth --env prod` (비번은 어시 취급 불가)
4. **prod 한글 PDF 육안 확인** — 편집기에서 publish 1회
5. **웹툰 프리셋 시드 재실행** — **반드시 `git pull` 후**:
   ```bash
   set -a; source .env.local; set +a; pnpm tsx scripts/seed-formats.ts
   ```
6. **(신규) 웹툰 모드 개방 결정** — 코드 준비 완료. 개방 = ① 모달 "준비 중" 해제 ② 서버 px 가드 해제
   (`projects/save` · `script/full-pipeline` · `script/compose`) ③ prod 프리셋 isActive(5번 시드 후).
   main 머지 = prod 배포

> 어시스턴트는 prod DB 변경 CLI(권한 분류기 차단)·키 발급·비밀번호·결제를 수행할 수 없음.
> 2026-11 세션은 클라우드 컨테이너라 `.env.local` 을 확인하지 못했다 — 로컬 세션에서 재확인할 것.

### 🎯 다음 코드 큐 — 키 없이 바로 착수 가능

- 🟢 **FOLLOWUP-71** `중복` 폴더 17장 — 태깅 제외 ↔ 적재 포함 불일치 정합화
- 🟢 `.nvmrc` `v25`(비 LTS) → LTS 24 정렬 검토 — Vercel 런타임 설정과 함께
- 🟢 플랫폼별 웹툰 분할 높이 프리셋 — 규격 확인 후 `maxSliceHeightPx` 메뉴 노출
- ⏸ LAYOUT-06 · 웹툰 상한/화면 지표 상수 교정 — 실사용 로그(FOLLOWUP-60) 이후
- 🚦 키 등록 시: **CONTI-01** → **AI-ACT-03** → **SCRIPT-KO-02**
- 🚦 기타 게이트: onnxruntime-node(BUBBLE-02) · Upstash(SEC-RATE-01) · POSE3D-01 결제

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
# 웹툰(690px) 판형 + 화면 스크롤 품질 → data/eval/adoption-webtoon-baseline.json
pnpm adoption:webtoon
# push 후 CI 확인 (600초 타임아웃 — CI 는 ~11분이라 자주 놓친다. gh run view <id> 로 재확인)
# 연속 push 하면 앞선 run 은 concurrency 로 cancelled — 최종 HEAD 의 run 만 보면 된다
bash scripts/ci-watch.sh
```

### ⚠️ 함정 노트 (실측 누적 — 상세는 핸드오프 §5)

- **"보존" 지표는 대사만 센다** — 서술 손실 버그 2건이 수개월간 안 잡혔다. 파서를 바꿀 때는
  원문 글자 대비 보존율을 직접 확인할 것
- **CI 가 `Temporary failure resolving 'azure.archive.ubuntu.com'` 로 실패하면 러너 apt 장애** —
  Playwright 설치 단계에 폴백이 있으니 재실행 1회로 확인. 코드 문제 아님
- **같은 브랜치에 열린 PR 이 있으면 다음 작업을 push 하지 말 것** — PR 에 섞이고 CI 가 취소된다.
  로컬 `wip/*` 에 커밋 → 머지 후 `checkout -B <branch> origin/main` + cherry-pick
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

위 내용 검토 후: ① 대표님 액션(1·3·4·5) 진행 결과와 6번 웹툰 개방 결정 ② 다음 작업 선택을
확인하고 진행해 주세요. **키 등록 전이면 FOLLOWUP-71 부터**(웹툰 개방 결정 시 개방이 우선).
세션 종료 시 `docs/handoff/SESSION_HANDOFF_<날짜>.md` 신규 작성 + 이 파일 갱신을 잊지 말 것.
