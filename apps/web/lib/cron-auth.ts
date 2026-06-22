/**
 * apps/web/lib/cron-auth.ts
 *
 * Vercel Cron 요청 인증 — `Authorization: Bearer <CRON_SECRET>` 헤더 검증.
 *
 * - sha256 해시 후 timingSafeEqual 로 **상수시간 비교** (타이밍 사이드채널 + 길이 누출 차단).
 * - CRON_SECRET 미설정 시 항상 false → cron 비활성(안전 기본값).
 *
 * Node 런타임 전용(crypto). cron 라우트는 `export const dynamic = 'force-dynamic'` 으로
 * Node 런타임에서 동작하므로 안전.
 */
import { createHash, timingSafeEqual } from 'crypto'

export function verifyCronSecret(request: Request): boolean {
  const cronSecret = process.env['CRON_SECRET']
  if (!cronSecret) return false

  const token = request.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  if (!token) return false

  // 해시 후 비교 — 입력 길이에 무관하게 32바이트 다이제스트를 상수시간 비교
  const a = createHash('sha256').update(token).digest()
  const b = createHash('sha256').update(cronSecret).digest()
  return timingSafeEqual(a, b)
}
