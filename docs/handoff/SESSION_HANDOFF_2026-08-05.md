# 세션 핸드오프 — 2026-08-05

> 이전: [SESSION_HANDOFF_2026-08-03.md](SESSION_HANDOFF_2026-08-03.md)
> 이 문서 = **08-03 마감 이후 커밋 3건(AI-ACT-02 · AI-ACT-04 · LAYOUT-03) 흡수 + 미완 인계 확정**.
> 해당 3건은 별도 세션이 커밋만 남기고 핸드오프를 쓰지 않아, 여기서 커밋·roadmap·리포트를 근거로 통합 기록한다.

## 0. 한 줄 상태

main `80bc006` = origin · 워킹트리 clean · web/admin prod 라이브 · **대표님 액션 4건 전부 미실행(2026-08-05 실측 확인)**.

## 1. 08-03 마감 이후 완료 (커밋 근거)

- **`925d6c1` AI-ACT-02** — AI 2차 태깅 fallback + 골든셋 50케이스/102조합.
  - 전제 오류 정정: "미매칭 17건"은 전부 `중복` 폴더(정책적 skip·prod DB 미적재)였음 → tagger 가 skip 과 사전 공백을 둘 다 `matched:false` 로 뭉갠 게 원인. `skipped` 분리 후 **실 매칭률 100%(1,243/1,243)**, 현행 LLM 태깅 대상 0건
  - `llm-tagger.ts` — 신규 자산 fallback 용. 캐시 우선 + `STORYWORK_LLM` 하드 게이트(CI $0) + 키 부재 시 null 폴백 + 사전 118종 어휘 sanitize + confidence 0.6 상한
  - 골든셋 통합 후 만족도 **102/102 = 100%**(목표 70%)
- **`f19cfe9` AI-ACT-04** — 자동배치 채택률 측정 체계 + baseline.
  - 평가 코퍼스 `data/eval/scripts/` 21편/217장면(5형식), `ai-layout/adoption.ts`(채택률 = blocker 0 페이지 비율, 실사용 로그 도입 시 교체 계약 명시), `scripts/measure-adoption.ts`(키·DB 불요 결정론)
  - **baseline 실측 13.8%(30/217) · 대사 보존 52.2%** — 기존 e2e green 구간에서 **대본 대사 절반 유실**을 발견. 리포트 [adoption-baseline-2026-08-05.md](../eval/adoption-baseline-2026-08-05.md)
  - CI 1회 실패(`31006005588`) → `526e49a` 로 스크립트 import 를 패키지명으로 수정해 복구
- **`80bc006` LAYOUT-03** — 대사 수용량 기반 배치.
  - **채택률 13.8% → 100%(255/255) · 대사 보존 52.2% → 100%**(목표 60%/95% 초과). `empty-slot` 61→0, `dialogue-loss` 152→0, 페이지 217→255(+17.5%)
  - `capacity.ts`(수용량 재계획: 템플릿 확정 → 합병 해제 → `lineRanges` 다중 페이지 분할) · `template-match.ts` 구조적 실현가능성 필터 · `bubble-slots.ts`(수용량 계산과 실제 생성이 동일 함수) · `compose.ts` 멀티 장면 말풍선 재작성(종전엔 첫 장면 대사만 배치)
  - 골든 G5 기대값 정정(대사 12개 유실을 정답으로 박아둔 테스트) · 리포트 [adoption-layout03-2026-08-05.md](../eval/adoption-layout03-2026-08-05.md)

## 2. 이 세션에서 한 일

- **미완 4건 실측 재확인**(아래 §3) — 전부 미실행 상태 확정
- **문서 갱신**: 본 핸드오프 신규 + `RESUME_PROMPT.md` 현행화(HEAD·완료 큐·미완 액션 반영)
- **roadmap ID 충돌 수정**: 신규 등록된 대사/지문 구분 항목이 기존 `SCRIPT-KO-03`(CSN 스코어러)과 ID 중복 → **SCRIPT-KO-04** 로 정정(roadmap + LAYOUT-03 리포트 참조 동기화)
- 검증: `ai-layout` turbo 6태스크 green(HEAD 재확인). HEAD CI(`31013989889`)는 Migration smoke ✓, Lint/Test/Build 진행 중이었음 — 다음 세션 시작 시 `gh run view 31013989889` 로 확인

## 3. 🔴 대표님 액션 — 전부 미실행 (2026-08-05 실측 근거)

