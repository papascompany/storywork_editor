-- 런타임 기능 플래그 (admin 토글) — demoMode 등 (옵션B 데모 모드)
-- additive. 읽기는 web 서버(service-role/Prisma)만 — RLS ENABLE + 정책 없음으로
-- anon/authenticated 의 PostgREST 직접 접근을 차단(service-role/owner 만 우회).

CREATE TABLE "FeatureFlag" (
    "key"         TEXT NOT NULL,
    "enabled"     BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("key")
);

-- RLS: 정책 없이 ENABLE → anon/authenticated 직접 접근 전면 차단.
-- 앱 서버는 service-role 또는 Prisma(owner 연결)로 접근하므로 RLS 우회.
-- (role 비참조 구문이라 plain postgres 의 migrate-smoke CI 에서도 안전)
ALTER TABLE "FeatureFlag" ENABLE ROW LEVEL SECURITY;
