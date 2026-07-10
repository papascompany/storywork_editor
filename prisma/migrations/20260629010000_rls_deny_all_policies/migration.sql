-- 20260629010000_rls_deny_all_policies
--
-- 목적: RLS 활성이지만 정책이 없던 '서버 전용' 테이블 9종에 명시적 deny-all 정책을 부여한다.
--       (Supabase Security Advisor INFO "RLS Enabled No Policy" 해소 + 차단 의도 명시)
--       2026-06-29 prod(SQL Editor)에 수동 적용한 내용을 리포/마이그레이션 이력으로 기록(드리프트 해소).
--
-- 동작: no-policy 와 동일 — PostgREST(anon/authenticated) 전면 차단.
--       Prisma(테이블 소유자)·service_role(BYPASSRLS)는 정책과 무관하게 계속 접근(FeatureFlag 데모 토글 정상).
-- 환경 무관: authenticated 롤 없는 CI 순수 Postgres 에서는 skip. 멱등(DROP IF EXISTS 후 CREATE).

DO $$
DECLARE
  t TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    FOREACH t IN ARRAY ARRAY[
      'CompanyInfo', 'ContestSeason', 'FeatureFlag', 'Format',
      'PrinterProfile', 'Report', 'Template', 'TemplateSet', '_prisma_migrations'
    ]
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS "deny_all_public_api" ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY "deny_all_public_api" ON public.%I
           FOR ALL TO anon, authenticated
           USING (false) WITH CHECK (false)', t);
    END LOOP;
  END IF;
END
$$;
