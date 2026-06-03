-- Migration: board_notice_inquiry_comment
-- Generated: 2026-06-03
-- Adds Notice, Inquiry, Comment models + InquiryStatus enum
-- Down: drop tables + enum (expand-contract safe: no column removal from existing tables)

-- 1. New enum
CREATE TYPE "InquiryStatus" AS ENUM ('OPEN', 'REPLIED', 'CLOSED');

-- 2. Notice table
CREATE TABLE "Notice" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notice_publishedAt_isPinned_idx" ON "Notice"("publishedAt", "isPinned");

ALTER TABLE "Notice"
    ADD CONSTRAINT "Notice_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: Notice — anon/authenticated can select published rows; only admin inserts via service role
ALTER TABLE "Notice" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notice select published" ON "Notice"
    FOR SELECT USING ("publishedAt" IS NOT NULL AND "publishedAt" <= NOW());

-- 3. Inquiry table
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'OPEN',
    "adminReply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Inquiry_status_createdAt_idx" ON "Inquiry"("status", "createdAt");
CREATE INDEX "Inquiry_userId_idx" ON "Inquiry"("userId");

ALTER TABLE "Inquiry"
    ADD CONSTRAINT "Inquiry_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS: Inquiry — user sees only own rows; anon cannot select
ALTER TABLE "Inquiry" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inquiry owner select" ON "Inquiry"
    FOR SELECT USING (
        "userId" IS NOT NULL AND
        "userId" = current_setting('request.jwt.claims', true)::json->>'sub'
    );

-- 4. Comment table
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "showcaseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Comment_showcaseId_createdAt_idx" ON "Comment"("showcaseId", "createdAt");

ALTER TABLE "Comment"
    ADD CONSTRAINT "Comment_showcaseId_fkey"
    FOREIGN KEY ("showcaseId") REFERENCES "Showcase"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment"
    ADD CONSTRAINT "Comment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: Comment — all can select; owner can update/delete own non-deleted rows
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comment select all" ON "Comment"
    FOR SELECT USING (true);

CREATE POLICY "Comment owner update" ON "Comment"
    FOR UPDATE USING (
        "userId" = current_setting('request.jwt.claims', true)::json->>'sub'
    );

CREATE POLICY "Comment owner delete" ON "Comment"
    FOR DELETE USING (
        "userId" = current_setting('request.jwt.claims', true)::json->>'sub'
    );
