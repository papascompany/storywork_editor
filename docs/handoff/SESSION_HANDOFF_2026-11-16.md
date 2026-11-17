# 세션 핸드오프 — 2026-11-05 ~ 11-17

> 이전: [SESSION_HANDOFF_2026-08-08.md](SESSION_HANDOFF_2026-08-08.md) (08-11 MODE-04c 이후 약 3개월 공백)
> 이 세션 = **CI Node 24 + MODE-05 · MODE-06 · LAYOUT-07 · LAYOUT-08 + 서술 손실 버그 2건**.
> PR 6개 모두 CI green 후 main 에 rebase 머지(=prod 자동배포). 웹툰 모드는 **여전히 닫혀 있다**.

## 0. 한 줄 상태

웹툰 트랙 코드 작업 완료 — **남은 것은 개방 결정(대표님)뿐**. 서술 손실 버그 2건 수정으로 원고
글자 18.5% 가 배치에 돌아왔다. 대표님 액션 4건(키·PERF 인증·PDF 육안·웹툰 시드)은 8월 이후 그대로.

## 1. 완료 (PR 순)

### ① FOLLOWUP-10 CI 액션 Node 24 — [#1](https://github.com/papascompany/storywork_editor/pull/1)
- `checkout@v7` · `setup-node@v7` · `pnpm/action-setup@v6` · `upload-artifact@v7`(v5 는 아직 node20).
  각 태그의 `action.yml` `runs.using` 을 직접 확인. 입력 변경 없음

### ② MODE-05 웹툰 이미지 내보내기 — [#2](https://github.com/papascompany/storywork_editor/pull/2)
- `editor-export` `exportWebtoon(pages, format, { layout: 'sequence'|'long' })` — px 판형 전용.
  세그먼트마다 **헤드리스 StoryCanvas 를 판형 실물 크기로** 새로 만들어 그린다(편집 캔버스는
  뷰포트 배율이 걸려 `toCanvasElement` 가 그 배율까지 곱한다)
- `planWebtoonSlices`(경계 우선 분할) · `createStoreZip`(무압축 ZIP 자체 구현, 의존성 0)
- web: px 판형이면 DownloadMenu·TopBar 모바일 메뉴가 **이미지 시퀀스(ZIP) · 롱 이미지**로 바뀜
- `StripCanvas.flushAllRef` — 내보내기 직전 라이브 세그먼트 강제 flush.
  겸사 **복원 전 flush 차단**(loadJson 완료 전 flush 하면 빈 캔버스가 저장본을 덮던 경쟁 조건)
- 검증: 픽셀 색상 테스트 16 + 실 Chromium dpr=2 에서 폭 690 정확 + `unzip -t`
- **미검증**: 실제 편집기에서 웹툰 프로젝트를 열어 다운로드하는 E2E(클라우드 세션에 DB env 없음)

### ③ MODE-06 화면 스크롤 품질 지표 + LAYOUT-07 — [#3](https://github.com/papascompany/storywork_editor/pull/3)
- `ai-layout` `measureStripQuality` — 세그먼트를 이은 스트립 위에 폰 화면 창(16:9 → 1227px)을
  반 화면씩 미끄러뜨려 창마다 5축. 세로 무게중심은 버리고 **가로만**. `pnpm adoption:webtoon`
- LAYOUT-07(대표 결정 ①): 인물 없는 웹툰 세그먼트의 전경을 **묶음째 평행이동**해 가로 중앙 정렬
- 리포트 [webtoon-quality-2026-11-11.md](../eval/webtoon-quality-2026-11-11.md)

### ④ LAYOUT-08 웹툰 세그먼트당 말풍선 상한 4 — [#4](https://github.com/papascompany/storywork_editor/pull/4)
- `maxBubblesFor(format)` — 웹툰 4 · 인쇄 6. 수용량 계산과 보강이 같은 함수를 거친다
- 상한 6/4/3 실측 후 4 채택(4 에서 포화, 3 은 세그먼트만 +7%)

### ⑤ SCRIPT-KO-05 긴 서술 단락 손실 — [#5](https://github.com/papascompany/storywork_editor/pull/5)
- **버그**: `parse-novel` 이 대사 없는 서술 단락을 `slice(0, 200)` 으로 잘라 뒷부분을 버렸다
- `splitNarration` — 200자 초과만 문장 경계에서 나눠 전부 보존. 코퍼스는 단락이 짧아 측정값 불변

