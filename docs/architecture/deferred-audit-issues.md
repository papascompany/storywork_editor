# 추후 개발 점검 이슈 (Deferred Audit Issues)

> 출처: 2026-06-23 전수 감사(AUDIT-FIX-02, 8차원 서브에이전트 오케스트레이션).
> 적대적 검증 17건 확정 중 8건은 즉시 수정 완료, 나머지는 verifier 가 low~medium 으로
> 하향한 항목으로 **추후 점검 이슈**로 분리한다. roadmap.md 의 FOLLOWUP-68/69/70 과 동일.
> 모두 **현재 사용자/데이터/보안에 즉각적 피해 없음** — 견고성·하드닝·심층방어 성격.

---

## FOLLOWUP-68 — Reaction.userId FK 부재 ✅ 완료 (2026-06-29)
- **현상**: `Reaction.userId` 가 User FK 없는 plain String. `prisma/schema.prisma` 에서 Comment.userId 는 정식 `@relation` FK(RESTRICT)인데 Reaction 은 비대칭으로 FK 없음.
- **영향**: DB 레벨 참조무결성 미보장. 현재 회원 영구파기 cron(`/api/cron/hard-delete-users`)이 앱레벨 `reaction.deleteMany({where:{userId}})` 로 방어(AUDIT-FIX-02 #1에서 추가)하므로 즉각 피해는 없음. 다만 **향후 다른 User 삭제 경로(admin 도구·수동 SQL·신규 플로우)가 추가되면** FK가 없어 고아 Reaction(좋아요 PII)이 silent 로 잔존할 수 있음.
- **조치**: schema 에 `user User @relation(fields:[userId], references:[id], onDelete:Cascade)` + User 에 `reactions Reaction[]` 역참조 추가 → 마이그레이션. 🚦 마이그레이션 = 휴먼 게이트.
- **우선순위**: low~medium (예방적 무결성 강화).
- **완료**: 마이그레이션 `20260629020000_reaction_user_fk`(고아 정리 + FK Cascade). prod 적용 대기(SQL Editor/migrate deploy).

## FOLLOWUP-69 — 탈퇴(deletedAt) 차단 심층방어 ✅ 완료 (2026-06-29, `e0496ab`)
- **현상**: soft-deleted(탈퇴 예정) 사용자 차단이 `apps/web/middleware.ts` 단일 레이어. Supabase REST 조회가 네트워크/레이트리밋 장애 시 빈 catch 로 통과(fail-open) → 탈퇴 사용자가 `/mypage`·`/editor`·`/api/projects/*` 에 일시 접근 가능. (AUDIT-FIX-02 #5에서 **로깅은 추가**, fall-open 정책은 유지.)
- **영향**: REST 장애 + 활성 탈퇴 세션 동시 조건이라 상시 악용은 아님. 30일 후 hard-delete cron 이 데이터 영구파기를 별도 보장. 단 차단이 단일 레이어 의존.
- **조치**: 서버 컴포넌트/`/api/projects/*` 핸들러 레이어에 `deletedAt` 재검증 가드 추가(심층방어). 코드 마커: `apps/web/middleware.ts:91` TODO(FOLLOWUP).
- **우선순위**: medium.
- **완료**: `guardDeletedUser` 헬퍼 + projects API 5종·/mypage·`users.ts`(deletedAt) 서버 재검증. CI green.

## FOLLOWUP-70 — 감사 잔여 하드닝 묶음 ✅ 완료 (2026-06-29, `e0496ab`+`950fd75`)
**✅ 6건 전건 적용 완료** (병렬 서브에이전트 분석). #1은 빈 페이지 `{}` 허용 가드로 저장 회귀 차단, #5는 진짜 production 한정 부팅게이트(preview 제외)로 보강. CRON_SECRET Vercel 등록 → 크론 가동.
1. **Page.fabricJson 저장 검증** — `/api/projects/save` 에서 `PageJsonV1Schema.parseAsync` 로 저장 전 검증(현재 읽기측 throw-catch 로 격리됨). 깨진 JSON self-save 방지 + 즉시 400.
2. **admin remotePatterns 호스트 핀** — `apps/admin/next.config.ts` 의 `*.supabase.co` 와일드카드 → 실제 프로젝트 호스트로 고정(오픈프록시/SSRF 표면 축소; dangerouslyAllowSVG 미설정이라 XSS 경로는 없음).
3. **비밀번호 정책 강화** — 현재 8자 최소. 길이 10~12 상향 또는 복잡도(대문자+숫자) 또는 HIBP 노출 차단. (Supabase 자체 rate-limit 존재로 즉시 탈취는 아님.)
4. **report 상태머신 가드** — `apps/admin/app/api/admin/reports/[id]/route.ts` hide/dismiss 가 터미널 상태(resolved/dismissed) report 에도 동작 → report.status 와 대상 hidden 불일치 가능. 터미널 상태면 409. (curator 전용 + UI 로는 도달 불가.)
5. **env.ts CRON_SECRET 배선** — `apps/web/src/env.ts` 에 CRON_SECRET 스키마 추가 + 서버 부트 경로(instrumentation 등)에서 import 해 미설정 시 부팅 throw. (현재 cron 핸들러가 런타임 401 로 방어.)
6. **CSS anti-pattern 체커 단순화** — `scripts/check-css-anti-patterns.sh` 의 @layer depth 추적을 단일 in_layer 불리언으로 리라이트(거짓음성 위험 축소; 현재 CI 가시 실패라 사일런트 아님).

---

_갱신: 2026-06-29 · 감사 후속 전건 완료 — FOLLOWUP-68(Reaction FK, `20260629020000`)·69·70 + SEC-RLS-01. **미완 없음** (FOLLOWUP-68 은 prod 적용만 대기). 이전: 2026-06-23._
