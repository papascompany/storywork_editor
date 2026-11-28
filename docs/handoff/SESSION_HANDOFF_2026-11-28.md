# 세션 핸드오프 — 2026-11-24 ~ 11-28 (로컬 세션 복귀)

> 이전: [SESSION_HANDOFF_2026-11-16.md](SESSION_HANDOFF_2026-11-16.md) (PR #1~#25 · 클라우드 세션) ·
> 누적 함정: [SESSION_HANDOFF_2026-08-08.md](SESSION_HANDOFF_2026-08-08.md) §5

## 0. 한 줄 상태

로컬 모노레포로 복귀. **M9-01 Lighthouse 회귀 게이트(PR #27)** + **Anthropic API 키 등록** + **CONTI-01 장면 메타(PR #29)**
(로컬 3곳 + Vercel prod). LLM 경로는 `STORYWORK_LLM` 스위치가 꺼져 있어 아직 호출·과금 없음.

## 1. 완료

### ① 로컬 상태 정리 (11-24)
- 로컬 워킹트리 clean · push 안 한 커밋 없음 → `main` pull
- `stash@{0}` "lint-staged automatic backup (92f5f29)"(2026-05-06) — 내용은 이미 main(3e9026a)에 있음. **대표 결정으로 보존**
- 원격 `claude/sharp-einstein-3ob2c6` 삭제(main 19084bf 와 트리 동일)
- 원격 `claude/eager-johnson-6rmo0m`(main 에 없는 커밋 1건 1600230) · `claude/heuristic-dubinsky-735b19`
  (main 에 없는 커밋 **0건**) — **대표 결정으로 보존**
- **FOLLOWUP-71 코드는 이미 완료**(PR #8, NFC 정규화). 남은 건 prod `중복` 17행 삭제뿐 = 휴먼 게이트

### ② M9-01 Lighthouse 회귀 게이트 — [#27](https://github.com/papascompany/storywork_editor/pull/27)
- `scripts/lighthouse-gate.ts` + `tests/lighthouse/budgets.json` + CI 단계(키보드 E2E 다음)
- 대상: 더미 env 에서 200 인 공개 6페이지 `/` `/login` `/signup` `/features` `/notices` `/legal/terms`
- 하한: a11y/BP/SEO = 90 이상이면 90 고정·미달이면 baseline−5. **performance = min(baseline,90)−25 + CI 3회 중간값**
  — 공용 러너에서 코드 변경 없이 `/signup` 96→71, `/features` 94→88 흔들림 실측(첫 시도 90 고정은 오탐)
- 감사 전 전 페이지 응답 확인 → 3xx/4xx/5xx·연결 실패면 중단(시각 회귀 500 비교 전례 방지)
- 겸사: lighthouse 추가 시 lockfile 재해석이 zod 4.4.2→4.6.7 로 올려 web `zodResolver` 타입 깨짐
  → **`pnpm.overrides.zod = "4.4.2"`** 고정
- 후속 등록: **[PERF-WEB-05]** `/login` perf 75(LCP 12.7s) · `/` perf 88(TBT 493ms)

### ③ Anthropic API 키 등록 (11-28, 대표 실행 · 어시 검증)
- Ultra 플랜 월 $200 API 크레딧을 쓰는 Console 조직에 **`storywork` 워크스페이스 신설, 월 한도 $50**
- `ANTHROPIC_API_KEY` → `.env.local` 3곳(루트·apps/web·apps/admin) 동일 키 1개씩 + Vercel production(Sensitive)
- 검증: 형식 `sk-ant-` 106자 ×3 동일 · `/v1/models` HTTP 200. Vercel 값은 Sensitive 라 읽기 불가(같은 명령으로 입력)
- 코드는 `AI_GATEWAY_API_KEY ?? ANTHROPIC_API_KEY` 로 직접 지원(`packages/ai-script/src/llm/enhance.ts`) →
  **`AI_GATEWAY_API_KEY` 는 더 이상 필요 없음**
- 크레딧 정책(공식 문서 확인): API·Agent SDK·Playground 에 사용 가능, 상업 용도 제한 없음, 양도·판매 불가,
  포함 크레딧 우선 소진, **조직 내 모든 키·워크스페이스가 잔액 공유**(Storige prod 키 포함), 미사용분은 주기마다 소멸,
  다른 크레딧이 없으면 소진 시 요청 중단(자동 충전 꺼짐). 콘솔의 "$200,000" 은 조직 지출 상한값이지 잔액이 아님

### ④ CONTI-01 장면 메타 실가동·영속화 — [#29](https://github.com/papascompany/storywork_editor/pull/29)
- LLM 보강 컨텍스트 확대(장면당 100자 → 장면 원문 600자) + `view` 추가 + cameraAngle 을 샷사이즈(CU/MS/WS)로 정의
  — 룰 파서는 cameraAngle 을 채우지 않아 page-split R2~R4 가 지금껏 한 번도 발화하지 않았다
- 20장면 묶음 병렬(동시 4) + 호출당 40s 타임아웃, 부분 실패 허용 · analyze 라우트 `maxDuration = 60`
- `SceneDoc.meta.sceneMeta` + `metaSource` 저장(마이그레이션 없음, `ai-script/src/scene-meta.ts`) → 콘티 시트 `shotLabel`
- 마법사가 미리보기 메타를 full-pipeline `sceneMetaHints` 로 되돌려 확정 단계 LLM 재호출 차단.
  기존 구조였다면 LLM 활성 시 미리보기 1회 + 확정 4회(미사용 분석 대안 3회 포함) 호출이었다 → `maxAlternatives` 0
- 마법사 `llmEnabled:false` 하드코딩 제거 — env 가 결정
- **제외**: Inngest 비동기(prod Inngest 키 없음 = 휴먼 게이트) · ContiBoard 샷 라벨 UI(UI SOP 대상)
- **미검증**: 실제 LLM 호출 품질 — `STORYWORK_LLM` 꺼짐. 모델 `claude-sonnet-4-6` 제공 중만 확인(최신 `claude-sonnet-5-5` 존재)

## 2. 🔴 대표님 액션 (잔여)

| # | 액션 | 비고 |
|---|---|---|
| 1 | **`STORYWORK_LLM=1` 켜기 결정** | = 과금 시작($50 한도 내). 켜면 CONTI-01 실호출 품질부터 확인. 모델 교체(`claude-sonnet-5-5`) 여부도 함께 |
| 2 | 웹툰 프리셋 시드 | `set -a; source .env.local; set +a; pnpm tsx scripts/seed-formats.ts` — prod DB 쓰기, 없는 행만 생성. **프리셋은 `isActive:false` 로 들어가 웹툰 모드를 열지 않음** |
| 3 | PERF-ADMIN-03 인증 저장 | `pnpm perf:admin:save-auth --env prod` (headed 브라우저 로그인) |
| 4 | prod 한글 PDF 육안 확인 | 편집기에서 publish 1회 |
| 5 | 웹툰 모드 개방 결정 | 11-16 핸드오프 §3 참조 |
| 6 | FOLLOWUP-71 prod 17행 삭제 | 데이터 삭제 = 휴먼 게이트 |

## 3. 다음 코드 큐

- ✅ ~~CONTI-01~~ (PR #29)
- 🟢 **AI-ACT-03 → SCRIPT-KO-02** — 키 등록으로 착수 가능(실호출 검증은 1번 결정 후)
- 🚦 CONTI-01 실호출 측정(코퍼스 몇 편 cameraAngle 분포·R2~R4 발화) — 1번 결정 후
- 🟢 **PERF-WEB-05** `/login` LCP · `/` TBT → 90 달성 시 `pnpm lighthouse:baseline` 으로 하한 상향
- 🟢 **M9-04** 부하/벤치
- 🚦 AI-ACT-01 실 임베딩 — Voyage 또는 OpenAI 키 필요

## 4. 환경/함정 노트 (신규 ★)

- ★ **로컬 포트 3000 은 다른 프로젝트(Storige vite)가 쓰고 있을 수 있다** — apps/web `start` 는 `--port 3000`
  하드코딩이라 PORT env 무시. 로컬 검증은 `pnpm --filter @storywork/web exec next start --port 3100`.
  남의 프로세스는 건드리지 말 것(첫 시도의 HTTP 200 은 Storige 서버였음)
- ★ **web 단독 빌드 전 전체 `pnpm build`** — editor-export dist 가 오래되면 `createStoreZip` 누락으로 빌드 실패
- ★ **`pnpm add` 는 lockfile 을 재해석해 무관한 의존성을 올린다** — 루트 devDep 추가 후 zod 가 올라갔다.
  추가 후 `git diff pnpm-lock.yaml` 로 의도 밖 변경 확인
- ★ **Lighthouse performance 는 공용 러너에서 ±25 흔들린다** — 정밀 추적은 로컬 실측(PERF-WEB-05)으로
- ★ 셸은 zsh — `PIPESTATUS` 없음, `--include=*.ts` 는 따옴표 필요
- ★ 클립보드로 키를 붙일 때 다른 텍스트가 들어간 전례 — 등록 명령은 `sk-ant-` 접두 검사 후 쓰기
