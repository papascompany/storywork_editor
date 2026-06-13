# 공모전 시즌 자동 동결 런북 (BOARD-05)

`apps/web` 의 공모전(ContestSeason) 출품 마감 처리 운영 가이드.

## 개요

공모전 시즌은 `closesAt` 이 지나면 출품을 더 받지 않아야 한다. 이를 위해 2단계 방어선을 둔다.

1. **시간 게이트 (권위적)** — `POST /api/contest/[seasonId]/submit` 가 매 요청마다
   `now < opensAt`(시작 전), `now > closesAt`(마감), `frozen`(동결) 을 검사해 출품을 막는다.
   cron 이 돌지 않아도 출품은 정확히 마감된다.
2. **영속 동결 스냅샷** — `GET /api/cron/freeze-seasons` 가 `closesAt` 경과 + 미동결 시즌을
   `frozen=true` 로 전환한다. 결과 페이지·관리자 화면·감사 로그에서 "마감됨" 상태를
   안정적으로 표시하기 위함이다.

## Cron 등록

- 경로: `apps/web/app/api/cron/freeze-seasons/route.ts`
- 스케줄: `apps/web/vercel.json` → `0 1 * * *` (매일 01:00 UTC = 10:00 KST)
- 인증: `Authorization: Bearer <CRON_SECRET>` (Vercel Cron 이 자동 첨부)

> ⚠️ **CRON_SECRET 필수.** 프로덕션에 미설정 시 모든 cron 요청이 401 로 차단되어
> 동결이 실행되지 않는다. (출품 차단 자체는 시간 게이트가 처리하므로 기능 장애는
> 아니지만, `frozen` 플래그가 갱신되지 않아 표시 상태가 closesAt 기준으로만 도출된다.)
>
> `CRON_SECRET` 은 `hard-delete-users` cron 과 공유한다. Vercel → Project(web) →
> Settings → Environment Variables 에서 설정.

## 동작 검증 (수동 호출)

```bash
# 200 + frozenCount
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  https://storywork-editor-web.vercel.app/api/cron/freeze-seasons

# 401 (토큰 없음/불일치) — 정상 차단 확인
curl -s https://storywork-editor-web.vercel.app/api/cron/freeze-seasons
```

응답 예시:
```json
{ "ok": true, "frozenCount": 1, "failedCount": 0, "results": [ ... ], "at": "..." }
```

## 출품 플로우

1. `/contest/[seasonId]` 의 "출품하기" → `/mypage?tab=projects&contestId=<seasonId>`
2. 마이페이지 "내 작품" 탭이 **출품 모드**로 전환되어 작품별 "이 작품 출품" 버튼 노출
3. 버튼 → `POST /api/contest/[seasonId]/submit { projectId }`
   - 201: `/contest/[seasonId]` 로 이동 (출품작 갤러리에 노출)
   - 409: 이미 출품한 작품 (DB `@@unique([projectId, contestId])` + 앱 레벨 선검사)
   - 403: 마감/시작 전/동결/타인 작품
   - 400: 페이지 0개 작품

## 데이터 모델 (마이그레이션 `20260613100000_contest_season_freeze`)

- `ContestSeason.frozen Boolean @default(false)` + `@@index([frozen, closesAt])`
- `Showcase @@unique([projectId, contestId])` — 동일 프로젝트 같은 공모전 중복 출품 차단
  (contestId NULL 갤러리 행은 Postgres 가 distinct 취급 → 무영향)

## 관리자 수동 제어

긴급 시 Supabase SQL 로 직접 동결/해제 가능:
```sql
-- 동결
UPDATE "ContestSeason" SET "frozen" = true  WHERE id = '<seasonId>';
-- 해제(마감 연장 등)
UPDATE "ContestSeason" SET "frozen" = false, "closesAt" = '<new>' WHERE id = '<seasonId>';
```
