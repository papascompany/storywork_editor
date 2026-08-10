# 세션 핸드오프 — 2026-08-08~10 (작업 08-07 밤 ~ 08-10)

> 이전: [SESSION_HANDOFF_2026-08-05.md](SESSION_HANDOFF_2026-08-05.md)
> 이 세션 = **SCRIPT-KO-04 + 제품 결정 3건 + LAYOUT-04/05 + MODE-01/02/03 + MODE-04a/04b** 완료.
> 도중 모델 전환(Opus 5 → Fable 5, LAYOUT-05 착수 직전) — 체크포인트 대조 후 이어감.
> **08-09 새벽 prod 장애 발생·복구**(§1-⑥ · §5 함정 노트 필독).

## 0. 한 줄 상태

MODE-04b 까지 완료 · **prod 마이그레이션 적용 완료**(대표님 실행, FOLLOWUP-68 이력 정리 겸용 —
액션 2번 해소) · 잔여 대표님 액션 = 키 등록(1) · PERF 인증(3) · PDF 육안(4) ·
**웹툰 시드 재실행(5 — git pull 후, 1차 실행이 구버전 워킹카피로 추정돼 미반영)**.

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

### ④ LAYOUT-05 구도 균형 개선 (`dedd945`)
- **종합 79.3 → 87.6%** · 구도 균형 50.7→61.5 · 지면 밀도 62.5→90.2(측정 정확화 포함) ·
  얼굴 가림 97.0→**100%** · **페이지 222 유지** · 채택률/보존 100% 유지
- **진단이 로드맵 가설을 뒤집음**: "1on1-talk 포즈 기하부터"가 아니라 **preset-wide 61페이지
  전원 balance 0점**(생성 격자의 위→아래 채움 + wide 말풍선 좌상단 고정)이 범인
- 생성 슬롯 채택 **3단 판정**(①요청 수 충족 → ②미래 자리 보존 → ③중앙 근접) —
  중앙 우선 단독은 222→264p(행당 슬롯 2→1), 요청 수 우선만 추가하면 261p(중앙 열 세로
  점유가 **캡션 자리를 전멸**시켜 screenplay 지문이 페이지로 격리 51→94p). 둘 다 실측으로
  잡고 3단으로 해소
- `shrinkAwayFromFaces`(얼굴 x-구간 회피 축소, 최소 폭 0.22) · wide 말풍선 중앙 이동 ·
  `unionArea`(밀도 합집합 정확화)
- 리포트 [layout-quality-2026-08-08.md](../eval/layout-quality-2026-08-08.md)

### ⑤ MODE-01 산출물 모드 스키마 (`8cdbdeb`) — 🚦 prod 반영 대기
- `ProjectMode(pod|webtoon)` + `FormatUnit(mm|px)` enum, `Project.mode`/`Format.unit` 컬럼
  (NOT NULL DEFAULT → 기존 행 자동 백필). additive only
- 마이그레이션 `20260808100000_project_mode_format_unit` — **로컬 fresh DB(docker pg16)에서
  deploy 성공 + drift 0 + 시드 6종 실측 완료**. prod 적용은 대표님 액션(§3)
- 웹툰 px 프리셋 2종(`preset-webtoon-690`/`-800`) — **isActive:false** 라 MODE-02 배선 전
  편집기에 노출되지 않는다. `unit='px'` 면 widthMm/heightMm 는 픽셀값(컬럼명 레거시)
- 프로젝트 생성 2개소는 mode 미지정 → DB DEFAULT pod. admin px 폼은 MODE-02,
  px 인쇄 경로 가드는 MODE-03

### ⑥ MODE-02 프로젝트 생성 모드 UX + prod 장애 복구 (08-09 새벽)
- **prod 장애 발견**: MODE-02 시각 검증 중 로컬 503 추적 → **실서비스 `/api/formats` 503 확인**.
  원인 = MODE-01 스키마 push(=Vercel 자동배포)가 **마이그레이션 미적용 prod DB** 와 불일치.
  Prisma 는 select 명시 없는 조회에도 스키마 전체 컬럼을 SELECT 에 나열하므로, 새 컬럼
  (`Format.unit`/`Project.mode`)이 DB 에 없으면 P2022 로 죽는다 — 판형 API 503 ·
  프로젝트 저장/admin 판형 관리 실패. 지속 약 2.5시간(push 후 ~10h 미발견 + 발견 후 대기)
