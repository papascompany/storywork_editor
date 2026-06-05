-- CreateTable
-- CompanyInfo 싱글톤 — 회사 정보 / 사업자 정보 (LEGAL-OPS-01)
-- 고정 id 'company-info-singleton' 으로 1건만 유지

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

-- AddForeignKey
ALTER TABLE "CompanyInfo" ADD CONSTRAINT "CompanyInfo_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: 빈 placeholder 싱글톤 1건
INSERT INTO "CompanyInfo" (
    "id", "companyName", "ceoName", "address", "phone", "email",
    "hostingProvider", "isPublished", "updatedAt"
) VALUES (
    'company-info-singleton', '(준비 중)', '', '', '', '',
    'Vercel · Supabase', false, NOW()
) ON CONFLICT ("id") DO NOTHING;
