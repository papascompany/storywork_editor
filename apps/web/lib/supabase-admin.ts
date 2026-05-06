/**
 * apps/web/lib/supabase-admin.ts
 *
 * service_role Supabase 클라이언트 — 서버 사이드 전용.
 * RLS 를 우회하므로 절대 클라이언트 컴포넌트에서 import 금지.
 * 클라이언트 번들 포함 방지: 이 파일은 Server Component / Route Handler 전용.
 */

import { createClient } from '@supabase/supabase-js'

function createAdminClient() {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      '[supabase-admin] NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 누락. ' +
        '.env.local 을 확인하세요.',
    )
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      // service_role 은 세션 불필요
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// 싱글턴 (모듈 캐시 — Node.js require 캐시 활용)
let _adminClient: ReturnType<typeof createAdminClient> | null = null

export function getAdminClient() {
  if (!_adminClient) {
    _adminClient = createAdminClient()
  }
  return _adminClient
}
