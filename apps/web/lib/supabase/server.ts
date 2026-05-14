/**
 * apps/web/lib/supabase/server.ts
 *
 * @supabase/ssr 기반 서버 사이드 Supabase 클라이언트.
 * Server Component / Route Handler / Server Action 에서 사용.
 * 쿠키를 통한 세션 관리를 위해 next/headers 를 활용한다.
 *
 * 주의: 이 파일은 서버 전용. 클라이언트 컴포넌트에서 import 금지.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createWebServerClient() {
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
