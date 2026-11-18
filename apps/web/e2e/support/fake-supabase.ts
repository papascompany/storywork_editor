/**
 * e2e/support/fake-supabase.ts — 키보드 E2E 용 가짜 Supabase 인증 서버 (M9-02)
 *
 * /editor 는 미들웨어가 Supabase `auth.getUser()` 로 로그인 여부를 확인하는 보호 경로다.
 * CI 의 시각 회귀 단계는 web 을 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321(더미)로 빌드·기동하므로,
 * 그 포트에 최소 응답만 하는 서버를 띄우고 세션 쿠키를 심으면 실제 앱 코드를 바꾸지 않고
 * 로그인 상태의 편집기를 브라우저로 검증할 수 있다. 프로덕션 코드에는 어떤 우회도 없다.
 *
 * - GET /auth/v1/user      → 고정 테스트 사용자
 * - /rest/v1/*             → [] (탈퇴 여부 조회 등 → 해당 없음)
 * - 그 외                  → {}
 */
import http from 'node:http'

export const FAKE_SUPABASE_PORT = 54321

const TEST_USER = {
  id: '00000000-0000-4000-8000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'e2e-keyboard@storywork.test',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
}

/** @supabase/ssr 가 읽는 세션 쿠키 — 키는 `sb-<hostname 첫 라벨>-auth-token` (127.0.0.1 → sb-127) */
export function fakeSessionCookie(domain: string) {
  const session = {
    access_token: 'e2e-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'e2e-refresh-token',
    user: TEST_USER,
  }
  return {
    name: 'sb-127-auth-token',
    value: `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`,
    domain,
    path: '/',
  }
}

/** 이미 떠 있으면(다른 워커) 재사용한다. 닫기 함수를 돌려준다. */
export async function startFakeSupabase(): Promise<() => Promise<void>> {
  const server = http.createServer((req, res) => {
    const headers = {
      'content-type': 'application/json',
      'access-control-allow-origin': req.headers.origin ?? '*',
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': '*',
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, headers)
      res.end()
      return
    }
    const url = req.url ?? ''
    const body = url.startsWith('/auth/v1/user')
      ? JSON.stringify(TEST_USER)
      : url.startsWith('/rest/v1/')
        ? '[]'
        : '{}'
    res.writeHead(200, headers)
    res.end(body)
  })

  return new Promise((resolve, reject) => {
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') resolve(async () => {})
      else reject(err)
    })
    server.listen(FAKE_SUPABASE_PORT, '127.0.0.1', () => {
      resolve(() => new Promise<void>((done) => server.close(() => done())))
    })
  })
}
