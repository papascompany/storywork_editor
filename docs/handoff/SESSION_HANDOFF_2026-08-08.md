# 세션 핸드오프 — 2026-08-08 (작업 08-07 밤 ~ 08-08 00:0x)

> 이전: [SESSION_HANDOFF_2026-08-05.md](SESSION_HANDOFF_2026-08-05.md)
> 이 세션 = **SCRIPT-KO-04 + 제품 결정 3건 + LAYOUT-04** 완료. 커밋 3건 전부 push 완료.

## 0. 한 줄 상태

main `a9edced` = origin · 워킹트리 clean · 전체 검증 79 태스크 green ·
**대표님 액션 4건은 여전히 전부 미실행**(이번 세션 착수 시 실측 재확인).

## 1. 완료

### ① SCRIPT-KO-04 대사/지문 구분 (`ae273a1`)
- **페이지 255 → 218(−14.5%) · 장면당 1.175 → 1.005**, 채택률 100% · 대사 보존 100% 유지.
  screenplay 87 → 51(−41.4%). LAYOUT-03 이 대사 유실을 페이지 증가(+17.5%)로 갚았던 부분이 회수됨
- `AnalyzedLine.kind('dialogue'|'narration'|'direction')` + `line-kind.ts`.
  기존 SceneDoc 은 `lineKindOf()` 폴백(화자 유무 = 종전 동작)으로 읽는다
- `parse-screenplay` — 헤딩 정규식을 `S#1.`·`씬 2:`·`INT.` 로 확장(**구분자 필수** → "장면이
  바뀌었다" 오탐 차단). 헤딩은 라인이 아니라 `SceneMeta.location/timeOfDay` 로 흡수(배경 톤
  추천이 실제로 쓰는 값). 종전에 버려지던 지문은 `direction` 으로 보존
- `caption-slots.ts` 신설 — 캡션 박스 하나가 연속 3줄·180자를 묶는다(수용량 증가의 실제 근거).
  말풍선과 같은 격자를 공유하고 말풍선을 먼저 배치해 침범 없음
- `capacity` — 페이지 예산이 `{ bubbles, captionBoxes }` 로 분리, 그리디 2패스 분할
- 리포트 [adoption-script-ko-04-2026-08-07.md](../eval/adoption-script-ko-04-2026-08-07.md)

### ② 제품 결정 3건 확정 (`9b8337a`) — 대표 결정
- **ADR-0017** 웹툰 vs POD 는 우선순위가 아니라 **모드 선택**. `Project.mode` + `Format.unit` 로
  갈라지고 편집 코어·AI 파이프라인은 공유. roadmap **MODE-01~06** 등록(구현은 별도 세션)
- **ADR-0018** AI 생성 에셋 마켓 등록 **허용 + 생성 표기 의무**. MARKET-01 에 필수 필드 반영,
  MARKET-05(신고·takedown, 오픈 전 필수) 신규
- **ADR-0019** 포즈 자산 수치 정본 — raw **1,260** · 태깅 대상 **1,243** · 사이드카 **1,058** ·
  prod DB **1,262**. `CLAUDE.md` §1 정정("보유 1,058개" 오기)

### ③ LAYOUT-04 배치 품질 지표 (`a9edced`)
- `quality.ts` 5축. **독립 축**(배치기가 최적화하지 않음 = 품질 판단 근거) / **의존 축**(배치기가
  직접 최적화 = 회귀 감시용)을 구분한다 — 섞으면 자기가 최적화한 걸 자기가 잘한다고 보고하는 순환
- **종합 73.1% → 79.3%**. 구도 균형 50.7% · 지면 밀도 62.5% · 대사 밀도 86.5% ·
  시선 흐름 100% · **얼굴 가림 회피 62.7% → 97.0%**
- **지표가 곧바로 결함을 찾아냄**: 의존 축인데 62.7%(= 고를 자리 자체가 잘못됨) → 말풍선 51.8%
  vs 캡션 0.5% → `preset-1on1-talk`/`bubble-left` **단일 슬롯**이 157페이지 전부에서
  `pose-right` 얼굴을 덮고 있었다. 말풍선 2개를 하단 좌우로 이동.
  생성 슬롯은 처음부터 0.0% — LAYOUT-03 의 비용 정렬은 정상이었고 **손으로 적은 프리셋만
  검증을 안 받고 있었다**
- 페이지 218 → 222(+4, 슬롯 크기 축소 영향). 채택률·대사 보존 100% 유지
- 리포트 [layout-quality-2026-08-07.md](../eval/layout-quality-2026-08-07.md)

## 2. 검증

- `pnpm turbo run typecheck lint test --concurrency=1` — **79 태스크 green**(각 커밋마다 실행)
- ai-script 116 · ai-layout 234 (신규 62: caption-slots 18 · quality 22 · 회귀 가드 5 · 기타)
- CI: **최종 HEAD `ebc23c6` green**(run 31190889786 — 코드·문서 전부 포함) · `ae273a1` green(31187489500).
  중간 run 31190628907(`a9edced`)은 `cancelled` 인데 실패가 아니라 **워크플로 concurrency
  (`cancel-in-progress: true`)가 다음 push 로 대체한 것** — 최종 HEAD run 만 보면 된다
