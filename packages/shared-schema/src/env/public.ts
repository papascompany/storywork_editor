import { z } from 'zod'

// ─────────────────────────────────────────────
// 클라이언트에서도 안전한 공개 환경변수 스키마 (NEXT_PUBLIC_*)
// 서버 전용 변수는 각 앱의 env.ts 에서 관리
// ─────────────────────────────────────────────

export const PublicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('유효한 Supabase URL이 필요합니다'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key가 필요합니다'),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('유효한 앱 URL이 필요합니다')
    .default('http://localhost:3000'),
})
export type PublicEnv = z.infer<typeof PublicEnvSchema>
