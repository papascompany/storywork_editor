-- Migration: add_admin_role_totp
-- Generated: 2026-05-07
-- HUMAN GATE: 사용자 승인 후 `pnpm db:migrate` 실행 필요
--   prisma migrate dev --name add_admin_role_totp
--   OR for production: prisma migrate deploy

-- 1. Role enum 에 'support' 추가 (기존: user / creator / curator / superadmin / readonly)
--    prisma 가 enum 을 텍스트로 관리하므로 ALTER TYPE 로 직접 추가
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'support';

-- 2. User 테이블에 TOTP 관련 컬럼 추가
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "totpSecret"   TEXT,
  ADD COLUMN IF NOT EXISTS "totpVerified" BOOLEAN NOT NULL DEFAULT false;

-- 3. 인덱스: admin role 쿼리 최적화
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User" ("role");