- `pnpm adoption:measure` — 채택률 100% · 대사 보존 100% · 페이지 222 · 품질 종합 79.3%

## 3. 🔴 대표님 액션 — 4건 전부 미실행 (이번 세션 실측 재확인)

| # | 항목 | 실측 근거 | 실행 |
|---|---|---|---|
| 1 | AI_GATEWAY_API_KEY 등록 | `.env.local` 3곳 0건 | `cd apps/web && vercel env add AI_GATEWAY_API_KEY production` + `.env.local` 3곳 |
| 2 | FOLLOWUP-68 이력 정리 | migrate 3건 미기록 | `set -a; source .env.local; set +a; pnpm prisma migrate resolve --applied 20260629020000_reaction_user_fk && pnpm prisma migrate deploy && pnpm prisma migrate status` |
| 3 | PERF-ADMIN-03 인증 저장 | `tmp/perf/admin-auth.json` 부재 | `pnpm perf:admin:save-auth --env prod` |
| 4 | prod 한글 PDF 육안 확인 | 배선은 배포 완료, 실 publish 미수행 | 편집기에서 publish 1회 |

대표님이 4건 모두 진행 의사를 밝혔다(2026-08-07). **1번(키) 등록 즉시 CONTI-01 → AI-ACT-03 →
SCRIPT-KO-02 착수 가능** — 파급이 가장 크다. 3번은 저장 후 알려주시면 측정·P75 분석은 어시가.

## 4. 다음 코드 큐

- 🟢 **LAYOUT-05** 구도 균형 개선 — LAYOUT-04 가 지목한 최저 축(50.7%). 말풍선을 하단으로 모으며
  무게중심이 내려간 트레이드오프 포함(57.0%→50.7%). 위아래 분산이 필요한데 `preset-1on1-talk` 는
  포즈가 상단을 다 차지해 자리가 없다 → **포즈 슬롯 기하부터** 재설계.
  곁들여 ①지면 밀도를 겹침 제외 합집합 면적으로 정확화 ②생성 슬롯 격자를 얼굴 위치 기반으로
- 🟢 **MODE-01~06** 웹툰/POD 모드 — ADR-0017 결정 완료, 구현 대기. MODE-01(스키마)은 🚦 마이그레이션
- 🟢 산문 서술 문장 단위 분할 — `parse-novel` 이 단락을 200자에서 자른다. 캡션이 여러 줄을 담게 된
  지금은 문장 단위가 더 맞다(SCRIPT-KO-04 리포트 §5)
- 🚦 키 등록 시: **CONTI-01** → **AI-ACT-03** → **SCRIPT-KO-02**
- 🚦 기타 게이트(불변): onnxruntime-node(BUBBLE-02) · Upstash(SEC-RATE-01) · POSE3D-01 결제

## 5. 환경/함정 노트 (누적 — 신규 ★)

- ★ **품질 지표는 배치기의 목적함수와 독립이어야 변별력이 있다** — 배치기가 최소화하는 항을 그대로
  지표로 쓰면 순환 논증이다. 의존 축은 "높은 게 당연, **떨어지면 회귀**"로만 읽는다
- ★ **의존 축이 낮으면 그건 알고리즘이 아니라 입력(슬롯 좌표)을 의심하라** — 얼굴 가림 62.7%의
  범인은 배치 로직이 아니라 손으로 적은 프리셋 좌표 하나였다
- ★ **캡션은 줄당 개별 `text` 레이어로** — 개행 한 덩어리는 pdf-lib `drawText` 가 페이지 기본
  lineHeight(24pt)로 내려 12pt 캡션이 박스를 넘친다(기존 함정의 재확인). 회귀 가드 있음
- ★ **`중복` 폴더 17장: 태깅 제외 ↔ 적재 포함** — `filename-tagger` 는 skip 하는데 `ingest-poses.ts`
  에는 폴더 제외 로직이 없다. FOLLOWUP-71 등록
- 세션 종료 시 핸드오프+RESUME_PROMPT 갱신은 커밋과 한 세트
- roadmap 작업 ID 는 전역 유일 — 신규 등록 전 `grep -n "\[XXX-NN\]" docs/architecture/roadmap.md`
- ingest upsert 는 slug 안정성 전제 — 체계 변경 후 재적재는 전량 신규 insert 로 이중화
- prod DB 변경 CLI 는 권한 분류기 차단 — 조사만 하고 실행 명령은 대표님께 전달
- macOS NFD 파일명 · 하이드레이션 전 클릭 유실 · editor-* React 의존 금지 · 직접 hex 금지
- 커밋 subject 소문자/한글 시작(commitlint), body ≤100자/줄, `Co-Authored-By` 유지
- `ci-watch.sh` 는 600초 타임아웃 — CI 가 ~11분이라 자주 놓친다. `gh run view <id>` 로 재확인할 것
- ★ **연속 push 하면 앞선 CI run 이 `cancelled` 로 남는다** — 워크플로 `concurrency` 가
  `cancel-in-progress: true`. 실패가 아니므로 **최종 HEAD 의 run 만** 확인하면 된다

_갱신: 2026-08-08 · SCRIPT-KO-04 · 제품 결정 3건(ADR-0017/0018/0019) · LAYOUT-04 완료.
다음 착수 후보 = LAYOUT-05(키 불요) 또는 키 등록 시 CONTI-01._
