-- 20260629000000_enable_rls
--
-- 목적: public 스키마 전체 테이블에 Row Level Security(RLS)를 활성화한다.
--       (Supabase Security Advisor CRITICAL "RLS Disabled in Public" / "Policy Exists RLS Disabled" 해소)
--
-- 안전성 근거:
--   - 앱의 데이터 접근은 (1) Prisma = 테이블 소유자 role(postgres)로 접속 → RLS 미적용(소유자 우회),
--     (2) service_role 클라이언트(feature-flags, admin auth) → BYPASSRLS. 둘 다 RLS 영향 없음.
--   - PostgREST(공개 anon/authenticated API)만 RLS로 차단된다. 이것이 이번 조치의 목적이다.
--   - 유일한 PostgREST(authenticated) 접근은 web 미들웨어의 User.deletedAt 자기행 조회뿐 →
--     User 에 authenticated 자기행 SELECT 정책 1개만 추가한다. 나머지 테이블은 정책 없음(=전면 차단).
--   - FORCE 미사용: 소유자(Prisma)는 계속 우회한다.
--
-- 환경 무관 실행: CI 순수 Postgres(auth 스키마/authenticated 롤 없음)에서는 정책 생성을 건너뛴다.
-- 멱등: ENABLE RLS 재실행은 no-op, 정책은 DROP IF EXISTS 후 재생성.

ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Format" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Template" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TemplateSet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Character" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Resource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Page" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SceneDoc" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Scene" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Line" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PublishJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Showcase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Reaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ContestSeason" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PrinterProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Notice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Inquiry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CompanyInfo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FeatureFlag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Supabase 환경에서만: User 자기행 SELECT 정책 (web 미들웨어 deletedAt 확인용).
--   - authenticated 세션의 JWT email 과 User.email 이 일치하는 자기 행만 SELECT 허용.
--   - anon 은 정책 없음 → 전면 차단. 소프트삭제/그 외 쓰기는 전부 서버(Prisma)에서 처리하므로 정책 불요.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    -- RLS 비활성 상태에서 만들어졌던(미적용) 기존 임시 정책 정리 후 알려진 안전 정책으로 대체
    DROP POLICY IF EXISTS "anon_cannot_see_deleted_users" ON public."User";
    DROP POLICY IF EXISTS "user_can_soft_delete_self" ON public."User";
    DROP POLICY IF EXISTS "user_select_own_by_email" ON public."User";
    CREATE POLICY "user_select_own_by_email" ON public."User"
      FOR SELECT
      TO authenticated
      USING ((SELECT auth.jwt() ->> 'email') = email);
  END IF;
END
$$;
