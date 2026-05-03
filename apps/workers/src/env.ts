import { z } from 'zod'

// ─────────────────────────────────────────────
// apps/workers 환경변수 검증
// Inngest 워커 — 서버 전용, NEXT_PUBLIC_ 없음
// ─────────────────────────────────────────────

const workersEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .startsWith('postgresql://', 'DATABASE_URL must be a postgresql:// URL'),
  DIRECT_URL: z
    .string()
    .url()
    .startsWith('postgresql://', 'DIRECT_URL must be a postgresql:// URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key가 필요합니다'),
  /// Inngest 이벤트 키 — inngest.com 프로젝트에서 발급
  INNGEST_EVENT_KEY: z.string().min(1, 'Inngest event key가 필요합니다'),
  /// Inngest 웹훅 서명 검증 키
  INNGEST_SIGNING_KEY: z.string().min(1, 'Inngest signing key가 필요합니다'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

function validateWorkersEnv() {
  const result = workersEnvSchema.safeParse({
    DATABASE_URL: process.env['DATABASE_URL'],
    DIRECT_URL: process.env['DIRECT_URL'],
    SUPABASE_SERVICE_ROLE_KEY: process.env['SUPABASE_SERVICE_ROLE_KEY'],
    INNGEST_EVENT_KEY: process.env['INNGEST_EVENT_KEY'],
    INNGEST_SIGNING_KEY: process.env['INNGEST_SIGNING_KEY'],
    NODE_ENV: process.env['NODE_ENV'],
  })

  if (!result.success) {
    console.error('[env/workers] 환경변수 검증 실패:')
    console.error(result.error.flatten().fieldErrors)
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('[env/workers] 필수 환경변수가 없습니다.')
    }
  }

  // safeParse 성공 시 data 반환, 실패 시 partial 반환 (개발 환경 허용)
  return result.success ? result.data : (result.error as unknown as typeof result.data)
}

export const env = validateWorkersEnv()
export type WorkersEnv = z.infer<typeof workersEnvSchema>
