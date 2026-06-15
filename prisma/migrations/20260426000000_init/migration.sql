-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'creator', 'curator', 'support', 'superadmin', 'readonly');

-- CreateEnum
CREATE TYPE "ResourceKind" AS ENUM ('pose', 'background', 'mise_en_scene', 'prop', 'speech_bubble', 'word_fx', 'decoration');

-- CreateEnum
CREATE TYPE "ResourceFormat" AS ENUM ('png', 'svg', 'webp');

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('system', 'creator');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('draft', 'review', 'published', 'rejected');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('drafting', 'composing', 'editing', 'publishing', 'archived');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed');

-- CreateEnum
CREATE TYPE "ShowcaseMode" AS ENUM ('contest', 'gallery');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('OPEN', 'REPLIED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('showcase', 'comment');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('spam', 'abuse', 'sexual', 'violence', 'copyright', 'etc');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "stripeId" TEXT,
    "name" VARCHAR(80),
    "avatarUrl" VARCHAR(500),
    "totpSecret" TEXT,
    "totpVerified" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletionScheduledFor" TIMESTAMP(3),
    "deletionReason" VARCHAR(200),
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "marketingConsentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "uploadQuotaMb" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Format" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "widthMm" DOUBLE PRECISION NOT NULL,
    "heightMm" DOUBLE PRECISION NOT NULL,
    "dpi" INTEGER NOT NULL DEFAULT 300,
    "bleedMm" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "safeMm" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "gridDef" JSONB,
    "coverEnabled" BOOLEAN NOT NULL DEFAULT false,
    "coverWidthMm" DOUBLE PRECISION,
    "coverHeightMm" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Format_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "formatId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "thumbnail" TEXT,
    "fabricJson" JSONB NOT NULL,
    "slots" JSONB NOT NULL,
    "setId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coverIdx" INTEGER NOT NULL DEFAULT 0,
    "coverEnabled" BOOLEAN,
    "coverWidthMm" DOUBLE PRECISION,
    "coverHeightMm" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "ownerType" "OwnerType" NOT NULL,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "bodyType" TEXT NOT NULL,
    "styleTag" TEXT,
    "thumbnail" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "kind" "ResourceKind" NOT NULL,
    "format" "ResourceFormat" NOT NULL DEFAULT 'png',
    "ownerType" "OwnerType" NOT NULL,
    "ownerId" TEXT,
    "fileUrl" TEXT NOT NULL,
    "thumbUrl" TEXT,
    "variants" JSONB,
    "width" INTEGER,
    "height" INTEGER,
    "masterDpi" INTEGER,
    "lowDpi" BOOLEAN NOT NULL DEFAULT false,
    "tintMaskUrl" TEXT,
    "meta" JSONB NOT NULL,
    "tags" TEXT[],
    "tagsBootstrap" TEXT[],
    "license" JSONB NOT NULL,
    "licenseSource" TEXT NOT NULL,
    "characterId" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'draft',
    "reviewer" TEXT,
    "reviewNote" TEXT,
    "embedding" vector(1024),
    "embeddingText" vector(1024),
    "embeddingVis" vector(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "formatId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'drafting',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "templateId" TEXT,
    "fabricJson" JSONB NOT NULL,
    "thumbnail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneDoc" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scriptRaw" TEXT NOT NULL,
    "meta" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SceneDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "sceneDocId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "emotion" TEXT,
    "view" TEXT,
    "pageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Line" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "speaker" TEXT,
    "text" TEXT NOT NULL,
    "bubbleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "pdfUrl" TEXT,
    "spec" JSONB NOT NULL,
    "preflight" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Showcase" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "mode" "ShowcaseMode" NOT NULL,
    "contestId" TEXT,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Showcase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "showcaseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestSeason" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "resultsAt" TIMESTAMP(3),
    "rules" TEXT NOT NULL,
    "frozen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrinterProfile" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "formats" TEXT[],
    "bleedMinMm" DOUBLE PRECISION NOT NULL,
    "bleedMaxMm" DOUBLE PRECISION NOT NULL,
    "safeMinMm" DOUBLE PRECISION NOT NULL,
    "imageDpiMinPose" DOUBLE PRECISION NOT NULL,
    "imageDpiMinBg" DOUBLE PRECISION NOT NULL,
    "fontEmbedRequired" BOOLEAN NOT NULL DEFAULT true,
    "colorSpaces" TEXT[],
    "maxPages" INTEGER,
    "customWarnings" TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "PrinterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "detail" TEXT,
    "reporterId" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'pending',
    "resolution" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyInfo" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT '',
    "ceoName" TEXT NOT NULL DEFAULT '',
    "businessRegistrationNo" TEXT,
    "mailOrderBusinessNo" TEXT,
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "faxNo" TEXT,
    "privacyOfficerName" TEXT,
    "privacyOfficerEmail" TEXT,
    "customerServiceHours" TEXT,
    "hostingProvider" TEXT NOT NULL DEFAULT 'Vercel · Supabase',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeId_key" ON "User"("stripeId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "User_deletionScheduledFor_idx" ON "User"("deletionScheduledFor");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Format_name_key" ON "Format"("name");

-- CreateIndex
CREATE INDEX "Template_formatId_idx" ON "Template"("formatId");

-- CreateIndex
CREATE INDEX "Template_setId_idx" ON "Template"("setId");

-- CreateIndex
CREATE INDEX "Character_ownerType_ownerId_idx" ON "Character"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "Character_status_idx" ON "Character"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_slug_key" ON "Resource"("slug");

-- CreateIndex
CREATE INDEX "Resource_kind_status_idx" ON "Resource"("kind", "status");

-- CreateIndex
CREATE INDEX "Resource_kind_format_status_idx" ON "Resource"("kind", "format", "status");

-- CreateIndex
CREATE INDEX "Resource_kind_lowDpi_status_idx" ON "Resource"("kind", "lowDpi", "status");

-- CreateIndex
CREATE INDEX "Resource_ownerType_ownerId_idx" ON "Resource"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "Resource_characterId_idx" ON "Resource"("characterId");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "Project_ownerId_status_idx" ON "Project"("ownerId", "status");

-- CreateIndex
CREATE INDEX "Page_projectId_idx" ON "Page"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Page_projectId_index_key" ON "Page"("projectId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "SceneDoc_projectId_key" ON "SceneDoc"("projectId");

-- CreateIndex
CREATE INDEX "Scene_sceneDocId_idx" ON "Scene"("sceneDocId");

-- CreateIndex
CREATE UNIQUE INDEX "Scene_sceneDocId_index_key" ON "Scene"("sceneDocId", "index");

-- CreateIndex
CREATE INDEX "Line_sceneId_idx" ON "Line"("sceneId");

-- CreateIndex
CREATE UNIQUE INDEX "Line_sceneId_index_key" ON "Line"("sceneId", "index");

-- CreateIndex
CREATE INDEX "PublishJob_projectId_idx" ON "PublishJob"("projectId");

-- CreateIndex
CREATE INDEX "PublishJob_status_idx" ON "PublishJob"("status");

-- CreateIndex
CREATE INDEX "Showcase_ownerId_idx" ON "Showcase"("ownerId");

-- CreateIndex
CREATE INDEX "Showcase_mode_contestId_idx" ON "Showcase"("mode", "contestId");

-- CreateIndex
CREATE INDEX "Showcase_hidden_idx" ON "Showcase"("hidden");

-- CreateIndex
CREATE UNIQUE INDEX "Showcase_projectId_contestId_key" ON "Showcase"("projectId", "contestId");

-- CreateIndex
CREATE INDEX "Reaction_showcaseId_idx" ON "Reaction"("showcaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_showcaseId_userId_kind_key" ON "Reaction"("showcaseId", "userId", "kind");

-- CreateIndex
CREATE INDEX "ContestSeason_frozen_closesAt_idx" ON "ContestSeason"("frozen", "closesAt");

-- CreateIndex
CREATE UNIQUE INDEX "PrinterProfile_slug_key" ON "PrinterProfile"("slug");

-- CreateIndex
CREATE INDEX "PrinterProfile_isActive_idx" ON "PrinterProfile"("isActive");

-- CreateIndex
CREATE INDEX "PrinterProfile_slug_idx" ON "PrinterProfile"("slug");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_target_idx" ON "AuditLog"("target");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at");

-- CreateIndex
CREATE INDEX "Notice_publishedAt_isPinned_idx" ON "Notice"("publishedAt", "isPinned");

-- CreateIndex
CREATE INDEX "Inquiry_status_createdAt_idx" ON "Inquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Inquiry_userId_idx" ON "Inquiry"("userId");

-- CreateIndex
CREATE INDEX "Comment_showcaseId_createdAt_idx" ON "Comment"("showcaseId", "createdAt");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_targetType_targetId_reporterId_key" ON "Report"("targetType", "targetId", "reporterId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_formatId_fkey" FOREIGN KEY ("formatId") REFERENCES "Format"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_setId_fkey" FOREIGN KEY ("setId") REFERENCES "TemplateSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_formatId_fkey" FOREIGN KEY ("formatId") REFERENCES "Format"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneDoc" ADD CONSTRAINT "SceneDoc_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_sceneDocId_fkey" FOREIGN KEY ("sceneDocId") REFERENCES "SceneDoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Line" ADD CONSTRAINT "Line_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishJob" ADD CONSTRAINT "PublishJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Showcase" ADD CONSTRAINT "Showcase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Showcase" ADD CONSTRAINT "Showcase_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Showcase" ADD CONSTRAINT "Showcase_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "ContestSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "Showcase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrinterProfile" ADD CONSTRAINT "PrinterProfile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "Showcase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyInfo" ADD CONSTRAINT "CompanyInfo_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

