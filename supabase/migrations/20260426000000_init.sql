-- StoryWork — Init Migration v1
-- 생성: prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
-- 추가: pgvector 활성화, RLS 정책, ivfflat 인덱스, updated_at 트리거, audit 트리거 placeholder
-- ──────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- 1. Extensions
-- ─────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions;

-- ─────────────────────────────────────────────
-- 2. Prisma 생성 DDL (from migrate diff)
-- ─────────────────────────────────────────────

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'creator', 'curator', 'superadmin', 'readonly');

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

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "stripeId" TEXT,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateSet_pkey" PRIMARY KEY ("id")
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestSeason_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeId_key" ON "User"("stripeId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Format_name_key" ON "Format"("name");

-- CreateIndex
CREATE INDEX "Template_formatId_idx" ON "Template"("formatId");

-- CreateIndex
CREATE INDEX "Template_setId_idx" ON "Template"("setId");

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
CREATE INDEX "Reaction_showcaseId_idx" ON "Reaction"("showcaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_showcaseId_userId_kind_key" ON "Reaction"("showcaseId", "userId", "kind");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_target_idx" ON "AuditLog"("target");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_formatId_fkey" FOREIGN KEY ("formatId") REFERENCES "Format"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_setId_fkey" FOREIGN KEY ("setId") REFERENCES "TemplateSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- ─────────────────────────────────────────────
-- 3. pgvector ivfflat 인덱스 (코사인 유사도 검색용)
-- 데이터 적재 후 VACUUM ANALYZE 권장
-- ─────────────────────────────────────────────

-- 결합 임베딩 — 기본 시맨틱 검색
CREATE INDEX IF NOT EXISTS "Resource_embedding_ivfflat_idx"
  ON "Resource" USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 텍스트(태그) 임베딩
CREATE INDEX IF NOT EXISTS "Resource_embeddingText_ivfflat_idx"
  ON "Resource" USING ivfflat ("embeddingText" vector_cosine_ops)
  WITH (lists = 100);

-- 시각(이미지) 임베딩
CREATE INDEX IF NOT EXISTS "Resource_embeddingVis_ivfflat_idx"
  ON "Resource" USING ivfflat ("embeddingVis" vector_cosine_ops)
  WITH (lists = 100);

-- ─────────────────────────────────────────────
-- 4. updated_at 자동 갱신 트리거
-- Prisma @updatedAt 이 코드 레벨에서 처리하지만 DB 레벨 이중 보호
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거를 적용할 테이블 목록
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'User', 'Subscription', 'Format', 'Template', 'TemplateSet',
    'Resource', 'Project', 'Page', 'SceneDoc', 'Scene', 'Line',
    'PublishJob', 'Showcase', 'ContestSeason'
  ])
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER trigger_updated_at_%s
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      lower(t), t
    );
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────
-- 5. AuditLog 자동 트리거 placeholder
-- Resource 상태 변경(status) 시 감사 로그 자동 삽입
-- 실제 actorId 는 서버 액션에서 현재 사용자 ID 를 set_config 로 전달
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_resource_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id TEXT;
BEGIN
  -- 서버 액션이 set_config('app.current_user_id', ...) 로 설정한 값 읽기
  -- 없으면 'system' 으로 폴백
  v_actor_id := COALESCE(
    current_setting('app.current_user_id', true),
    'system'
  );

  -- status 변경 시에만 기록
  IF OLD."status" IS DISTINCT FROM NEW."status" THEN
    INSERT INTO "AuditLog" ("id", "actorId", "action", "target", "payload", "at")
    VALUES (
      gen_random_uuid()::text,
      v_actor_id,
      'resource.status_changed',
      'resource:' || NEW."id",
      jsonb_build_object(
        'from', OLD."status",
        'to', NEW."status",
        'kind', NEW."kind"
      ),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_audit_resource_status
  AFTER UPDATE ON "Resource"
  FOR EACH ROW
  EXECUTE FUNCTION log_resource_status_change();

-- ─────────────────────────────────────────────
-- 6. RLS (Row Level Security) 정책 (erd.md §3 베이스라인)
-- ─────────────────────────────────────────────

-- RLS 활성화
ALTER TABLE "Project"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Page"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SceneDoc"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Scene"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Line"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublishJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Resource"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Showcase"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reaction"   ENABLE ROW LEVEL SECURITY;

-- ───── 6-1. Project: 본인만 read/write ─────
-- 의도: 사용자는 자신의 작품만 접근할 수 있다.
CREATE POLICY "project_owner_all"
  ON "Project"
  FOR ALL
  USING (auth.uid()::text = "ownerId")
  WITH CHECK (auth.uid()::text = "ownerId");

-- ───── 6-2. Page: Project 오너만 접근 ─────
-- 의도: Page는 Project에 종속되며, Project 오너만 접근한다.
CREATE POLICY "page_owner_all"
  ON "Page"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Project"
      WHERE "Project"."id" = "Page"."projectId"
        AND "Project"."ownerId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Project"
      WHERE "Project"."id" = "Page"."projectId"
        AND "Project"."ownerId" = auth.uid()::text
    )
  );

