import { z } from 'zod'

// ─────────────────────────────────────────────
// apps/web 환경변수 검증
// 빌드/시작 시 실패하면 명확한 오류 메시지 출력
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
  // cron 인증 시크릿 — 미설정 시 /api/cron/* 가 항상 401(안전 기본값)이라 프로덕션 필수.
  // 서버 전용(NEXT_PUBLIC_ 아님) — serverSchema 로만 검증해 클라이언트 번들에 노출하지 않는다.
  CRON_SECRET: z.string().min(1, 'CRON_SECRET가 필요합니다 (cron 인증)'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('유효한 Supabase URL이 필요합니다'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key가 필요합니다'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
})

// ─────────────────────────────────────────────
// 빌드 타임 검증 (NEXT_PUBLIC_ 변수는 항상 검증, 서버 변수는 서버에서만)
// ─────────────────────────────────────────────

function validateEnv() {
  const isServer = typeof window === 'undefined'

  // 클라이언트 변수는 항상 검증
  const clientResult = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'],
  })

  if (!clientResult.success) {
    console.error('[env] 클라이언트 환경변수 검증 실패:')
    console.error(clientResult.error.flatten().fieldErrors)
    if (process.env['NODE_ENV'] === 'production' && process.env['VERCEL_ENV'] !== 'preview') {
      throw new Error('[env] 필수 환경변수가 없습니다. .env.local 을 확인하세요.')
    }
  }

  if (isServer) {
    const serverResult = serverSchema.safeParse({
      DATABASE_URL: process.env['DATABASE_URL'],
      DIRECT_URL: process.env['DIRECT_URL'],
      SUPABASE_SERVICE_ROLE_KEY: process.env['SUPABASE_SERVICE_ROLE_KEY'],
      CRON_SECRET: process.env['CRON_SECRET'],
      NODE_ENV: process.env['NODE_ENV'],
    })

    if (!serverResult.success) {
      console.error('[env] 서버 환경변수 검증 실패:')
      console.error(serverResult.error.flatten().fieldErrors)
      if (process.env['NODE_ENV'] === 'production' && process.env['VERCEL_ENV'] !== 'preview') {
        throw new Error('[env] 필수 서버 환경변수가 없습니다. .env.local 을 확인하세요.')
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

// 타입 export
export type WebEnv = ReturnType<typeof validateEnv>
