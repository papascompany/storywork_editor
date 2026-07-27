# 세션 핸드오프 — 2026-07-25

> 이전: [SESSION_HANDOFF_2026-06-29.md](SESSION_HANDOFF_2026-06-29.md)
> 이번 세션 = 콘티·3D·OSS 조사 정식화 + 모바일 포즈 패널 버그 2건 수정 + 편집기 첫인상 UI 4건 + 마케팅 GTM 플레이북.

## 0. 한 줄 상태 (main `6dc488c` = origin · 워킹트리 clean · 최근 5커밋 전부 CI green · web/admin prod 라이브)

정본: `/Users/yohan/Developer/claude/storywork`. 시작 시 `git pull` → `pnpm install` → (디스크 여유 확인 후) `pnpm turbo run typecheck lint test --concurrency=1`. **병렬 빌드 금지**(디스크 보호). Supabase MCP는 prod(`wjpyeqckuxyfeytuzgon`, thestorige@gmail.com)에 권한 없음 → DB 변경은 마이그레이션 파일 커밋 + 사용자가 SQL Editor/`migrate deploy`로 적용.

---

## 1. 이번 세션 완료 (커밋 순)

- **`0762336` docs(research)**: 「콘티 자동생성 모듈 + 포즈 3D화 양산 + OSS/모델 조사」 정식 문서화. 병렬 서브에이전트 워크플로 2회(13 에이전트)로 조사 → [docs/research/2026-07-21_conti_pose3d_oss_research.md](../research/2026-07-21_conti_pose3d_oss_research.md) + 시각화 HTML. **제안 단계(구현 미착수, 휴먼게이트 대기)**.
- **`569297e` fix(web)**: 모바일 바텀시트 도구 패널 **스테일 배선** 수정. `MobileBottomSheet`가 M2/M5 완료에도 pose·template·text·bubble·wordfx를 "Mn 활성화 예정" 플레이스홀더로 렌더하던 것을 데스크톱과 동일한 실제 패널로 교체(+ `onAddPoseToCanvas` 배선). **폰에서 포즈가 안 보이던 근본 원인**.
- **`7aa4921` fix(editor-core)**: dispose 시 fabric 잔여 canvas 요소 DOM 제거. StrictMode 이중 마운트(dev 전용)에서 잔여 canvas가 드로잉 서피스를 밀어내던 문제. 회귀 테스트 2건 추가. **prod(단일 마운트) 영향 없음**.
- **`a0b5a59` fix(web)**: 편집기 첫인상 UI 4건 — (A) fit 줌 하한을 수동 줌(`MIN_ZOOM` 25%)과 분리(`FIT_MIN_ZOOM` 5%) → 데스크톱 24%·모바일 18%로 판형 전체 표시 (B) 빈 상태 카피 반응형(모바일 "아래 도구 버튼에서…" + ⌘K 칩 숨김) (C) 바텀시트 peek 56→96px(탭바 노출) (D) 모바일 포즈 추가 후 시트 peek로 접기.
- **`6dc488c` docs(marketing)**: `marketing-strategy` 스킬 5단계 산출 → [docs/marketing/2026-07-24_gtm_playbook.html](../marketing/2026-07-24_gtm_playbook.html). 실측 4트랙 조사 기반 GTM 플레이북. **문서만 생성, 소스 무수정**.

## 2. 검증 상태 · 주의

- **CI**: 위 5커밋 전부 green(각 ~10분). `pnpm turbo run typecheck lint test --concurrency=1` 로컬도 통과 확인.
- **UI 4건 검증 격차**: A·B·C는 dev 서버 실기(데스크톱 1280·모바일 375) 스크린샷으로 확인. **(D) 모바일 포즈 추가 후 시트 접힘은 실기 미확인** — 마케팅 서브에이전트가 브라우저 세션을 공유·점유해 시트 내부 스크롤이 timeout. 코드는 결정론적(`handleAddPoseFromSheet` = 추가 콜백 후 `setSnap('peek')`)이고 하위 경로(포즈 추가→레이어 생성)는 실기 검증됨. **다음 세션 또는 폰에서 D 최종 확인 권장**.
- **브라우저 프리뷰 + 서브에이전트 동시 사용 주의**: 이번 세션에서 백그라운드 general-purpose 에이전트가 WebFetch로 같은 브라우저 세션(seed 탭)을 점유해 UI 시각검증 탭이 다른 사이트로 이동하고 새 탭이 계속 닫히는 충돌 발생. **UI 시각검증과 웹조사 서브에이전트를 동시에 돌리지 말 것**(순차로).
- **known noise**: `apps/web`에 `page 2.tsx`·`__tests__/*.test 2.tsx` 등 공백 포함 중복 파일 존재(과거 디스크 이슈 흔적, 조사 범위 밖). Next.js dev 좌하단 "N" 오버레이는 dev 전용(prod 없음).

## 3. 미진행 · 보류 (다음 큐)