-- ───── 6-3. SceneDoc/Scene/Line: Project 오너만 접근 ─────
-- 의도: AI 분석 결과는 해당 Project 오너만 열람·수정한다.
CREATE POLICY "scenedoc_owner_all"
  ON "SceneDoc"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Project"
      WHERE "Project"."id" = "SceneDoc"."projectId"
        AND "Project"."ownerId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Project"
      WHERE "Project"."id" = "SceneDoc"."projectId"
        AND "Project"."ownerId" = auth.uid()::text
    )
  );

CREATE POLICY "scene_owner_all"
  ON "Scene"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "SceneDoc"
      JOIN "Project" ON "Project"."id" = "SceneDoc"."projectId"
      WHERE "SceneDoc"."id" = "Scene"."sceneDocId"
        AND "Project"."ownerId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "SceneDoc"
      JOIN "Project" ON "Project"."id" = "SceneDoc"."projectId"
      WHERE "SceneDoc"."id" = "Scene"."sceneDocId"
        AND "Project"."ownerId" = auth.uid()::text
    )
  );

CREATE POLICY "line_owner_all"
  ON "Line"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Scene"
      JOIN "SceneDoc" ON "SceneDoc"."id" = "Scene"."sceneDocId"
      JOIN "Project" ON "Project"."id" = "SceneDoc"."projectId"
      WHERE "Scene"."id" = "Line"."sceneId"
        AND "Project"."ownerId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Scene"
      JOIN "SceneDoc" ON "SceneDoc"."id" = "Scene"."sceneDocId"
      JOIN "Project" ON "Project"."id" = "SceneDoc"."projectId"
      WHERE "Scene"."id" = "Line"."sceneId"
        AND "Project"."ownerId" = auth.uid()::text
    )
  );

-- ───── 6-4. PublishJob: Project 오너만 접근 ─────
-- 의도: 출판 잡은 작품 오너만 생성·열람한다.
CREATE POLICY "publishjob_owner_all"
  ON "PublishJob"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Project"
      WHERE "Project"."id" = "PublishJob"."projectId"
        AND "Project"."ownerId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Project"
      WHERE "Project"."id" = "PublishJob"."projectId"
        AND "Project"."ownerId" = auth.uid()::text
    )
  );

-- ───── 6-5. Resource: 공개/비공개 정책 ─────
-- 의도: system+published 는 모두 read. creator+published 는 향후 share 토글.
--       draft/review 는 작가만.

-- system 리소스 중 published 는 모든 인증 사용자가 읽기 가능
CREATE POLICY "resource_system_published_read"
  ON "Resource"
  FOR SELECT
  USING (
    "ownerType" = 'system'
    AND "status" = 'published'
  );

-- creator 리소스 중 published 는 오너 본인이 읽기 가능 (향후 share=true 확장)
CREATE POLICY "resource_creator_published_read"
  ON "Resource"
  FOR SELECT
  USING (
    "ownerType" = 'creator'
    AND "status" = 'published'
    AND "ownerId" = auth.uid()::text
  );

-- creator 리소스 draft/review 는 작가 본인만 모든 작업 가능
CREATE POLICY "resource_creator_own_all"
  ON "Resource"
  FOR ALL
  USING (
    "ownerType" = 'creator'
    AND "ownerId" = auth.uid()::text
  )
  WITH CHECK (
    "ownerType" = 'creator'
    AND "ownerId" = auth.uid()::text
  );

-- ───── 6-6. Subscription: 본인만 read, 쓰기는 service role (웹훅) ─────
-- 의도: 구독 정보는 본인만 열람. 변경은 Stripe 웹훅(service role)만.
CREATE POLICY "subscription_owner_read"
  ON "Subscription"
  FOR SELECT
  USING ("userId" = auth.uid()::text);

-- 쓰기는 RLS 통과 불가 (service role bypass 로만 가능)
-- service role 은 RLS 를 우회하므로 별도 정책 불필요

-- ───── 6-7. AuditLog: superadmin 만 read, write 는 트리거/service role ─────
-- 의도: 감사 로그는 superadmin 만 열람. 일반 사용자 쓰기 불가.
CREATE POLICY "auditlog_superadmin_read"
  ON "AuditLog"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User"."id" = auth.uid()::text
        AND "User"."role" = 'superadmin'
    )
  );

-- ───── 6-8. Showcase: 공개 read, 오너만 write ─────
-- 의도: 쇼케이스는 인증 여부 무관 read. 생성/수정은 오너만.
CREATE POLICY "showcase_public_read"
  ON "Showcase"
  FOR SELECT
  USING (true); -- 공개 갤러리

CREATE POLICY "showcase_owner_write"
  ON "Showcase"
  FOR ALL
  USING ("ownerId" = auth.uid()::text)
  WITH CHECK ("ownerId" = auth.uid()::text);

-- ───── 6-9. Reaction: 인증 사용자 read, 본인 write ─────
-- 의도: 리액션은 모든 인증 사용자가 열람. 본인 리액션만 삽입/삭제.
CREATE POLICY "reaction_read_all"
  ON "Reaction"
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "reaction_owner_write"
  ON "Reaction"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);
