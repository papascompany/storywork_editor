-- 신고 큐 (BOARD-07) — Report 모델 + 3 enum + Showcase.hidden
-- 모두 additive. 기존 데이터 무손실 (hidden 기본 false).

-- ── enum ──────────────────────────────────────────────────────────────────
CREATE TYPE "ReportTargetType" AS ENUM ('showcase', 'comment');
CREATE TYPE "ReportReason" AS ENUM ('spam', 'abuse', 'sexual', 'violence', 'copyright', 'etc');
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed');

-- ── Showcase.hidden (신고 처리=숨김) ──────────────────────────────────────
ALTER TABLE "Showcase" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Showcase_hidden_idx" ON "Showcase"("hidden");

-- ── Report ────────────────────────────────────────────────────────────────
CREATE TABLE "Report" (
    "id"         TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId"   TEXT NOT NULL,
    "reason"     "ReportReason" NOT NULL,
    "detail"     TEXT,
    "reporterId" TEXT,
    "status"     "ReportStatus" NOT NULL DEFAULT 'pending',
    "resolution" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- 같은 사용자가 같은 대상 중복 신고 방지 (멱등)
CREATE UNIQUE INDEX "Report_targetType_targetId_reporterId_key"
  ON "Report"("targetType", "targetId", "reporterId");
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