- **복구**: 대표님이 마이그레이션 적용(01:13 KST, FOLLOWUP-68 resolve + deploy 겸용) →
  즉시 200 + `unit:"mm"` 백필 확인. additive 라 데이터 영향 없음
- **MODE-02 구현**: FormatPickerModal 모드 세그먼트(POD 활성·웹툰 "준비 중" 비활성) +
  단위계 필터 · 서버 px 가드 2곳(save/full-pipeline) · admin unit 지원(생성 시 확정,
  PATCH 불변, px 는 bleed/safe 0 강제) · mypage 모드 뱃지. 신규 테스트 9 · 시각 검증 2회

### ⑦ MODE-03 웹툰 스트립 분기 + CI hotfix (08-09)
- `strip.ts` — `LayoutFormat.unit` 분기: 합병 없음(장면당 1세그먼트) · 수용량 초과 =
  **스트립 연장** · 스크롤 리듬 6% 인셋(bg 제외). 수용량 계산과 실제 보강이
  `planningTemplate` 단일점 공유(LAYOUT-03 계약). `publish`/`preflight` px 가드
- **웹툰 모드 개방 안 함** — MODE-04(편집기 px 캔버스)·05(export) 전까지 모달 "준비 중"·
  full-pipeline 가드 유지
- CI hotfix(`bd22de2`): MODE-02 px 가드가 unit 없는 테스트 mock 판형을 400 으로 거부해
  full-pipeline 테스트 9건이 깨짐 — mock 에 unit:'mm' 추가 + px 가드 케이스 신규.
  **교훈: 서버 가드 추가 시 해당 API 의 기존 테스트 mock 도 같이 봐야 한다**
- **시드 미반영 발견**: 대표님이 시드 실행했다고 했으나 prod 에 px 프리셋 0행·판형 4종
  그대로 — **구버전 워킹카피(git pull 전)에서 실행된 것으로 추정. git pull 후 재실행 필요**

### ⑧ MODE-04a editor-core 단위계(px) + 인쇄 가드 봉쇄 (08-09)
- **다각도 정찰 워크플로**(8 에이전트·4축 정찰 + 설계 3안 판정)로 착수. 판정: 단일 롱 캔버스
  **기각**(fabric `calcViewportBoundaries()` 가 엘리먼트 크기 기준 → 오프스크린 컬링 무효,
  dpr=2·7세그먼트에서 Safari 16384px 상한, BUG-013 iOS 방어 계약 위반) → 세그먼트 스택은 04b
- `Format.unit` 정본화: editor-core → **shared-schema PageFormatSchema** → 직렬화 → ai-layout
  산출물. schema 누락 시 zod 가 조용히 strip 하는 함정을 골든 라운드트립으로 고정
- **좌표용 dpi 치환**(`coordDpi`): px 판형에 25.4 를 돌려줘 항등 변환. `mmToPx/pxToMm` 시그니처와
  60여 호출처 무수정, mm 산식 동결 → editor-export 골든 PNG 43 통과(무회귀 증거)
- 가드 구멍 3개 봉쇄: publish async 우회 · PDF 워커 무검사 · compose 라우트 unit 미select
- 캔버스 상한 클램프(16384px, dpr 반영) · loadJson 단위계 불일치 경고

### ⑨ MODE-04b 웹툰 세로 스트립 편집 UI (08-10)
- `editor-core/src/strip/geometry.ts`(React 무의존) + `StoryCanvas.setViewportScale()` —
  뷰포트 API 를 코어로 회수(종전 web 이 `_fabricCanvas` 직접 조작)
- web `webtoon/` 3종: 가상화 훅(라이브 창 3/2 · 히스테리시스 · **활성 pin**) ·
  세그먼트 캔버스(**flush → dispose 순서 고정**) · 스트립 컨테이너
- 선행 조건 해소: `updatePageJson(index, json)` — `updateCurrentPageJson` 은 캔버스 N개에서
  다른 세그먼트를 덮어쓴다
