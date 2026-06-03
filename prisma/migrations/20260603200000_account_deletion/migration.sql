-- Migration: account_deletion (LEGAL-OPS-03)
-- 회원 탈퇴 soft delete + 마케팅 동의 필드 추가
-- Down: 해당 컬럼 DROP + RLS 정책 DROP
-- expand-contract: 컬럼 추가만 (서비스 중단 없음)

-- ─────────────────────────────────────────────
-- 1. User 테이블 컬럼 추가
-- ─────────────────────────────────────────────

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "deletedAt"              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "deletionScheduledFor"   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "deletionReason"         VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "marketingConsent"       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "marketingConsentAt"     TIMESTAMPTZ;

-- ─────────────────────────────────────────────
-- 2. 인덱스
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "User_deletedAt_idx"            ON "User" ("deletedAt");
CREATE INDEX IF NOT EXISTS "User_deletionScheduledFor_idx" ON "User" ("deletionScheduledFor");

-- ─────────────────────────────────────────────
-- 3. RLS 정책
-- ─────────────────────────────────────────────

-- 3-a. 탈퇴(soft-deleted) 사용자는 anon SELECT 에서 제외
--      기존 정책이 있으면 교체 (DROP + CREATE)
DROP POLICY IF EXISTS "anon_cannot_see_deleted_users" ON "User";
CREATE POLICY "anon_cannot_see_deleted_users"
  ON "User"
  FOR SELECT
  TO anon
  USING ("deletedAt" IS NULL);

-- 3-b. 본인만 자기 deletedAt 업데이트 가능 (탈퇴 요청)
--      service_role 우회는 이 정책과 무관
DROP POLICY IF EXISTS "user_can_soft_delete_self" ON "User";
CREATE POLICY "user_can_soft_delete_self"
  ON "User"
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id OR auth.uid()::text = email)   -- cuid/uuid 불일치 보호
  WITH CHECK (true);

-- ─────────────────────────────────────────────
-- Down script (manual rollback):
-- ─────────────────────────────────────────────
-- DROP POLICY IF EXISTS "anon_cannot_see_deleted_users" ON "User";
-- DROP POLICY IF EXISTS "user_can_soft_delete_self" ON "User";
-- DROP INDEX IF EXISTS "User_deletedAt_idx";
-- DROP INDEX IF EXISTS "User_deletionScheduledFor_idx";
-- ALTER TABLE "User"
--   DROP COLUMN IF EXISTS "deletedAt",
--   DROP COLUMN IF EXISTS "deletionScheduledFor",
--   DROP COLUMN IF EXISTS "deletionReason",
--   DROP COLUMN IF EXISTS "marketingConsent",
--   DROP COLUMN IF EXISTS "marketingConsentAt";
