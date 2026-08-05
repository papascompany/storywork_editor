# 새 세션 시작 프롬프트 (2026-08-05 갱신)

> 새 Claude Code 세션을 열 때 **"🚀 프롬프트" 섹션부터 끝까지 그대로 복사 붙여넣기** 하세요.
> 이 파일은 세션 마무리 때마다 갱신됩니다 — 상단 날짜로 최신 여부 확인.

---

## 🚀 프롬프트 (이 줄 아래부터 끝까지 복사)

안녕하세요. **StoryWork**(PNG 1,260개 자산 기반 fabric.js v6 스토리보드 편집기) 개발을 이어서 진행합니다.

### 📁 프로젝트 위치 + 시작 순서 (고정)

```
/Users/yohan/Developer/claude/storywork
```

1. `git pull` → `pnpm install` → 디스크 확인(`df -h /System/Volumes/Data`, 98%+ 면 **병렬 pnpm 절대 금지**·`turbo --concurrency=1`)
2. 문서 읽기 (이 순서, 핵심만):
   - `CLAUDE.md` — 프로젝트 SSOT (도메인·스택·모듈 규칙·마일스톤)
   - `docs/handoff/SESSION_HANDOFF_2026-08-05.md` — **최신 핸드오프: 완료 내역·미완 액션·함정 전체**
   - `docs/architecture/roadmap.md` — 작업 큐 (SW-BIZ (A) 섹션이 최신 — AI-ACT / LAYOUT / SCRIPT-KO)
3. `git log --oneline -10` + `git status -sb` — 내가 만들지 않은 변경은 사용자 작업으로 보존
4. `gh run view 31013989889` — 직전 HEAD(LAYOUT-03) CI 최종 결과 확인(마감 시점 진행 중이었음)

### ✅ 현재 상태 (main `80bc006` 기준)

- 워킹트리 clean · web/admin prod 라이브
- **자동배치 채택률 13.8% → 100% · 대사 보존 52.2% → 100%** (LAYOUT-03). baseline 측정 체계(AI-ACT-04)와 리포트 2건은 `docs/eval/`
- **포즈 라이브러리 일원화 완료** — prod 1,262행(25점 키포인트 1,260 + 작품 참조 2). 6월 적재분 이중화는 정리됨
- **한글 PDF 실가동** — fontkit 결함 수정 + Pretendard 번들 커밋(env 불필요). prod 배포 완료, 실 publish 육안 확인만 남음
- AI 2차 태깅 fallback 준비 완료(`STORYWORK_LLM` 게이트, 현행 태깅 대상 0건)

### 🔴 대표님 액션 4건 — **전부 미실행 상태**. 세션 시작 시 진행 여부부터 물을 것

1. **FOLLOWUP-68 이력 정리** — FK 는 이미 prod 존재라 deploy 단독 실행은 실패한다. 순서 고정:
   ```bash
   set -a; source .env.local; set +a; pnpm prisma migrate resolve --applied 20260629020000_reaction_user_fk && pnpm prisma migrate deploy && pnpm prisma migrate status
   ```
2. **AI_GATEWAY_API_KEY 등록** — `.env.local` 3곳(루트·apps/web·apps/admin) + `cd apps/web && vercel env add AI_GATEWAY_API_KEY production`. 등록 즉시 CONTI-01 · AI-ACT-03 · SCRIPT-KO-02 착수
3. **PERF-ADMIN-03 인증 저장** — `pnpm perf:admin:save-auth --env prod` (비번은 어시 취급 불가). 저장 후 알리면 측정·P75 분석은 어시가
4. **prod 한글 PDF 육안 확인** — 편집기에서 publish 1회

> 어시스턴트는 prod DB 변경 CLI(권한 분류기 차단)·키 발급·비밀번호·결제를 수행할 수 없음. 위 4건은 대표님 실행 후 결과만 공유해 주세요.

### 🎯 다음 코드 큐 — 키 없이 바로 착수 가능

- 🟢 **SCRIPT-KO-04** 대사/지문 구분(`AnalyzedLine.kind`) — LAYOUT-03 이 지목한 최대 잔여 병목. 장면 헤딩·지문이 말풍선 슬롯을 차지(화자 없음: essay 96.2%·diary 90.7%·novel 56.5%·screenplay 27.2%) → 캡션/내레이션 박스 분리. 페이지 수 감소 기대
- 🟢 **LAYOUT-04** 배치 품질 지표 — 채택률 프록시 100% 포화로 변별력 상실. 구도 균형·시선 흐름·컷당 대사 밀도
- 🚦 키 등록 시: **CONTI-01** → **AI-ACT-03** → **SCRIPT-KO-02**
- 🚦 기타 게이트: onnxruntime-node(BUBBLE-02 ONNX 검출기) · Upstash(SEC-RATE-01) · POSE3D-01 결제 · 제품 결정 3건(웹툰 vs POD 우선순위 · 생성 에셋 마켓 정책 · SSOT 수치 단일화)

