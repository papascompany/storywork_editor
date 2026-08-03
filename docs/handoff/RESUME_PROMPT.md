# 새 세션 시작 프롬프트 (2026-07-31 갱신)

> 새 Claude Code 세션을 열 때 **"🚀 프롬프트" 섹션부터 끝까지 그대로 복사 붙여넣기** 하세요.
> 이 파일은 세션 마무리 때마다 갱신됩니다 — 상단 날짜로 최신 여부 확인.

---

## 🚀 프롬프트 (이 줄 아래부터 끝까지 복사)

안녕하세요. **StoryWork**(PNG 1,270개 자산 기반 fabric.js v6 스토리보드 편집기) 개발을 이어서 진행합니다.

### 📁 프로젝트 위치 + 시작 순서 (고정)

```
/Users/yohan/Developer/claude/storywork
```

1. `git pull` → `pnpm install` → 디스크 여유 확인 (98%+ 면 중단·보고, **병렬 pnpm 금지**)
2. 문서 읽기 (이 순서, 핵심만):
   - `CLAUDE.md` — 프로젝트 SSOT (도메인·스택·모듈 규칙·마일스톤)
   - `docs/handoff/SESSION_HANDOFF_2026-07-30.md` — **최신 세션(07-30~31) 완료 내역·검증·함정 전체**
   - `docs/architecture/roadmap.md` — 작업 큐 (CONTI / SCRIPT-KO / BUBBLE / CHAR-GEN 섹션이 최신)
   - 필요시: `docs/research/2026-07-21_conti_pose3d_oss_research.md` — 콘티·3D·OSS 조사 정본
3. `git log --oneline -10` + `git status -sb` — 내가 만들지 않은 변경은 사용자 작업으로 보존

### ✅ 현재 상태 (2026-07-31 마감 기준)

- main = origin 동기 · 최근 커밋 전부 CI green · web/admin prod 라이브
- **연구 P0 4건 완료**: CONTI-02(콘티 시트 PDF) · SCRIPT-KO-01(화자귀속 1층 룰, 골든 귀속 1→12/13) · BUBBLE-02(말풍선 비용함수 4항+QA) · CHAR-GEN-01(DWPose 25점 사이드카 1,058건+KP 규약 통일)
- **콘티 뷰 1·2차 완료**: CONTI-03(마법사 5단계화, 리뷰 27건 반영) + CONTI-03b(컷 DnD 재정렬 + 편집기 컷 교체 활성화, 리뷰 15건 반영)
- **근시일 코드 큐 소진** — 다음 작업은 아래 액션/게이트 해제에 달려 있음

### 🔴 대표님 액션 4건 — 세션 시작 시 진행 여부부터 확인할 것

1. **키포인트 DB 재적재** — `pnpm tsx scripts/ingest-poses.ts` 재실행(upsert·사이드카 우선). prod DATABASE_URL 필요. 완료 시 말풍선 화자 앵커(BUBBLE-02)가 실측 mouth 좌표로 자동 개선
2. **FOLLOWUP-68 prod 마이그레이션** — `20260629020000_reaction_user_fk` migrate deploy
3. **PERF-ADMIN-03** — `pnpm perf:admin:save-auth --env prod` + `pnpm perf:admin:prod` (비번은 어시가 못 다룸, 결과 공유 시 P75 분석)
4. **prod `PRETENDARD_TTF_PATH` 설정 확인** — PDF 한글 렌더(본문+콘티 시트) 공통 전제

### 🚦 게이트 해제 시 착수할 코드 큐 — 해제 여부도 시작 시 확인

