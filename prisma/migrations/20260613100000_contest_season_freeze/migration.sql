-- 공모전 시즌 자동 동결 + 중복 출품 방지 (BOARD-05)
-- 모두 additive. frozen 기본 false → 기존 시즌 무손실.
-- 출품(Showcase contest mode) 생성 경로가 이번 PR 에서 처음 도입되므로
-- 기존 contest Showcase 데이터가 없어 UNIQUE 추가도 충돌 없음.

-- ── ContestSeason.frozen (출품 동결 스냅샷) ──────────────────────────────────
ALTER TABLE "ContestSeason" ADD COLUMN "frozen" BOOLEAN NOT NULL DEFAULT false;

-- cron 동결 대상 조회용 (미동결 + closesAt 경과)
CREATE INDEX "ContestSeason_frozen_closesAt_idx" ON "ContestSeason"("frozen", "closesAt");

-- ── Showcase 중복 출품 방지 (projectId + contestId) ──────────────────────────
-- contestId NULL(갤러리) 행은 Postgres 가 각 NULL 을 distinct 로 취급 → 갤러리 무영향.
-- 동일 프로젝트를 같은 공모전에 두 번 출품하는 것만 차단.
CREATE UNIQUE INDEX "Showcase_projectId_contestId_key" ON "Showcase"("projectId", "contestId");
