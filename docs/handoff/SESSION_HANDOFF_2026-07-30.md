# 세션 핸드오프 — 2026-07-30

> 이전: [SESSION_HANDOFF_2026-07-25.md](SESSION_HANDOFF_2026-07-25.md)
> 이번 세션 = (D) 실기 검증 PASS + 빈 상태 CTA 배선 수정 + **CONTI-02 콘티 시트 합성기** + **SCRIPT-KO-01 한국어 화자귀속 1층 룰 엔진** 완료.

## 0. 한 줄 상태 (main `1a7429a` = origin · 워킹트리 clean · CI green · web/admin prod 라이브)

## 1. 이번 세션 완료

- **(D) 실기 검증 PASS** — 7-25 잔여 검증분. 모바일 375px에서 시트 포즈 추가 → 즉시 peek 접힘 + 캔버스 표시 + autosave 확인, 콘솔 에러 0. 시트 스테일 배선 수정(`569297e`)도 실기 재확인(포즈 패널 1,270개 결과 렌더).
- **`0fac9bc` fix(web)**: 빈 상태 '포즈 추가하기' CTA 무반응 수정. `setActive('pose')`만 호출해 **데스크톱 FeatureSidebar(sidebarOpen 미설정)·모바일 바텀시트(열기 신호 없음) 모두 안 열리던 갭**. `useToolStore.openToolPanel(tool)` 액션 + `sheetOpenRequest` 카운터(동일 도구 재요청 전달) + 시트 구독(tools 탭 + peek→half, 마운트 잔존값 ref 가드). 회귀 테스트 4건(17~20) 추가.
- **`dbb5e5a` feat(ai-layout)**: **CONTI-02** 콘티 시트 합성기 + PDF (research §2.2, 키 불요 P0, 사용자 착수 승인).
  - `composeContiSheets()` — 2×4 컷 그리드 순수함수·결정론. 컷별 [번호·샷라벨(훅)·화자·대사·지문] + 포즈 PNG 썸네일. **pdf-engine 무수정 통과** (어댑터 계약: mm left/top + bubble/text/pose kind)
  - `conti-2x4` 템플릿(default-templates) + publish API `body.conti=true` → SceneDoc 로드, `_aiMeta.sceneIndices` 로 장면→페이지/대표포즈 매핑, 시트를 **음수 pageIndex** 로 본문 앞 prepend. async 미지원(경고), SceneDoc 없으면 경고 후 생략
  - 함정 발견: pdf-lib `drawText` 의 `\n` 멀티라인은 **페이지 기본 lineHeight(fontSize 무관)** 로 렌더 → 래핑 줄당 개별 text 레이어로 배출해 회피 (실물 PDF 래스터 시각검증으로 발견)
  - shotLabel 은 CONTI-01(장면 메타 영속화, 🚦 API 키) 이후 `cameraAngleToShotLabel` 로 채움
  - roadmap 에 CONTI 섹션 신설 (01 게이트 / 02 ✅ / 03 대기)
- **`1a7429a` feat(ai-script)**: **SCRIPT-KO-01** 한국어 화자귀속 1층 룰 엔진 (research §4.1, 키 불요 P0, 사용자 착수 승인).
  - `parsers/ko-speech.ts` 신설 — 발화동사 어간 패턴 44군(활용형 커버) + 따옴표 delimiter 플러그인(곧은/굽은·「」·『』·대시) + BookNLP식 캐릭터 ID 레지스트리(애칭 '이'·호격·성+이름 병합) + **인물성(animacy) 술어 게이트**('간판이/불빛이' 무생물 주어 차단)
  - 귀속 우선순위: 후행/선행 발화동사 → 같은 단락 행동 귀속 → 대명사(그/그녀→최근 인물) → 인용 전용 단락 교대 보정
  - **golden novel 대사 13줄: 귀속 1→12줄, 오귀속 0** · scene F1 0.899/format 0.900 무회귀. 유일한 미귀속은 후방조응(화자가 다음 단락에서 공개) — 2·3층(SCRIPT-KO-02 LLM 폴백) 몫
  - Kiwi(LGPL v3)는 별도 프로세스 인프라 결정 게이트 — `SPEECH_VERB_RE` 교체 지점만 어댑터 경계로 유지
  - roadmap 에 SCRIPT-KO 섹션 신설 (01 ✅ / 02·03 게이트)

## 2. 검증 상태

- CTA 배선: 유닛 28/28 + 실기 모바일 375·데스크톱 1280 + CI run 30509939271 **success**.
- CONTI-02: 신규 유닛 16(시트 분할·pdf 계약·safe 경계·결정론·래핑 말줄임) 포함 ai-layout 118 · web 580 · turbo 24태스크 green + **실물 PDF 스모크**(9컷→2시트, 재빌드 byte-identical, 래스터 시각 확인) + CI run 30516047733 **success**.
- SCRIPT-KO-01: ko-speech 신규 33건 포함 ai-script 107 green + 다운스트림(ai-recommend/ai-layout/web) turbo 27태스크 green + golden 실측 전/후 비교(1→12/13, 오귀속 0) + CI run 30522057962 **success**.
- 한글 PDF 렌더는 기존 `PRETENDARD_TTF_PATH` 서버 계약(M6) 그대로 — 미설정 환경은 한글/△ 스킵 경고가 정상. **prod env 에 이 변수 설정 여부 확인 권장**(콘티·본문 텍스트 공통 전제).
- 실기 브라우저 검증 팁: 하이드레이션 완료 전 클릭 유실(판형 모달 2회 재현) — read_page 후 ref 클릭 권장.

## 3. 미진행 · 다음 큐

- 🟢 즉시 착수: **BUBBLE-02**(말풍선 비용함수) / **CHAR-GEN-01**(DWPose 키포인트 보강) / **CONTI-03**(콘티 뷰 UI — `/ui-spec` SOP 대상)
- 🔴 대표님 액션: **FOLLOWUP-68 prod 적용**(`20260629020000_reaction_user_fk` migrate deploy) / **PERF-ADMIN-03**(perf:admin 실행) / (신규) **prod `PRETENDARD_TTF_PATH` 설정 확인**
- 🚦 게이트 대기: **CONTI-01** 포함 LLM 실가동(`AI_GATEWAY_API_KEY`) / POSE3D-01(결제 승인) / FOLLOWUP-60(법무) / M7·EDU·MARKET
- 📋 제품 의사결정 3건: 웹툰 모드 vs POD 우선순위 · 생성 에셋 마켓 정책 · SSOT 갱신(자산 수치 단일화, nano-banana 표기)

## 4. 환경/함정 노트

7-25 핸드오프 §4 그대로 유지(커밋 컨벤션·마이그레이션 이원화·디스크·lint-staged·MCP 인증). 디스크는 현재 29% 사용으로 여유. 추가: pdf-lib `\n` 멀티라인 lineHeight 함정(§1 CONTI-02 참조) — pdf-engine 에 텍스트 넣을 때 줄당 레이어로.

_갱신: 2026-07-30 · (D) 종결 + CTA 배선(`0fac9bc`) + CONTI-02(`dbb5e5a`) + SCRIPT-KO-01(`1a7429a`). 남은 근시일 = BUBBLE-02 / CHAR-GEN-01 / CONTI-03 착수 + FOLLOWUP-68 prod 반영(대표님)._