### 🟢 즉시 착수 가능 (키·게이트 불요) — 이번 세션 조사에서 도출
콘티/OSS 조사([research 문서](../research/2026-07-21_conti_pose3d_oss_research.md) §6 로드맵)에서 나온 P0:
- **CONTI-02** 콘티 시트 합성기 — `ai-layout`의 `buildPageFabricJson` 선례로 컷 그리드(2×4) fabricJson 서버 합성 + `conti-2x4` 템플릿(`default-templates.ts`의 'default-3panel' 패턴) + PDF(`publish` API에 `conti:true`). **pdf-engine 무수정 통과**(comicmaker 프리플라이트 기존재).
- **SCRIPT-KO-01** 한국어 화자귀속 룰 강화 — Kiwi(LGPL, 별도 프로세스) 발화동사 어간 매칭 + 따옴표 delimiter 플러그인 + BookNLP식 캐릭터 ID 레지스트리. (현재 `ai-script` novel 파서는 발화동사 11종 정규식만)
- **BUBBLE-02** 말풍선 배치 비용함수 4항 정식화 + 검출기 자동 QA(comic-translate ONNX).
- **CHAR-GEN-01** DWPose(Apache)로 기존 포즈 1,058장 키포인트 일괄 보강(현재 전량 3점 휴리스틱 추정).
- **(D) UI 최종 확인** — 모바일 포즈 추가 후 시트 접힘 실기 검증(§2).

### 🔴 대표님 액션 필요 (이전 세션부터 이월)
- **FOLLOWUP-68 prod 적용** — 마이그레이션 `20260629020000_reaction_user_fk`(고아정리→FK Cascade)를 prod 반영. 권장: `prisma migrate deploy`(prod DATABASE_URL). RLS 수동적용분(`20260629000000_enable_rls`·`010000_deny_all`) 드리프트도 함께 정리됨.
- **PERF-ADMIN-03** — admin 계정(`PERF_ADMIN_EMAIL/PASSWORD` env)으로 `pnpm perf:admin:save-auth --env prod` + `pnpm perf:admin:prod` 실행 → 결과 공유 시 어시가 P75 분석. (비번은 어시가 못 다룸)

### 🚦 외부 키·게이트 대기
- **CONTI-01 / LAYOUT-02 / SCRIPT-KO-02 / AI-ACT-03** — LLM enhance 실가동(`AI_GATEWAY_API_KEY`) 공유 게이트. 콘티 장면 메타 실가동은 이 키 발급 후.
- **POSE3D-01** 3D 파일럿(체형 1종×포즈20×앵글4, Tripo/Meshy/Rodin A/B, $50 미만) — 🚦 SaaS 결제 승인.
- **FOLLOWUP-60** PostHog/Sentry — 법무(쿠키 동의) 선행. **AI 기본법 표시의무(2026-01-22 시행)** 검토를 여기 병합 권장.
- **사업화 후반** M7 결제(Stripe)·EDU·MARKET — 🚦 결제·정산·마이그레이션.

### 📋 제품 의사결정 필요 (research 문서 §7)
1. 세로 스크롤 웹툰 모드 vs POD 인쇄 우선순위(SSOT는 인쇄 중심, 웹툰 문법은 시장 공백=기회)
2. 생성 보조 에셋의 마켓 정책(라이선스 청정 차별점과 긴장 — 생성 에셋 별도 티어 분리 표시 권장)
3. SSOT 갱신 2건: 자산 수치 단일화(문서 1,058 vs 파일 1,260 vs DB 1,270) · CLAUDE.md "nano-banana 2=Gemini 2.5 Flash Image" 구세대 표기 현행화(3.1 Flash/3 Pro)

## 4. 환경/함정 노트 (이전 세션에서 유지)

- 커밋: subject **소문자/한글 시작**(commitlint `subject-case` — "GTM…" 대문자 시작 거부됨), body ≤100자/줄, `Co-Authored-By` 유지. push 시 Vercel prod 자동배포(무관 앱 CANCELED 정상).
- **마이그레이션 이원화**: 앱 스키마=`prisma/migrations/`, RLS·트리거 함수=`supabase/migrations/`. `prisma migrate deploy`는 트리거 함수 미생성.
- **디스크**: 98%+ 시 `node_modules/.bin` 손상 → 병렬 pnpm 금지, 단일 순차. (메모리 `env-disk-bin-corruption`)
- **lint-staged**: `*.{ts,tsx}`만 eslint, `*.{json,md,yaml,yml,css}`만 prettier — **HTML은 포매팅 대상 아님**(스테이징에 tsx/md 없으면 "No staged files match" 뜨지만 커밋은 성공).
- **marketing MCP 서버**(hubspot·klaviyo 등) 및 figma/vercel/product-management 계열은 **인증 필요** — 실제 연동은 인터랙티브 세션 `/mcp`에서.

## 5. 재개 체크리스트
1. `git pull`(6dc488c 동기 확인) → `pnpm install` → 디스크 여유 확인.
2. UI 4건 중 **(D) 모바일 포즈 추가 후 시트 접힘** 실기 확인(미완 검증분).
3. 즉시 착수 후보: **CONTI-02**(콘티 시트, 키 불요) 또는 **SCRIPT-KO-01**(Kiwi 화자귀속) 또는 **CHAR-GEN-01**(키포인트 보강). ADR·roadmap 정식 반영은 착수 승인 후.
4. DB/마이그레이션·결제·외부키는 휴먼게이트 — 승인 후.
5. UI 작업은 `/ui-spec`→동의→구현→`/visual-check`(웹조사 서브에이전트와 동시 금지)→`/ci-watch` SOP.

_갱신: 2026-07-25 · 콘티·3D·OSS 조사 정식화 + 모바일 포즈 버그 2건 + UI 첫인상 4건 + 마케팅 GTM 플레이북. 남은 근시일 = (D) UI 최종확인 + CONTI-02/SCRIPT-KO-01 착수 + FOLLOWUP-68 prod 반영(대표님)._
