-- M4-00 Character RLS 정책
-- 롤백: ALTER TABLE "Character" DISABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS ...

-- RLS: Character
-- - status='published' 인 캐릭터는 anon/authenticated 모두 SELECT 가능
-- - creator 본인 캐릭터는 본인이 SELECT/UPDATE/DELETE 가능
-- - system 캐릭터는 관리자(service role)만 INSERT/UPDATE/DELETE 가능

ALTER TABLE "Character" ENABLE ROW LEVEL SECURITY;

-- 공개 published 캐릭터 조회 (anon 포함)
CREATE POLICY "Character select published"
  ON "Character"
  FOR SELECT
  USING ("status" = 'published');

-- creator 본인 캐릭터 조회 (draft 포함)
CREATE POLICY "Character creator select own"
  ON "Character"
  FOR SELECT
  USING (
    "ownerType" = 'creator' AND
    "ownerId" = current_setting('request.jwt.claims', true)::json->>'sub'
  );

-- creator 본인 캐릭터 수정
CREATE POLICY "Character creator update own"
  ON "Character"
  FOR UPDATE
  USING (
    "ownerType" = 'creator' AND
    "ownerId" = current_setting('request.jwt.claims', true)::json->>'sub'
  );

-- creator 본인 캐릭터 삭제
CREATE POLICY "Character creator delete own"
  ON "Character"
  FOR DELETE
  USING (
    "ownerType" = 'creator' AND
    "ownerId" = current_setting('request.jwt.claims', true)::json->>'sub'
  );
