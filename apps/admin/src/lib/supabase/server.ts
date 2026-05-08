/**
 * apps/admin/src/lib/supabase/server.ts
 *
 * @supabase/ssr 기반 서버 사이드 Supabase 클라이언트.
 * Server Component / Route Handler / Server Action 에서 사용.
 * 쿠키를 통한 세션 관리를 위해 next/headers 를 활용한다.
 *
 * 주의: 이 파일은 서버 전용. 클라이언트 컴포넌트에서 import 금지.
 */
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createAdminServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL'] as string,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] as string,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server Component 에서 쿠키 설정 시 무시 (미들웨어가 처리)
          }
        },
      },
    },
  )
}

/**
 * Service Role 클라이언트 — RLS 우회, 서버 전용.
 * User TOTP 컬럼 조작, 역할 확인 등에 사용.
 * 절대 클라이언트 컴포넌트에서 import 금지.
 */
export function createAdminServiceClient() {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      '[supabase/service] NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 누락',
    )
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