- `AI_GATEWAY_API_KEY` 발급 → **CONTI-01**(장면 메타 실가동 — 콘티 샷사이즈·"다르게 재생성" 버튼 자동 활성) + **SCRIPT-KO-02**(화자귀속 LLM 폴백 계층)
- onnxruntime-node 의존성+가중치 반입 승인 → **BUBBLE-02 ONNX 검출기 실연결** (`BubbleDetector` 교체 지점 기확보)
- Upstash 도입 승인 → **SEC-RATE-01** (현행 인메모리 rate limit 은 인스턴스별 한계 명시된 스톱갭)
- SaaS 결제 승인($50 미만) → **POSE3D-01** 3D 파일럿 (체형 1종×포즈 20×앵글 4)
- 📋 제품 결정 대기: 웹툰 모드 vs POD 우선순위 · 생성 에셋 마켓 정책 · 사용자당 프로젝트 수 상한 · SSOT 갱신 2건(자산 수치 단일화 1,058/1,260/1,270 · nano-banana 표기 현행화)

### 🔧 핵심 환경 (반복 질문 방지)

- GitHub: `papascompany/storywork_editor` (PUBLIC, main). push = Vercel prod 자동배포
- Supabase prod: `wjpyeqckuxyfeytuzgon` — **다른 계정이라 MCP 접근 불가**. DB 변경은 마이그레이션 파일 커밋 + 사용자가 적용
- 마이그레이션 이원화: 앱 스키마 `prisma/migrations/` · RLS/트리거 `supabase/migrations/`
- AI 키(ANTHROPIC/VOYAGE/OPENAI/AI_GATEWAY) 미설정 — 검색은 mock 임베딩, LLM 경로는 env 하드 게이트로 차단됨
- 포즈 자산: `data/poses/raw/` 1,260 PNG(gitignored) + **25점 키포인트 사이드카 1,058건(커밋됨)**. DWPose 모델 128MB 는 `data/models/`(gitignored — 재실행 시 HF 재다운로드)

### 📋 자주 쓰는 명령

```bash
# dev 서버는 preview MCP 사용 (.claude/launch.json: web=3000, admin=3001, storybook=6006)
# 검증 (병렬 금지)
pnpm turbo run typecheck lint test --concurrency=1
# push 후 CI 확인
bash scripts/ci-watch.sh
# 키포인트 보강 재실행 (모델 재다운로드 후)
uv run scripts/enrich-keypoints.py --all --write
```

### ⚠️ 함정 노트 (이번 세션 실측 — 상세는 핸드오프 §2·§4)

- 커밋 subject 는 **소문자/한글 시작**(commitlint), body ≤100자/줄, `Co-Authored-By` 유지
- pdf-lib `drawText` 의 `\n` 멀티라인은 페이지 기본 lineHeight 로 렌더 → **줄당 개별 text 레이어**로
- `viewBox 0..1` SVG 안의 CSS `outline` px 는 user unit 으로 해석(캔버스 플러딩) → 포커스 링은 SVG 네이티브 원으로
- macOS 파일명은 NFD — 파이썬/셸에서 한글 폴더명 비교 전 **NFC 정규화** 필수
- 실기 브라우저 검증: 하이드레이션 완료 전 클릭 유실 → `read_page` 후 ref 클릭
- `data/poses/**` 는 lint-staged prettier 제외(괄호 파일명 glob 함정)
- UI 작업 SOP: `/ui-spec` → 동의 → 구현 → `/visual-check` → `/ci-watch`. 웹조사 서브에이전트와 시각검증 동시 실행 금지
- editor-* 패키지에 React 의존 금지(editor-ui 만), canvas 인스턴스 useState 보관 금지, 직접 hex 금지(CSS 변수)

### 🚦 휴먼 게이트 (자동 진행 금지)

결제/플랜/가격 · DB 마이그레이션 실행 · 외부 API 키 발급/회전 · 새 런타임 의존성 추가(onnxruntime-node 등) · breaking change push 는 보고 후

### 🎬 시작

위 내용 검토 후: ① 대표님 액션 1~4 진행 여부 ② 게이트 해제 여부(API 키·의존성·결제) ③ 제품 결정 3건 중 정할 것이 있는지 확인하고, 답에 따라 다음 작업을 픽해서 진행해주세요. 세션 종료 시 `docs/handoff/SESSION_HANDOFF_<날짜>.md` 신규 작성 + 이 파일 갱신을 잊지 말 것.