### ⑥ SCRIPT-KO-06 대사 섞인 단락의 서술 손실 — [#6](https://github.com/papascompany/storywork_editor/pull/6)
- **버그**: 인용이 있는 단락은 인용만 뽑고 나머지를 버렸다 — 코퍼스 **5,770자(18.5%)** 의 행동 묘사
- `narrationOfGap` — 화자 표시 문장(마지막 어절이 발화동사인 25자 이하)만 버리고 나머지는
  서술 행으로 원래 순서대로 보존
- 겸사 MODE-06 지표 수정: 캡션 박스가 줄마다 레이어라 "화면당 대사"가 과대 계상 → 박스 단위

### ⑦ 11-16 ~ 11-17 후속 (PR #7 ~ #13)
- [#7](https://github.com/papascompany/storywork_editor/pull/7) 인계 문서 현행화
- [#8](https://github.com/papascompany/storywork_editor/pull/8) **FOLLOWUP-71** — 진짜 원인은 macOS NFD 파일명.
  `중복` 폴더 룰 조회가 NFC 키와 안 맞아 적재에 섞였다 → `scanAssets` 에서 폴더명 `normalize('NFC')`.
  (머지 API 502 로 커밋은 main 에 들어갔으나 PR 이 열린 채 남아 코멘트 후 close)
- [#9](https://github.com/papascompany/storywork_editor/pull/9) `.nvmrc` v25 → **v24**(Vercel 런타임 24.x 와 일치) +
  CI 러너 `ubuntu-24.04` 임시 고정(ubuntu-latest 가 26.04 로 넘어가 Playwright 1.60 이 chromium 설치 거부)
- [#10](https://github.com/papascompany/storywork_editor/pull/10) **Playwright 1.64.1** — 1.62+ 가 26.04 지원.
  root `pnpm.overrides` 로 admin 의 next optional peer 까지 단일화. 러너 고정 해제(ubuntu-latest).
  시각 회귀 12장 diff 픽셀 수까지 24.04 실행과 동일 → 스냅샷 재생성 불요
- [#11](https://github.com/papascompany/storywork_editor/pull/11) **PERF-ADMIN-05** — `getEntriesByType('largest-contentful-paint')`
  는 명세상 항상 빈 배열 → admin LCP 가 늘 0 이었다. init script 의 buffered observer 로 교체(perf-web 과 동일)
- [#12](https://github.com/papascompany/storywork_editor/pull/12) **FOLLOWUP-01** — TS 파일에 `import/resolver` 가 없어
  의존성 매트릭스 룰(`no-restricted-paths`)이 **상대경로까지 전면 무력화** 상태였다. resolver 연결 후 드러난
  기존 위반 26건은 대표 결정으로 매트릭스를 실제 구조에 맞춤(ai-script→recommend→layout 순방향,
  editor-history→layers, editor-export→history · 역방향 금지 유지)
- [#13](https://github.com/papascompany/storywork_editor/pull/13) `editor-bubble` 이 매트릭스·tsconfig paths 에
  빠져 있던 것 등록(editor-pose/text/effects 와 같은 계층)

## 2. 측정 (코퍼스 21편 · seed 0 · 키/DB 불요)

| | POD (B5) | 웹툰 (690px) |
|---|--:|--:|
| 페이지 / 세그먼트 | 222 → **223** | 222 → **264** (상한 4 · 서술 보존) |
| 채택률 · 대사 보존 | 100% · 100% | 100% · 100% |
| 품질 종합 | 87.6 → **87.9%** | 스크롤 종합 90.7 → **95.4%** |
| 기타 | 시선·얼굴 100% | 가로 균형 75.3 → 86.8% · 배경만 있는 화면 10.7 → 8.9% |

- `pnpm adoption:measure` · `pnpm adoption:webtoon`(→ `data/eval/adoption-webtoon-baseline.json`)
- 검증: 각 PR 마다 `pnpm turbo run typecheck lint test` green + GitHub Actions green

## 3. 🔴 대표님 액션 — 잔여 4건 + 개방 결정 1건

| # | 항목 | 상태 |
|---|---|---|
| 1 | `AI_GATEWAY_API_KEY` 등록 | ⏳ 미실행 — CONTI-01 · AI-ACT-03 · SCRIPT-KO-02 착수 조건 |
| 3 | PERF-ADMIN-03 인증 저장 `pnpm perf:admin:save-auth --env prod` | ⏳ 미실행 |
| 4 | prod 한글 PDF 육안 확인(편집기에서 publish 1회) | ⏳ 미실행 |
| 5 | 웹툰 프리셋 시드 재실행(`git pull` 후 `pnpm tsx scripts/seed-formats.ts`) | ⏳ 미실행 |
| **신규** | **웹툰 모드 개방 결정** | ⏳ 코드 준비 완료 |

**개방 = 한 세트로 3가지**: ① FormatPickerModal "준비 중" 해제 ② 서버 px 가드 해제
(`projects/save` · `script/full-pipeline` · `script/compose` — `publish`·`preflight` 는 인쇄 경로라 유지)
③ prod 프리셋 `isActive:true`(액션 5번 시드 후). main 머지 = prod 배포라 결정 후 진행.

## 4. 다음 코드 큐 (키 없이 가능)

- 🟢 **시각 회귀가 form 을 못 보고 있음** — CI 로그에 `waitForSelector 타임아웃: form/h1` 이 매번 찍히고
  diff 2~6.6% 로 통과. CI(env 없음)에서 로그인 form 이 렌더되지 않는 상태를 찍고 있을 가능성 — 원인 확인 필요
- 🟢 PERF-ADMIN-04(login FCP 폰트) · LEGAL-03(쿠키 배너) · M9-02/03(키보드·보안 점검) — 키 불요
- 🟢 플랫폼별 웹툰 분할 높이 프리셋 — 규격(플랫폼·높이 상한) 확인 후 `maxSliceHeightPx` 로 메뉴 노출
- ⏸ LAYOUT-06 · 웹툰 상한·화면 지표 상수 교정 — 실사용 로그(FOLLOWUP-60) 이후
- 🚦 키 등록 시: CONTI-01 → AI-ACT-03 → SCRIPT-KO-02

## 5. 환경/함정 노트 (신규 ★, 이전 누적은 08-08 핸드오프 §5)

- ★ **클라우드 세션 PR 흐름**: 지정 브랜치 하나로 PR 을 연속 운용 — PR 머지(rebase) 후
  `git checkout -B <branch> origin/main` 으로 다시 시작하고 다음 작업을 cherry-pick → force-with-lease push.
  같은 브랜치에 열린 PR 이 있을 때 다음 작업을 push 하면 그 PR 에 섞이고 CI 가 취소된다 —
  다음 작업은 로컬 `wip/*` 브랜치에 커밋해 두고 머지 후 옮길 것
- ★ **GitHub 러너 apt 미러 DNS 장애**(11-11, 2회 연속) — `playwright install --with-deps` 의 폰트 설치가
  막혀 CI 전체가 실패했다. CI 에 폴백 추가(실패 시 경고 + 브라우저만 설치, 시각 회귀가 폰트 차이를 잡음).
  실패 로그에 `Temporary failure resolving 'azure.archive.ubuntu.com'` 이 보이면 이 건이다
- ★ **"보존" 지표가 대사만 센다** — 서술 손실 버그 2건이 수개월간 어떤 지표에도 안 잡혔다.
  파서 출력을 바꿀 때는 원문 글자 대비 보존율을 직접 확인할 것
- ★ `parse-novel` 은 "그날·다음날·한편·그 후…"로 **시작하는 단락을 장면 구분자로 빼낸다** —
  테스트 문장을 이런 단어로 시작하면 단락이 사라진다
- ★ 캡션 박스는 줄마다 text 레이어(`captionBoxSlotId` 공유) — 지표·집계는 박스 단위로 묶을 것
- ★ 클라우드 세션은 `.env` 가 없어 앱 E2E 불가 — 렌더 경로는 esbuild 번들 + 실 Chromium(Playwright)로
  따로 검증했다(`dpr=2` 로 레티나 배율 함정 확인)
- ★ `pnpm/action-setup` v6 · `setup-node` v7 기준. 액션 메이저를 올릴 땐 태그의 `action.yml` `runs.using` 확인
- ★ **ESLint import 룰은 resolver 없으면 조용히 통과한다** — 해석 못 한 import 는 `no-restricted-paths` 가 건너뛴다.
  룰이 실제로 동작하는지는 위반 probe 파일을 넣어 error 가 나는지로 확인할 것(11-17 FOLLOWUP-01)
- ★ `performance.getEntriesByType('largest-contentful-paint')` 는 항상 빈 배열 — LCP 는 buffered observer 로만
- ★ Playwright 는 OS 지원 범위가 버전에 묶인다(26.04 = 1.62+). ubuntu-latest 이동 시 CI 가 설치 단계에서 깨진다
- ★ 클라우드 세션은 `cdn.playwright.dev` 가 프록시에 막혀 `playwright install` 불가 — 컨테이너 기본 chromium
  (`require('playwright')`) 으로 동작만 검증하고, 버전 고정 렌더 비교는 CI 에 맡긴다
- 세션 종료 시 핸드오프+RESUME_PROMPT 갱신은 커밋과 한 세트

_갱신: 2026-11-17 · PR #1~#13 머지 · 다음 착수 후보 = 시각 회귀 form 미렌더 조사 (키 불요) 또는 웹툰 개방(결정 시)._