- **실측 함정**: 가상화 훅이 `RefObject` 를 받으면 effect 의존성이 불변이라 마운트 시 current 가
  null 이면 영영 재시도하지 않는다(컨테이너 623px 인데 훅은 0). callback ref + state 로 교정
- 검증: 실기 8세그먼트 스트립 렌더 · 휠 스크롤 라이브 이동([0]→[0,1]) · 활성 승격 ·
  mm 경로 무회귀 육안. 신규 28 tests

## 2. 검증

- `pnpm turbo run typecheck lint test --concurrency=1` — **79 태스크 green**(각 커밋마다 실행)
- MODE-04a/b: 신규 51 tests(coords-unit 11 · 라운드트립 3 · strip-geometry 22 · virtualizer 6 · 기타) · editor-core 113 ·
  editor-export 골든 PNG 43(mm 무회귀 증거) · ai-layout 257
- ai-script 116 · ai-layout **248**(신규 74: caption-slots 18 · quality 22 · layout05 12 · 회귀 가드 5 · 기타)
- CI: `ebc23c6` green(31190889786) · `ae273a1` green(31187489500). **`dedd945`(LAYOUT-05)는
  push 직후 진행 중 — 다음 세션 시작 시 최종 HEAD run 확인.** 중간 run 이 `cancelled` 면
  실패가 아니라 워크플로 concurrency(`cancel-in-progress`)가 다음 push 로 대체한 것
- `pnpm adoption:measure` — 채택률 100% · 대사 보존 100% · 페이지 222 · **품질 종합 87.6%**

## 3. 🔴 대표님 액션 — 잔여 4건(1·3·4·5)

| # | 항목 | 상태 | 실행 |
|---|---|---|---|
| 1 | AI_GATEWAY_API_KEY 등록 | ⏳ 미실행 | `cd apps/web && vercel env add AI_GATEWAY_API_KEY production` + `.env.local` 3곳 |
| 2 | FOLLOWUP-68 이력 정리 + MODE-01 deploy | **✅ 2026-08-09 01:13 완료**(prod 200 + unit 백필 실측) | — |
| 3 | PERF-ADMIN-03 인증 저장 | ⏳ 미실행 | `pnpm perf:admin:save-auth --env prod` |
| 4 | prod 한글 PDF 육안 확인 | ⏳ 미실행 | 편집기에서 publish 1회 |
| 5 | MODE-01 웹툰 프리셋 시드 | ⏳ **재실행 필요** — 1차 실행이 prod 미반영(px 0행·판형 4종, 구버전 워킹카피 추정) | **`git pull` 후** `set -a; source .env.local; set +a; pnpm tsx scripts/seed-formats.ts` |

> 5번(시드)은 idempotent upsert 라 언제든 1회. 웹툰 프리셋은 isActive:false 라 사용자 노출 없음.

대표님이 4건 모두 진행 의사를 밝혔다(2026-08-07). **1번(키) 등록 즉시 CONTI-01 → AI-ACT-03 →
SCRIPT-KO-02 착수 가능** — 파급이 가장 크다. 3번은 저장 후 알려주시면 측정·P75 분석은 어시가.

## 4. 다음 코드 큐

- 🟢 **MODE-04c** 웹툰 개방 정합 — `save` px 허용 전에 `Project.mode` 저장 배선 필수
  (현재 save 가 mode 를 안 써서 `mode=pod + unit=px` 모순 레코드 위험). 이후 MODE-05(export)까지
  끝나야 웹툰 게이트 4종을 연다
- ⏸ LAYOUT-06 — 실사용 로그(FOLLOWUP-60) 이후 재개
- 🟢 산문 서술 문장 단위 분할 — `parse-novel` 이 단락을 200자에서 자른다. 캡션이 여러 줄을 담게 된
  지금은 문장 단위가 더 맞다(SCRIPT-KO-04 리포트 §5)
- 🚦 키 등록 시: **CONTI-01** → **AI-ACT-03** → **SCRIPT-KO-02**
- 🚦 기타 게이트(불변): onnxruntime-node(BUBBLE-02) · Upstash(SEC-RATE-01) · POSE3D-01 결제

