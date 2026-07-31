/**
 * rate-limit.ts — 인메모리 슬라이딩 윈도 rate limiter (스톱갭)
 *
 * CONTI-03 리뷰 후속: 무영속 analyze 개방으로 고비용 연산 엔드포인트의
 * 무제한 반복이 가능해져 최소한의 실 차단을 도입한다.
 *
 * 한계(명시): 모듈 스코프 Map 이므로 서버리스 인스턴스별로 독립 카운트된다 —
 * 다중 인스턴스에서는 상한이 인스턴스 수만큼 늘어난다. 프로덕션 공유 한도는
 * Upstash Ratelimit(@upstash/ratelimit + @upstash/redis) 도입 게이트(roadmap
 * SEC-RATE-01)로 이관. 그때 이 모듈의 시그니처를 유지한 채 구현만 교체한다.
 */

interface WindowEntry {
  timestamps: number[]
}

const buckets = new Map<string, WindowEntry>()

/** 전체 버킷 수 상한 — 메모리 보호 (초과 시 가장 오래된 것부터 정리) */
const MAX_BUCKETS = 10_000

export interface RateLimitResult {
  allowed: boolean
  /** 허용 초과 시 다음 시도까지 대기 초 (Retry-After 용) */
  retryAfterSec: number
}

/**
 * 슬라이딩 윈도 검사. 허용 시 이번 호출을 기록한다.
 *
 * @param key      식별 키 (예: `analyze:${userId}`)
 * @param limit    윈도 내 최대 허용 횟수
 * @param windowMs 윈도 크기 (ms)
 * @param now      현재 시각 (테스트 주입용, 기본 Date.now())
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  let entry = buckets.get(key)
  if (!entry) {
    if (buckets.size >= MAX_BUCKETS) {
      const oldest = buckets.keys().next().value
      if (oldest !== undefined) buckets.delete(oldest)
    }
    entry = { timestamps: [] }
    buckets.set(key, entry)
  }

  const cutoff = now - windowMs
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff)

  if (entry.timestamps.length >= limit) {
    const earliest = entry.timestamps[0] ?? now
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((earliest + windowMs - now) / 1000)),
    }
  }

  entry.timestamps.push(now)
  return { allowed: true, retryAfterSec: 0 }
}

/** 테스트 전용 — 버킷 초기화 */
export function resetRateLimits(): void {
  buckets.clear()
}
