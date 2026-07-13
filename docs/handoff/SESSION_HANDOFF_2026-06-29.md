# 세션 핸드오프 — 2026-06-29

> 이전: [SESSION_HANDOFF_2026-06-23.md](SESSION_HANDOFF_2026-06-23.md)
> 이번 세션 = 그랜트 사업계획서 + Supabase 보안점검 대응 + 감사후속 FOLLOWUP-68/69/70 전건 + 크론 정상화 + DB 비번 회전.

## 0. 한 줄 상태 (main `2913bf0` = origin · 워킹트리 clean · 커밋 8건 전부 CI green · web/admin prod 라이브)

정본: `/Users/yohan/Developer/claude/storywork`. 시작 시 `git pull` → `pnpm install` → `pnpm typecheck && pnpm lint && pnpm test`(디스크 여유 확인 후). **병렬 빌드 금지**(디스크 보호) — 검증은 단일 순차(`turbo --concurrency=1`) 또는 CI 권위.

---

## 1. 이번 세션 완료 (커밋)
- **보안/Advisor**: public 전체 RLS 활성화 `ff7a6fb` · deny-all 9종 `9b7771e` · 함수 하드닝(search_path·EXECUTE) `674f0fc` → Supabase advisor **Errors 0·Info 0**.
- **감사 후속(전건 코드완료)**: FOLLOWUP-69 탈퇴 심층방어 + FOLLOWUP-70 하드닝 6건 `e0496ab`+`950fd75`(70-5 CRON_SECRET) · FOLLOWUP-68 Reaction FK `957ed17` · 문서 체크박스 `2563d31`. **7건 병렬 서브에이전트 오케스트레이션 → 회귀 2건(빈 페이지 저장·preview 부팅) 사전 차단**.
- **크론 정상화**: CRON_SECRET Vercel(prod/preview/dev) 등록 + env 필수화·부팅검증 배선(`950fd75`, preview 제외 게이트) → `hard-delete-users`·`freeze-seasons` **가동 시작**.
- **그랜트(별도)**: 서식2 hwpx 재프레이밍+교육/마켓 BM+수익 시뮬+표 페이지넘김 수정 → 대표님 **제출 완료**.

## 2. 운영 이벤트 · 주의
- **prod DB 비밀번호 회전 완료** — perf 조사 중 `.env.local` 값이 세션 로그 노출 → 회전. 로컬3+Vercel(web/admin)+재배포, **prod 라이브 DB 쿼리 200 검증**. 런북 [db-password-rotation.md](../runbooks/db-password-rotation.md)(`2913bf0`). 옛 비번 무효.
  - ⚠️ Vercel `env ls`의 "생성일" 표시는 값 수정해도 그대로(69d) — 갱신 확인은 **라이브 DB 쿼리로**(env 타임스탬프로 오판 금지).
- **크론 활성화 부작용**: **매일 03:00 KST hard-delete** 첫 실행 시 30일 경과 탈퇴자 누적분 영구파기(정책상 정상). Vercel→Logs 확인 권장.

## 3. 미진행 · 보류 (다음 큐)

### 🔴 대표님 액션 필요 (근시일)
- **FOLLOWUP-68 prod 적용** — 마이그레이션 `20260629020000_reaction_user_fk`(고아정리→FK Cascade)를 prod에 반영. **권장: `prisma migrate deploy`**(prod DATABASE_URL로) — RLS 수동적용분(`20260629000000_enable_rls`·`010000_deny_all`) 미기록 드리프트까지 함께 정리·기록됨. SQL Editor 1회 대안 가능(비멱등 ADD CONSTRAINT 주의, 이후 `migrate resolve --applied` 필요).
- **PERF-ADMIN-03** — admin 콘솔 계정 필요(비번은 어시가 못 다룸). `PERF_ADMIN_EMAIL/PASSWORD` env로 `pnpm perf:admin:save-auth --env prod` + `pnpm perf:admin:prod` 실행 → 결과 공유 시 어시가 P75 분석·개선안. (TOTP 2FA 제거돼 로그인 블로커 아님)
- **Inngest 워커 DB 비번** — 회전 후속 미확인. `apps/workers`가 별도 DB 비번 쓰면 갱신 필요(대개 Storage service key라 영향 없을 가능성).

### 🟡 선행조건/휴먼게이트 대기
- **FOLLOWUP-60** PostHog/Sentry — 법무(쿠키 동의) 선행
- **AI-ACT-01~04**(그랜트 STEP1, roadmap SW-BIZ) — 실 임베딩·라이브 LLM 🚦 외부 API키. 키 불요분(AI-ACT-02 태깅·골든셋, AI-ACT-04 자동배치 채택률 측정체계)은 착수 가능
- **사업화 후반** M7 결제(Stripe)·EDU-01~04·MARKET-01~04 — 🚦 결제·정산·마이그레이션
- **Leaked Password Protection** — Supabase **Pro 전용**이라 Free에서 보류(advisor Warning 1 잔존). 대안: 앱레벨 HIBP 무료 구현(반나절)
- **TOTP 2FA 제품결정** — 잔재 컬럼/코드 정리 대기

## 4. 환경/함정 노트
- **Supabase MCP는 storywork prod(`wjpyeqckuxyfeytuzgon`, 계정 thestorige@gmail.com)에 권한 없음** → DB 변경은 SQL/마이그레이션 파일 커밋 + 대표님이 SQL Editor/migrate deploy로 적용. (메모리 `supabase-prod-mcp-access`)
- **마이그레이션 이원화**: 앱 스키마=`prisma/migrations/`, RLS·트리거 함수=`supabase/migrations/`. prisma migrate deploy는 트리거 함수 미생성 → fresh 배포 시 누락 위험.
- **디스크**: 98%+ 시 `node_modules/.bin` 손상 → 병렬 pnpm 금지, 단일 순차. 현재 여유 있음. (메모리 `env-disk-bin-corruption`)
- **커밋**: subject 소문자/한글 시작(commitlint), body ≤100자/줄. push 시 Vercel prod 자동배포(turbo-ignore 스킵=CANCELED 정상). Vercel build는 CI와 무관하게 배포됨(런타임 회귀는 사전 차단 필요).
- **CI**: `migrate baseline smoke`(빈 DB migrate deploy+drift) + `Lint/Typecheck/Test/Build`. 둘 다 green 확인.

## 5. 재개 체크리스트
1. `git pull` (2913bf0 동기 확인) → `pnpm install`.
2. 우선순위: **FOLLOWUP-68 prod 적용** → **PERF-ADMIN-03**(creds) → AI-ACT-02/04.
3. DB/마이그레이션·결제·외부키는 휴먼게이트 — 승인 후.
4. UI 작업은 `/ui-spec`→동의→구현→`/visual-check`→`/ci-watch` SOP.

_갱신: 2026-06-29 · 감사 후속 백로그 코드상 0 · 보안점검 대응·크론 정상화·DB 회전 완료. 남은 근시일 = FOLLOWUP-68 prod 반영 + PERF-ADMIN-03 측정._
