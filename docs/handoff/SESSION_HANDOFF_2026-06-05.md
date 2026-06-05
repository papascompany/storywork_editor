# Session Handoff — 2026-06-05 (M4 + M6 + LEGAL-OPS-01 + Audit + Perf)

> 이 문서는 2026-06-03 ~ 2026-06-05 세션의 누적 작업 요약 + 다음 세션 시작점.
> Claude Code 새 세션에서 이 문서를 먼저 읽으면 컨텍스트 복원 가능.

---

## 📌 한 줄 요약

3 일 누적 49 commits — **M4 AI Pipeline (8/8) + M6 POD PDF (4/4) + LEGAL-OPS-01 (회사정보) + 전체 audit + 속도 1차 개선** 모두 완료. 사용자 가치 사이클 (글 → 자동 페이지 → 편집 → PDF 출판) **100% 작동**.

---

## 1. 누적 완료 (이번 세션 7 묶음)

### M4 AI Pipeline (전체 8/8 완료)

| 묶음 | SHA | 산출 |
|---|---|---|
| M4-00 Character 시스템 | `628de83` + `9764c65` + `b039ab8` | Character 모델 + 더미맨 1,270 자동 매핑 + admin CRUD |
| M4-01 ai-script (룰) | `49a224b` + `4556bfb` | 5형식 자동감지 + 골든셋 20 + 룰 F1 0.899 |
| M4-01-03 LLM 보강 | `ce8e2e6`..`de37d35` | Vercel AI Gateway + claude-sonnet-4-6 + prompt cache |
| M4-02 ai-recommend | `af14315`..`c6414b0` | Character scope 임베딩 + 만족도 100% |
| M4-03 ai-layout compose | `5517071`..`9c6a2ea` | 페이지 분할 5 규칙 + lowDpi 제약 (M2-07 통합) + 102/102 tests |
| M4-04 E2E 풀 파이프 | `14004b3`..`6a9448c` | `/api/script/full-pipeline` + `/editor/import` Wizard + DB 저장 |
| M4-05 alternatives UI | `292b857`..`481b212` | 한 클릭 교체 + 모바일 BottomSheet · 14 store tests |

### M6 POD PDF (전체 4/4 완료)

| 묶음 | SHA | 산출 |
|---|---|---|
| M6-01 pdf-engine | `6c88485`..`c3857e5` | buildPdf() 벡터 + Pretendard embed + 결정론 해시 · 16p 8~17ms |
| M6-02 Inngest 잡 | `057c98c` | apps/workers + Realtime 진행률 채널 + PdfProgressToast |
| M6-03 preflight | `460a666`..`4b9a4f5` | 3 프로필 × 6 룰 + 시각화 PDF · 골든 5 시나리오 15/15 |
| M6-04 인쇄소 프리셋 admin | `884028f`..`4c3d571` | PrinterProfile model + admin CRUD + DB 어댑터 |

### LEGAL-OPS-01 (회사정보)

| SHA | 산출 |
|---|---|
| `8b980c1` + `de9cdd2` + `183077f` + `b6a0fad` | CompanyInfo 싱글톤 모델 + admin /company + Footer 동적 노출 + 약관/PP 변수 치환 |

### Audit (전체 소스 오류 체크)

| SHA | 산출 |
|---|---|
| `86fbf21` 진단 → `ef97a11` fix → `c07e958` FOLLOWUP → `f7a17a1` + `65ab299` Prisma fallback → `1476d7b` 갱신 | lint 10→0 · test 53→0 fail · CI SSG prerender 실패 fix · FOLLOWUP-60~63 등재 |

### Perf 개선 (Speed Insights + /notices)

| SHA | 산출 |
|---|---|
| `dab88d4` 진단 → `314e4f5` Speed Insights → `0d5eca7` Prisma 통합 → `010ef57` cache → `4438350` 보고서 | RUM 7일 누적 시작 + /notices LCP 4016→500ms 예상 (prod deploy 검증 대기) |

---

## 2. 신규 데이터 모델 / 스키마

