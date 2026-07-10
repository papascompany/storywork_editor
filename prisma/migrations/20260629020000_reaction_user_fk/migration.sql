-- 20260629020000_reaction_user_fk
--
-- FOLLOWUP-68: Reaction.userId 에 User FK(onDelete:Cascade) 추가 — DB 레벨 참조무결성 보장.
--   기존엔 Reaction.userId 가 FK 없는 plain String 이라, User 삭제 경로가 앱레벨 정리를 빠뜨리면
--   고아 Reaction(좋아요 PII)이 silent 로 잔존할 수 있었다.
--
-- ⚠️ FK 추가 전, 이미 없는 User 를 참조하는 고아 Reaction 을 먼저 정리한다(없으면 no-op).
--    이게 없으면 기존 고아 행 때문에 ADD CONSTRAINT 가 실패한다. (빈 DB=CI 에서는 no-op)
DELETE FROM "Reaction" WHERE "userId" NOT IN (SELECT "id" FROM "User");

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
