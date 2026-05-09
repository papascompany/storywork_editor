/**
 * apps/admin/src/lib/api-response.ts
 *
 * API Route Handler 공통 응답 헬퍼.
 * 일관된 에러 형식: { error: { code, message, details? } }
 */
import { NextResponse } from 'next/server'

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse {
  const body: { error: ApiError } = {
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  }
  return NextResponse.json(body, { status })
}

export function apiOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}
