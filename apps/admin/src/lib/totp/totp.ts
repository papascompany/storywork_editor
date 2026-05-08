/**
 * apps/admin/src/lib/totp/totp.ts
 *
 * TOTP(Time-based One-Time Password) 유틸리티.
 * otplib v13 함수형 API 를 래핑한다.
 * 서버 사이드 전용 — 클라이언트 컴포넌트에서 import 금지.
 */
import { generate, generateSecret, generateURI, verify } from 'otplib'

// ─────────────────────────────────────────────
// 설정
// ─────────────────────────────────────────────

const ISSUER = process.env['TOTP_ISSUER'] ?? 'StoryWork Admin'

// 시계 오차 보정: 30초(±1 스텝) 허용
// v13 에서는 epochTolerance (초 단위) 를 사용
const EPOCH_TOLERANCE_SECONDS = 30

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * 새 TOTP 시크릿을 생성한다 (Base32).
 */
export function generateTotpSecret(): string {
  return generateSecret()
}

/**
 * TOTP URI를 생성한다 (QR 코드에 인코딩).
 * otpauth://totp/<label>?secret=...&issuer=...
 */
export function generateTotpUri(secret: string, email: string): string {
  return generateURI({
    issuer: ISSUER,
    label: `${ISSUER}:${email}`,
    secret,
  })
}

/**
 * OTP 토큰이 유효한지 검증한다.
 * @param token 사용자가 입력한 6자리 숫자 문자열
 * @param secret DB에 저장된 Base32 시크릿
 * @returns true 면 유효
 */
export async function verifyTotpToken(token: string, secret: string): Promise<boolean> {
  if (!secret) return false
  try {
    const result = await verify({ token, secret, epochTolerance: EPOCH_TOLERANCE_SECONDS })
    return result.valid
  } catch {
    return false
  }
}

/**
 * 현재 유효한 OTP 토큰을 생성한다 (테스트/디버그용).
 */
export async function generateCurrentToken(secret: string): Promise<string> {
  return generate({ secret })
}
