-- 20260629000000_harden_functions
--
-- Supabase Security Advisor WARNING 해소:
--   (1) "Function Search Path Mutable" — 함수 search_path 를 고정(불변)으로 설정
--   (2) "Public/Signed-In Users Can Execute SECURITY DEFINER Function" — 트리거 함수 EXECUTE 권한 회수
--
-- 대상: supabase/migrations/20260426000000_init.sql 에서 정의된 트리거 함수 2종.
-- 안전성: 두 함수는 오직 트리거로만 실행된다. 트리거 실행은 함수 EXECUTE 권한과 무관하므로
--         REVOKE 는 앱 동작에 영향이 없다(RPC 로 직접 호출되는 경로도 없음).
--         log_resource_status_change 는 SECURITY DEFINER(소유자 권한 실행)라 AuditLog RLS 와 무관하게 INSERT 된다.

-- (1) update_updated_at_column — SECURITY INVOKER, 테이블 미참조(NEW·now()만) → search_path 고정만.
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;

-- (2) log_resource_status_change — SECURITY DEFINER, AuditLog 참조 →
--     스키마 정규화(public."AuditLog") + search_path='' 로 재정의(주입 방지), 이후 EXECUTE 회수.
CREATE OR REPLACE FUNCTION public.log_resource_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id TEXT;
BEGIN
  -- 서버 액션이 set_config('app.current_user_id', ...) 로 설정한 값 읽기(없으면 'system')
  v_actor_id := COALESCE(current_setting('app.current_user_id', true), 'system');

  IF OLD."status" IS DISTINCT FROM NEW."status" THEN
    INSERT INTO public."AuditLog" ("id", "actorId", "action", "target", "payload", "at")
    VALUES (
      gen_random_uuid()::text,
      v_actor_id,
      'resource.status_changed',
      'resource:' || NEW."id",
      jsonb_build_object('from', OLD."status", 'to', NEW."status", 'kind', NEW."kind"),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- CREATE OR REPLACE 는 PUBLIC EXECUTE 기본권한을 재부여하므로, 재정의 이후에 회수한다.
REVOKE EXECUTE ON FUNCTION public.log_resource_status_change() FROM PUBLIC, anon, authenticated;
