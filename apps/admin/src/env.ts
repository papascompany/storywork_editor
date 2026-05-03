import { z } from 'zod'

// ─────────────────────────────────────────────
// apps/admin 환경변수 검증
// 관리자 콘솔 — 별도 도메인, Service Role 필수, 2FA JWT
// ─────────────────────────────────────────────

const serverSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .startsWith('postgresql://', 'DATABASE_URL must be a postgresql:// URL'),
  DIRECT_URL: z
    .string()
    .url()
    .startsWith('postgresql://', 'DIRECT_URL must be a postgresql:// URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key가 필요합니다'),
  /// 관리자 JWT 서명 시크릿 — 2FA 토큰 발급용
  ADMIN_JWT_SECRET: z.string().min(32, 'ADMIN_JWT_SECRET은 32자 이상이어야 합니다'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('유효한 Supabase URL이 필요합니다'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key가 필요합니다'),
  NEXT_PUBLIC_ADMIN_URL: z.string().url().default('http://localhost:3001'),
})

function validateEnv() {
  const isServer = typeof window === 'undefined'

  const clientResult = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    NEXT_PUBLIC_ADMIN_URL: process.env['NEXT_PUBLIC_ADMIN_URL'],
  })

  if (!clientResult.success) {
    console.error('[env/admin] 클라이언트 환경변수 검증 실패:')
    console.error(clientResult.error.flatten().fieldErrors)
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('[env/admin] 필수 환경변수가 없습니다.')
    }
  }

  if (isServer) {
    const serverResult = serverSchema.safeParse({
      DATABASE_URL: process.env['DATABASE_URL'],
      DIRECT_URL: process.env['DIRECT_URL'],
      SUPABASE_SERVICE_ROLE_KEY: process.env['SUPABASE_SERVICE_ROLE_KEY'],
      ADMIN_JWT_SECRET: process.env['ADMIN_JWT_SECRET'],
      NODE_ENV: process.env['NODE_ENV'],
    })

    if (!serverResult.success) {
      console.error('[env/admin] 서버 환경변수 검증 실패:')
      console.error(serverResult.error.flatten().fieldErrors)
      if (process.env['NODE_ENV'] === 'production') {
        throw new Error('[env/admin] 필수 서버 환경변수가 없습니다.')
      }
    }

    return {
      ...serverResult.data,
      ...clientResult.data,
    }
  }

  return clientResult.data
}

export const env = validateEnv()
export type AdminEnv = ReturnType<typeof validateEnv>
