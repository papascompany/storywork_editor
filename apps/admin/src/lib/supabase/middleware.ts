/**
 * apps/admin/src/lib/supabase/middleware.ts
 *
 * Next.js 미들웨어 내에서 세션 쿠키를 갱신하기 위한 Supabase 클라이언트.
 * @supabase/ssr 권장 패턴: 미들웨어에서 쿠키를 읽고 쓰기 위해
 * NextRequest / NextResponse 를 직접 전달한다.
 */
import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function createMiddlewareClient(request: NextRequest) {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

  if (!supabaseUrl || !anonKey) {
    throw new Error('[supabase/middleware] 환경변수 누락')
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  return { supabase, response }
}
