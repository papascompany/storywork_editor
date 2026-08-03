# 새 세션 시작 프롬프트 (2026-08-03 갱신)

> 새 Claude Code 세션을 열 때 **"🚀 프롬프트" 섹션부터 끝까지 그대로 복사 붙여넣기** 하세요.
> 이 파일은 세션 마무리 때마다 갱신됩니다 — 상단 날짜로 최신 여부 확인.

---

## 🚀 프롬프트 (이 줄 아래부터 끝까지 복사)

안녕하세요. **StoryWork**(PNG 1,260개 자산 기반 fabric.js v6 스토리보드 편집기) 개발을 이어서 진행합니다.

### 📁 프로젝트 위치 + 시작 순서 (고정)

```
/Users/yohan/Developer/claude/storywork
```

1. `git pull` → `pnpm install` → 디스크 여유 확인 (98%+ 면 병렬 pnpm 절대 금지·순차 실행, 데이터 볼륨은 `df -h /System/Volumes/Data` 로 확인)
2. 문서 읽기 (이 순서, 핵심만):
   - `CLAUDE.md` — 프로젝트 SSOT (도메인·스택·모듈 규칙·마일스톤)
   - `docs/handoff/SESSION_HANDOFF_2026-08-03.md` — **최신 세션 완료 내역·검증·신규 함정**
   - `docs/architecture/roadmap.md` — 작업 큐 (CONTI / SCRIPT-KO / BUBBLE / CHAR-GEN 섹션이 최신)
3. `git log --oneline -10` + `git status -sb` — 내가 만들지 않은 변경은 사용자 작업으로 보존

### ✅ 현재 상태 (2026-08-03 마감 기준)

- main = origin 동기 · CI green · web/admin prod 라이브
- **키포인트 DB 재적재 완료**: prod 포즈 1,262행(25점 키포인트 1,260 + 작품 참조 보존 2) — 6월 적재분 이중화 1,268행 정리 완료. 말풍선 화자 앵커 실측 좌표 가동
- **한글 PDF 실가동**: fontkit 미등록 잠재 결함 수정 + PretendardVariable 번들(`df66e79`) — env 불필요, prod 배포 Ready. **subset:false 필수**(서브셋터가 한글 파괴 — 핸드오프 §4)
- 근시일 코드 큐는 게이트 해제 대기 (아래)

### 🔴 대표님 액션 — 세션 시작 시 진행 여부부터 확인할 것

1. **FOLLOWUP-68 이력 정리** — FK 는 이미 prod 존재(실측), 이력만 미기록. 순서 고정:
   ```
   set -a; source .env.local; set +a; pnpm prisma migrate resolve --applied 20260629020000_reaction_user_fk && pnpm prisma migrate deploy && pnpm prisma migrate status
   ```
   (어시는 권한 분류기가 prod 변경 명령을 차단해 실행 불가 — 실측)
2. **AI_GATEWAY_API_KEY 등록**(발급은 완료 상태) — `.env.local`(루트·apps/web·apps/admin) + `vercel env add AI_GATEWAY_API_KEY production`(apps/web 에서). 등록 즉시 CONTI-01 + SCRIPT-KO-02 착수
3. **PERF-ADMIN-03** — `pnpm perf:admin:save-auth --env prod` 실행 후 어시에게 알림(비번은 어시 취급 불가). 이후 측정·P75 분석은 어시가
4. **prod 실 publish 1회** — 한글 PDF(본문+콘티 시트) 육안 최종 확인

### 🚦 게이트 해제 시 착수할 코드 큐

- `AI_GATEWAY_API_KEY` 등록 → **CONTI-01**(장면 메타 실가동 — 샷사이즈·"다르게 재생성" 자동 활성) + **SCRIPT-KO-02**(화자귀속 LLM 폴백)
- onnxruntime-node 의존성+가중치 반입 승인 → **BUBBLE-02 ONNX 검출기 실연결**
- Upstash 도입 승인 → **SEC-RATE-01**
- SaaS 결제 승인($50 미만) → **POSE3D-01**
- 키 불요 대안 큐: AI-ACT-02(태깅·골든셋) · AI-ACT-04(자동배치 채택률 측정체계)
- 📋 제품 결정 대기(2026-08-03 보류 확인): 웹툰 vs POD 우선순위 · 생성 에셋 마켓 정책 · SSOT 수치 단일화

