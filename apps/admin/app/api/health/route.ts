/**
 * GET /api/health
 * 인증 없이 접근 가능한 헬스체크 엔드포인트.
 */
import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json({ status: 'ok', app: 'storywork-admin' })
}
