/**
 * apps/admin/src/lib/supabase/client.ts
 *
 * 클라이언트 사이드 Supabase 클라이언트 (브라우저).
 * 로그인 폼 등 'use client' 컴포넌트에서 사용.
 * ANON key 만 사용 — service role key 절대 금지.
 */
'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createAdminBrowserClient() {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      '[supabase/client] 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY',
    )
  }

  return createBrowserClient(supabaseUrl, anonKey)
}