### 🔧 핵심 환경 (반복 질문 방지)

- GitHub: `papascompany/storywork_editor` (PUBLIC, main). push = Vercel prod 자동배포
- Supabase prod: `wjpyeqckuxyfeytuzgon` — 다른 계정이라 MCP 접근 불가. **로컬 `.env.local` 이 prod DB 를 가리킴**(스크립트 실행 주의)
- 마이그레이션 이원화: 앱 스키마 `prisma/migrations/` · RLS/트리거 `supabase/migrations/`
- AI 키(ANTHROPIC/VOYAGE/OPENAI/AI_GATEWAY) 미등록 — 검색은 mock 임베딩, LLM 경로는 env 하드 게이트
- 포즈 자산: `data/poses/raw/` 1,260 PNG(gitignored) + 25점 사이드카 1,058건(커밋됨)
- PDF 폰트: `packages/pdf-engine/assets/fonts/PretendardVariable.ttf` 커밋됨 — cwd 자동 발견, env 불필요
- 평가 자산: `data/eval/scripts/` 21편/217장면 + `data/eval/adoption-*.json`

### 📋 자주 쓰는 명령

```bash
# dev 서버는 preview MCP 사용 (.claude/launch.json: web=3000, admin=3001, storybook=6006)
# 검증 (병렬 금지)
pnpm turbo run typecheck lint test --concurrency=1
# 자동배치 채택률 재측정 (키·DB 불요, 결정론)
pnpm adoption:measure
# push 후 CI 확인
bash scripts/ci-watch.sh
```

### ⚠️ 함정 노트 (실측 누적 — 상세는 핸드오프 §5)

- **세션 종료 시 핸드오프+RESUME_PROMPT 갱신은 커밋과 한 세트** — 08-05 커밋 3건이 문서 없이 남아 인계가 끊긴 전례
- **roadmap 작업 ID 는 전역 유일** — 신규 등록 전 `grep -n "\[XXX-NN\]" docs/architecture/roadmap.md`
- **pdf-lib `subset:true` + 한글 = 글리프 파괴** — 전체 임베드만 정상. fontkit 2.x 는 pdf-lib 비호환, 정적 OTF(CFF) 파서 거부
- **ingest upsert 는 slug 안정성 전제** — 체계 변경 후 재적재는 전량 신규 insert 로 이중화. `ingest:dry` 선행, 사고 시 `scripts/cleanup-stale-poses.ts`
- **prod DB 변경 CLI 는 권한 분류기 차단** — 조사만 하고 실행 명령은 대표님께 전달
- pdf-lib `drawText` 의 `\n` 은 페이지 기본 lineHeight 로 렌더 → 줄당 개별 text 레이어로
- macOS 파일명 NFD — 한글 폴더명 비교 전 NFC 정규화
- 실기 브라우저: 하이드레이션 전 클릭 유실 → `read_page` 후 ref 클릭
- UI 작업 SOP: `/ui-spec` → 동의 → 구현 → `/visual-check` → `/ci-watch`
- editor-* 패키지 React 의존 금지(editor-ui 만), canvas 인스턴스 useState 보관 금지, 직접 hex 금지(CSS 변수)
- 커밋 subject 소문자/한글 시작(commitlint), body ≤100자/줄, `Co-Authored-By` 유지

### 🚦 휴먼 게이트 (자동 진행 금지)

결제/플랜/가격 · DB 마이그레이션 실행/데이터 삭제 · 외부 API 키 발급/회전 · 새 런타임 의존성 추가 · breaking change push 는 보고 후

### 🎬 시작

위 내용 검토 후: ① 대표님 액션 4건(전부 미실행) 진행 여부 ② 키 등록 여부 ③ 제품 결정 3건 중 정할 것을 확인하고, 답에 따라 다음 작업을 픽해 주세요. **키 등록 전이면 SCRIPT-KO-04 부터 진행**하면 됩니다. 세션 종료 시 `docs/handoff/SESSION_HANDOFF_<날짜>.md` 신규 작성 + 이 파일 갱신을 잊지 말 것.
