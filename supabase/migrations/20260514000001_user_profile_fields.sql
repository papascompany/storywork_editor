-- Migration: user_profile_fields
-- 목적: User 테이블에 name, avatarUrl 컬럼 추가 (프로필 이름 수정 활성화)
-- 전략: ADD COLUMN IF NOT EXISTS (idempotent) — 기존 row 영향 없음
-- 작성: 2026-05-14

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "name"      VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "avatarUrl" VARCHAR(500);

-- 인덱스 불필요 (이름 검색은 현재 요구사항 외)
-- RLS: 기존 "User" 테이블 정책 그대로 상속 (owner 기준 update 허용)

COMMENT ON COLUMN "User"."name"      IS '표시 이름 (최대 80자). null 이면 이메일 앞부분 사용';
COMMENT ON COLUMN "User"."avatarUrl" IS '아바타 이미지 URL (외부 URL 허용). null 이면 이니셜 fallback';