## 5. 환경/함정 노트 (누적 — 신규 ★)

- ★★ **판형의 `dpi` 를 좌표 변환에 직접 쓰지 말 것 — 항상 `coordDpi(format)`.** 직접 쓰면
  690px 웹툰 판형이 690mm(=1956px @72dpi)로 해석돼 캔버스가 2.8배로 튄다. 같은 이유로
  `Format.unit` 은 타입·**zod 스키마**·직렬화·ai-layout 산출물 **전 구간**에 흘려야 한다 —
  한 곳만 빠져도(특히 `PageFormatSchema`) zod 가 strip 해 저장본에서 조용히 사라진다
- ★ **서버 가드는 "가장 먼저 return 하는 분기"보다 앞에 둘 것** — publish 라우트의 px 가드가
  동기 경로에만 있어 `{async:true}` 요청이 워커로 새고 있었다(MODE-04a 에서 봉쇄).
  가드 추가 시 그 라우트의 **모든 조기 return 경로**를 확인할 것
- ★ **fabric 캔버스를 크게 만들면 오프스크린 컬링이 죽는다** — `calcViewportBoundaries()` 가
  캔버스 **엘리먼트** 크기를 vpt 역변환해 쓰므로, 엘리먼트가 콘텐츠 전체면 컬링이 한 번도
  발동하지 않는다. 현재 "fabric 내부 크기 = 뷰포트" 구조가 공짜로 주는 이득이다(BUG-013 방어와 한 세트)

- ★★ **스키마 컬럼 추가는 "DB 먼저, 코드 나중" — push = prod 자동배포인 이 레포에서
  마이그레이션 미적용 상태로 스키마 커밋을 push 하면 prod 가 죽는다.** Prisma 는 select
  명시 없는 조회에도 스키마 전체 컬럼을 SELECT 에 나열하므로, 새 컬럼이 DB 에 없으면
  관련 모델의 **모든 조회**가 P2022 로 실패한다(08-09 실측: 판형 API 503 · 저장 실패
  ~2.5h). 순서 고정: ①마이그레이션 파일 커밋 ②**prod deploy 실행·확인** ③스키마 소비
  코드 push. additive 라도 예외 없다

- ★ **품질 지표는 배치기의 목적함수와 독립이어야 변별력이 있다** — 배치기가 최소화하는 항을 그대로
  지표로 쓰면 순환 논증이다. 의존 축은 "높은 게 당연, **떨어지면 회귀**"로만 읽는다
- ★ **의존 축이 낮으면 그건 알고리즘이 아니라 입력(슬롯 좌표)을 의심하라** — 얼굴 가림 62.7%의
  범인은 배치 로직이 아니라 손으로 적은 프리셋 좌표 하나였다
- ★ **슬롯 생성은 호출 단위(말풍선→캡션)가 분리돼 있어 한 호출의 최적이 다음 호출의 자리를
  죽일 수 있다** — LAYOUT-05 에서 균형 우선 채택이 캡션 수용량을 전멸시켜 screenplay 51→94p.
  수용량 계산과 실제 생성이 같은 함수인 구조 덕에 페이지 수로 즉시 드러남. 생성 슬롯 채택을
  바꾸면 **반드시 `pnpm adoption:measure` 로 페이지 수부터 확인**
- ★ **가상화 훅에 `RefObject` 를 넘기지 말 것 — 엘리먼트를 넘겨라.** effect 의존성이 ref
  객체(불변)라 마운트 시 `current` 가 null 이었으면 **영영 재시도하지 않는다**. MODE-04b 에서
  컨테이너가 623px 인데 훅은 0 으로 알고 스크롤을 못 따라갔다. callback ref + state 로 넘기면
  DOM 부착이 리렌더를 일으켜 effect 가 다시 돈다
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

_갱신: 2026-08-08 · SCRIPT-KO-04 · 제품 결정 3건(ADR-0017/0018/0019) · LAYOUT-04 · LAYOUT-05 ·
MODE-01(코드 완료, prod 반영은 대표님 액션 2+5번) 완료.
다음 착수 후보 = MODE-02(키 불요) 또는 키 등록 시 CONTI-01._