| # | 항목 | 실측 근거 | 실행 명령 |
|---|---|---|---|
| 1 | FOLLOWUP-68 이력 정리 | `prisma migrate status` — 3건 미기록(`enable_rls`·`deny_all`·`reaction_user_fk`). FK 자체는 prod 존재(08-03 실측) | §3-1 |
| 2 | AI_GATEWAY_API_KEY 등록 | `.env.local` 3곳 0건 + `vercel env ls production`(web) 미등록 | §3-2 |
| 3 | PERF-ADMIN-03 인증 저장 | `tmp/perf/admin-auth.json` 부재 | §3-3 |
| 4 | prod 한글 PDF 육안 확인 | 폰트 배선은 배포 완료(`df66e79`), 실 publish 미수행 | 편집기에서 publish 1회 |

**3-1. FOLLOWUP-68** — FK 가 이미 존재하므로 deploy 단독 실행 시 중복 제약으로 실패한다. 순서 고정:

```bash
set -a; source .env.local; set +a; pnpm prisma migrate resolve --applied 20260629020000_reaction_user_fk && pnpm prisma migrate deploy && pnpm prisma migrate status
```

**3-2. AI_GATEWAY_API_KEY** — `.env.local`(루트·apps/web·apps/admin) 추가 + prod 등록:

```bash
cd apps/web && vercel env add AI_GATEWAY_API_KEY production
```

등록 즉시 **CONTI-01**(콘티 샷사이즈·재생성 버튼 자동 활성) + **AI-ACT-03**(라이브 LLM 대본분석) + **SCRIPT-KO-02**(화자귀속 LLM 폴백) 착수 가능.

**3-3. PERF-ADMIN-03** — 비밀번호는 어시스턴트가 다룰 수 없다:

```bash
pnpm perf:admin:save-auth --env prod
```

저장 후 알리면 `pnpm perf:admin:prod` 측정 + P75 분석은 어시스턴트가 진행.

> 어시스턴트가 못 하는 이유: prod DB 변경 CLI 는 권한 분류기가 차단(08-03 실측), 키 발급·비밀번호·결제는 휴먼 게이트.

## 4. 다음 코드 큐 (키 없이 착수 가능한 것 우선)

- 🟢 **SCRIPT-KO-04** 대사/지문 구분(`AnalyzedLine.kind`) — LAYOUT-03 실측이 지목한 최대 잔여 병목. 장면 헤딩·지문이 말풍선 슬롯을 차지(화자 없음 비율 essay 96.2%·diary 90.7%·novel 56.5%·screenplay 27.2%) → 캡션/내레이션 박스로 분리. 페이지 수 255→감소 기대. 키 불요
- 🟢 **LAYOUT-04** 배치 품질 지표 — 채택률 프록시가 100% 포화로 변별력 상실. 구도 균형·시선 흐름·컷당 대사 밀도 축 도입. 키 불요
- 🚦 키 등록 시: **CONTI-01** → **AI-ACT-03** → **SCRIPT-KO-02**
- 🚦 기타 게이트(불변): onnxruntime-node(BUBBLE-02 검출기) · Upstash(SEC-RATE-01) · POSE3D-01 결제 · 제품 결정 3건(웹툰 vs POD 우선순위 · 생성 에셋 마켓 정책 · SSOT 수치 단일화)

## 5. 환경/함정 노트 (누적 — 신규는 ★)

- ★ **다중 세션 병행 시 핸드오프 누락 주의** — 08-05 커밋 3건은 핸드오프 없이 남아 문서가 HEAD 보다 뒤쳐졌다. 세션 종료 시 핸드오프+RESUME_PROMPT 갱신은 커밋과 한 세트
- ★ **roadmap 작업 ID 중복 주의** — 섹션이 달라도 ID 는 전역 유일. 신규 등록 전 `grep -n "\[XXX-NN\]" docs/architecture/roadmap.md`
- **pdf-lib `subset:true` + 한글 폰트 = 글리프 파괴** — 전체 임베드(subset:false)만 정상. fontkit 2.x 는 pdf-lib 비호환, 정적 OTF(CFF)는 파서 거부
- **ingest upsert 는 slug 안정성 전제** — 파일명/폴더 체계 변경 후 재적재는 전량 신규 insert 로 이중화. 사전 `ingest:dry` 대조, 사고 시 `scripts/cleanup-stale-poses.ts`
- **prod DB 변경 CLI 는 권한 분류기 차단** — 읽기 전용 조사까지만 하고 실행 명령은 대표님께 전달
- 디스크 98%(데이터 볼륨) — 병렬 pnpm 금지, `turbo --concurrency=1` 유지
- 커밋 subject 소문자/한글 시작(commitlint), body ≤100자/줄, `Co-Authored-By` 유지
- macOS NFD 파일명 · 하이드레이션 전 클릭 유실(read_page 후 ref 클릭) · editor-* React 의존 금지 · 직접 hex 금지

_갱신: 2026-08-05 · AI-ACT-02/04 + LAYOUT-03 흡수 기록, 대표님 액션 4건 미실행 확정·명령 정리, roadmap ID 충돌 수정. 다음 착수 후보 = SCRIPT-KO-04(키 불요)._
