/**
 * apps/web/lib/feature-flags.ts
 *
 * 런타임 기능 플래그 조회 (admin 이 DB FeatureFlag 테이블로 토글).
 * - service-role 클라이언트로 읽음 → RLS(정책 없음) 우회. 서버 전용(미들웨어/route handler).
 * - 30초 인메모리 캐시로 요청당 DB 조회 최소화(edge 인스턴스 수명 내 유효).
 * - **fail-closed**: 조회 실패 시 false 반환 → 데모 OFF = 인증 유지(안전 기본값).
 *
 * 현재 플래그: 'demoMode' (옵션B 데모 — /editor + 포즈검색 익명 허용).
 */
import { createClient } from '@supabase/supabase-js'

const TTL_MS = 30_000

interface FlagCache {
  value: boolean
  expires: number
}

const cache = new Map<string, FlagCache>()

async function readFlag(key: string): Promise<boolean> {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!url || !serviceKey) return false

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase
    .from('FeatureFlag')
    .select('enabled')
    .eq('key', key)
    .maybeSingle()

  if (error) throw error
  return data?.enabled === true
}

/**
 * 기능 플래그 활성 여부 (30초 캐시). 조회 실패 시 false(fail-closed).
 */
export async function isFlagEnabled(key: string): Promise<boolean> {
  const now = Date.now()
  const cached = cache.get(key)
  if (cached && cached.expires > now) return cached.value

  let value = false
  try {
    value = await readFlag(key)
  } catch {
    value = false // fail-closed — 인증을 유지(데모 OFF)
  }
  cache.set(key, { value, expires: now + TTL_MS })
  return value
}

/** 데모 모드(인증 우회 시연) 활성 여부. */
export function isDemoModeEnabled(): Promise<boolean> {
  return isFlagEnabled('demoMode')
}

/** 테스트/즉시반영용 캐시 무효화. */
export function clearFlagCache(): void {
  cache.clear()
}