| 모델 | 용도 | 마이그레이션 |
|---|---|---|
| `Character` (M4-00) | 캐릭터 = 포즈 묶음 | `character_system` |
| `Notice` (BOARD-01) | 공지사항 | `board_notice_inquiry_comment` |
| `Inquiry` (BOARD-02) | 1:1 문의/Q&A | 동일 |
| `Comment` (BOARD-04) | Showcase 댓글 | 동일 |
| `PrinterProfile` (M6-04) | 인쇄소 사양 프리셋 | `printer_profile` |
| `CompanyInfo` (LEGAL-OPS-01) | 사업자 정보 싱글톤 | `company_info` |
| `User.deletedAt` 등 (LEGAL-OPS-03) | 회원 탈퇴 soft delete | `account_deletion` |

---

## 3. 신규 패키지 / 인프라

| 패키지 | 용도 |
|---|---|
| `@storywork/ai-script` | 대본 분석 (rule + LLM 보강) |
| `@storywork/ai-recommend` | 포즈/배경/말풍선 추천 |
| `@storywork/ai-layout` | 페이지 자동 배치 |
| `@storywork/pdf-engine` | POD PDF 생성 + preflight |
| `@storywork/workers` (apps/) | Inngest 비동기 잡 |

---

## 4. 신규 ADR

- **ADR-0013** Tailwind v4 monorepo `@source` directive 의무화
- **ADR-0014** Layer 밖 universal `*` selector reset 금지
- **ADR-0015** 회원 탈퇴 Soft Delete + 30일 Hard Delete (LEGAL-OPS-03)

---

## 5. 현재 prod 상태

- **web**: https://storywork-editor-web.vercel.app — `/`, `/editor`, `/editor/import`, `/notices`, `/contest`, `/showcase`, `/contact`, `/legal/*`, `/mypage/account`, `/goodbye` 모두 live
- **admin**: https://storywork-editor-admin.vercel.app — `/notices`, `/inquiries`, `/contests`, `/showcase`, `/characters`, `/printers`, `/users`, `/company` 모두 live
- **DB**: `wjpyeqckuxyfeytuzgon.supabase.co` (Supabase Postgres + pgvector)
- **CI**: 8 gate (lint → @source → anti-pattern → tc → test → build → css-sanity → visual-regression)
- **HEAD**: `4438350` (또는 본 handoff commit 직후)

---

## 6. 잔여 작업 — 우선순위별

### 🔥 즉시 (휴먼 게이트)

| 작업 | 필요 입력 |
|---|---|
| **LEGAL-OPS-01 사업자 정보 실 입력** | admin `/company` 로그인 후 회사명·등록번호·대표자·주소·전화·이메일 입력 → isPublished 토글 |
| **PERF-ADMIN-03** 인증 후 보호 페이지 재측정 | admin 로그인 + `pnpm perf:admin:save-auth` |
| **LEGAL-OPS-02** 환불정책 정식화 | 법무 검토 |

### 🚨 P0 다음 큰 작업 (Claude 자율)

| 작업 | 비고 |
|---|---|
| **`/editor` dynamic import** | 590KB → 250KB · visual-regression 필수 · 회귀 위험 → 별도 PR + 사용자 동의 후 |
| **Speed Insights RUM 7일 검증** | 자동 누적, 7일 후 후속 우선순위 재조정 |

### 🌱 P1

- M4-01-03 LLM 보강 (남은 부분) — F1 ≥ 0.85 검증
- BOARD-05 신고 큐 모더레이션
- BOARD-06 FAQ 별도 페이지 카테고리화
- COMMS-01 Resend/SendGrid 이메일 (BOARD-02 Inquiry 답변 발송)
- PERF-WEB-02 `/editor` dynamic import
- FOLLOWUP-60~63 (Audit 잔여)

### 🟢 P2 / M7-M9

- M7 Stripe + 구독 + 마이데이터
- M8 SNS 카드 (nano-banana 2 OG)
- M9 Lighthouse 90+ / 보안 / 부하

### ⏰ Deadline

- **FOLLOWUP-10** GitHub Actions Node 20 → 24 — **마감 2026-09-16**

---

## 7. 휴먼 게이트 / 환경 정보