### 🔧 핵심 환경 (반복 질문 방지)

- GitHub: `papascompany/storywork_editor` (PUBLIC, main). push = Vercel prod 자동배포
- Supabase prod: `wjpyeqckuxyfeytuzgon` — 다른 계정이라 MCP 접근 불가. 로컬 `.env.local` 이 prod DB 를 가리킴(스크립트 실행 주의). DB 스키마 변경은 마이그레이션 파일 + 대표님 적용
- 마이그레이션 이원화: 앱 스키마 `prisma/migrations/` · RLS/트리거 `supabase/migrations/`
- AI 키(ANTHROPIC/VOYAGE/OPENAI/AI_GATEWAY) 미등록 — 검색은 mock 임베딩, LLM 경로는 env 하드 게이트
- 포즈 자산: `data/poses/raw/` 1,260 PNG(gitignored) + 25점 사이드카 1,058건(커밋됨). DWPose 모델은 gitignored(재실행 시 HF 재다운로드)
- PDF 폰트: `packages/pdf-engine/assets/fonts/PretendardVariable.ttf` 커밋됨 — cwd 자동 발견, env 불필요

### 📋 자주 쓰는 명령

```bash
# dev 서버는 preview MCP 사용 (.claude/launch.json: web=3000, admin=3001, storybook=6006)
# 검증 (병렬 금지)
pnpm turbo run typecheck lint test --concurrency=1
# push 후 CI 확인
bash scripts/ci-watch.sh
# 포즈 재적재 (slug 대조 필수 — 아래 함정)
pnpm ingest:dry
```

### ⚠️ 함정 노트 (실측 누적 — 상세는 핸드오프 §4)

- **pdf-lib `subset:true` + 한글 폰트 = 글리프 파괴** — 전체 임베드(subset:false)만 정상. fontkit 2.x 는 pdf-lib 비호환, 정적 OTF(CFF)는 파서 거부
- **ingest upsert 는 slug 안정성 전제** — 파일명/폴더 체계 변경 후 재적재하면 전량 신규 insert 로 이중화. 재적재 전 `ingest:dry` + slug 대조, 이중화 시 `scripts/cleanup-stale-poses.ts` 참고
- 커밋 subject 는 소문자/한글 시작(commitlint), body ≤100자/줄, `Co-Authored-By` 유지
- pdf-lib `drawText` 의 `\n` 멀티라인은 페이지 기본 lineHeight 로 렌더 → 줄당 개별 text 레이어로
- macOS 파일명은 NFD — 한글 폴더명 비교 전 NFC 정규화 필수
- 실기 브라우저 검증: 하이드레이션 완료 전 클릭 유실 → `read_page` 후 ref 클릭
- UI 작업 SOP: `/ui-spec` → 동의 → 구현 → `/visual-check` → `/ci-watch`
- editor-* 패키지에 React 의존 금지(editor-ui 만), canvas 인스턴스 useState 보관 금지, 직접 hex 금지(CSS 변수)

### 🚦 휴먼 게이트 (자동 진행 금지)

결제/플랜/가격 · DB 마이그레이션 실행/데이터 삭제 · 외부 API 키 발급/회전 · 새 런타임 의존성 추가 · breaking change push 는 보고 후

### 🎬 시작

위 내용 검토 후: ① 대표님 액션 1~4 진행 여부 ② 게이트 해제 여부(API 키 등록·의존성·결제) ③ 제품 결정 3건 중 정할 것이 있는지 확인하고, 답에 따라 다음 작업을 픽해서 진행해주세요. 세션 종료 시 `docs/handoff/SESSION_HANDOFF_<날짜>.md` 신규 작성 + 이 파일 갱신을 잊지 말 것.