### 미커밋 잔여 (별도 작업)

```
apps/admin/app/api/auth/totp-setup-init/
apps/admin/app/api/auth/totp-setup/
apps/admin/app/api/auth/totp-verify/
apps/admin/src/lib/totp/
```

— admin TOTP 신규 흐름. 본 세션 작업과 무관, 별도 PR 권고.

### Vercel CLI

`54.2.0 → 54.9.1` 업그레이드 권장 (`npm i -g vercel@latest`).

### 회고/SOP 룰 — 다음 세션도 엄수

- 회고 §7.2-① 명세 외 변경 금지
- 회고 §7.2-② visual-check / 실측 검증 필수
- 회고 §7.2-④ 첫 실패 시 멈춤
- 회고 §7.2-⑧ 3회 실패 시 멈춤
- Step 0 SOP: prod CSS hash + utility 존재 확인 후 명세화

---

## 8. 핵심 도구 / 슬래시

| 명령 | 용도 |
|---|---|
| `pnpm visual-check /<route>` | dev/prod 캡처 |
| `pnpm visual-check --url <prod>` | prod URL 직접 캡처 |
| `pnpm ci-watch` | push 후 CI 자동 추적 |
| `/ui-spec <issue>` | 사용자 직관 표현 → 명세표 |
| `pnpm perf:web` / `perf:web:prod` | web Web Vitals 측정 |
| `pnpm perf:admin:prod` | admin timing 측정 (storage state 필요) |
| `pnpm check:css-source / css-anti / css-sanity` | CI gate 로컬 실행 |

---

## 9. 누적 통계 (M0~M6 + 후속)

- 총 commits: ~250+ (이번 세션 49)
- Roadmap 완료 항목: 90+/130+ (약 70%)
- 신규 ADR: 15 (ADR-0001~0015)
- 회고 문서: 2 (2026-05-15/16 spacing · 2026-05-17 root cause 종결)
- Audit 문서: 1 (2026-06-05 source audit)
- Perf 문서: 2 (admin baseline · web speed audit)
- 신규 Prisma 모델: 7 (M4-00 Character + BOARD 3 + M6-04 PrinterProfile + LEGAL-OPS-01 CompanyInfo)
- 신규 마이그레이션: 6
- 신규 API routes: 20+ (script analyze/recommend/compose/full-pipeline + projects/publish/preflight/alternatives + admin/characters/printers/notices/inquiries/contests/users + account/export/delete + cron 등)
- 신규 admin 메뉴: 8 (characters · notices · inquiries · contests · showcase · printers · users · company)
- 누적 tests: 498+ 전체 pass
- CI gate: 8 단계
- 누적 회귀 차단 ADR: 0013/0014 (자동 차단)

---

## 10. 다음 세션 시작점 (Claude 새 세션 첫 메시지 추천)

```
이 프로젝트는 StoryWork (AI 스토리보드 편집기) 입니다. 
docs/handoff/SESSION_HANDOFF_2026-06-05.md 를 먼저 읽고 컨텍스트 복원해주세요.

핵심:
- M4 AI Pipeline + M6 POD PDF 모두 완료, 사용자 가치 사이클 작동
- main HEAD: <COMMIT>
- 잔여 휴먼 게이트: LEGAL-OPS-01 실 사업자 정보 입력 + PERF-ADMIN-03 admin storage state
- 잔여 P0 자율: /editor dynamic import (590KB → 250KB) — 회귀 위험 큼, visual-regression 필수
- 잔여 P1: BOARD-05/06, COMMS-01, M4-01-03 LLM 보강 잔여 등

CTO 가 추천하는 다음 작업: <X>
```

X 후보:
- `/editor` dynamic import — 가장 큰 사용자 체감 개선 (590KB)
- COMMS-01 Resend 이메일 — BOARD-02 Inquiry 답변 인프라
- BOARD-05 신고 큐 — 운영 안전성
- M7-01 Stripe — 결제 활성 (LEGAL-OPS-01 입력 후)

---

_Last updated: 2026-06-05_
_세션 길이: 3일 · 49 commits · M4+M6+LEGAL-OPS-01+Audit+Perf 완료_
