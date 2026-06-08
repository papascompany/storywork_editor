/**
 * Audit MED 수정 회귀 테스트
 * #3 showcase 좋아요 카운터 중복 증가 방지
 * #4 inquiries 작성자 id 세션 유도(바디 userId 무시)
 * #5 logout redirect — NEXT_PUBLIC_APP_URL 사용
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── 공유 mock ────────────────────────────────────────────────────────────
const { mockGetUser, mockSignOut, mockGetCurrentUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSignOut: vi.fn(),
  mockGetCurrentUser: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createWebServerClient: vi
    .fn()
    .mockResolvedValue({ auth: { getUser: mockGetUser, signOut: mockSignOut } }),
}))

vi.mock('@/lib/users', () => ({ getCurrentUser: mockGetCurrentUser }))

const { mockTransaction, mockInquiryCreate } = vi.hoisted(() => ({
  mockTransaction: vi.fn(),
  mockInquiryCreate: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: mockTransaction,
    inquiry: { create: mockInquiryCreate },
  },
}))

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─── #3 showcase reactions ─────────────────────────────────────────────────
describe('#3 POST showcase reactions — 좋아요 카운터 멱등', () => {
  let txShowcaseUpdate: ReturnType<typeof vi.fn>
  let txReactionCreateMany: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'au1', email: 'a@b.com' } } })
    mockGetCurrentUser.mockResolvedValue({ id: 'u1', email: 'a@b.com' })
    txShowcaseUpdate = vi.fn()
    txReactionCreateMany = vi.fn()
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) =>
      cb({
        reaction: { createMany: txReactionCreateMany },
        showcase: { update: txShowcaseUpdate },
      }),
    )
  })

  async function call(body: unknown) {
    const { POST } = await import('../app/api/showcase/[id]/reactions/route')
    return POST(jsonRequest(body), { params: Promise.resolve({ id: 'sc1' }) })
  }

  it('신규 like(count=1) → likes 증가', async () => {
    txReactionCreateMany.mockResolvedValue({ count: 1 })
    const res = await call({ kind: 'like' })
    expect(res.status).toBe(201)
    expect(txReactionCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    )
    expect(txShowcaseUpdate).toHaveBeenCalledTimes(1)
  })

  it('중복 like(count=0) → likes 증가 안 함 (inflation 방지)', async () => {
    txReactionCreateMany.mockResolvedValue({ count: 0 })
    const res = await call({ kind: 'like' })
    expect(res.status).toBe(201)
    expect(txShowcaseUpdate).not.toHaveBeenCalled()
  })

  it('like 가 아닌 반응(heart)은 신규여도 likes 미증가', async () => {
    txReactionCreateMany.mockResolvedValue({ count: 1 })
    await call({ kind: 'heart' })
    expect(txShowcaseUpdate).not.toHaveBeenCalled()
  })
})

// ─── #4 inquiries ──────────────────────────────────────────────────────────
describe('#4 POST inquiries — 작성자 id 세션 유도', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInquiryCreate.mockResolvedValue({ id: 'inq1' })
  })

  async function call(body: unknown) {
    const { POST } = await import('../app/api/inquiries/route')
    return POST(jsonRequest(body))
  }

  const validBody = {
    email: 'user@example.com',
    subject: '문의 제목',
    body: '문의 내용 10자 이상입니다.',
  }

  it('바디의 userId 는 무시되고 세션 사용자 id 로 저장된다', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'au', email: 'real@b.com' } } })
    mockGetCurrentUser.mockResolvedValue({ id: 'real-user', email: 'real@b.com' })
    const res = await call({ ...validBody, userId: 'victim-user-id' })
    expect(res.status).toBe(201)
    const arg = mockInquiryCreate.mock.calls[0]?.[0] as { data: { userId: string | null } }
    expect(arg.data.userId).toBe('real-user')
    expect(arg.data.userId).not.toBe('victim-user-id')
  })

  it('미인증(게스트) → userId null 로 저장', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await call({ ...validBody, userId: 'spoof' })
    expect(res.status).toBe(201)
    const arg = mockInquiryCreate.mock.calls[0]?.[0] as { data: { userId: string | null } }
    expect(arg.data.userId).toBeNull()
    expect(mockGetCurrentUser).not.toHaveBeenCalled()
  })
})

// ─── #5 logout ─────────────────────────────────────────────────────────────
describe('#5 POST logout — NEXT_PUBLIC_APP_URL 리다이렉트', () => {
  const ORIG = process.env['NEXT_PUBLIC_APP_URL']
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignOut.mockResolvedValue({ error: null })
  })

  it('NEXT_PUBLIC_APP_URL 의 홈(/)으로 리다이렉트', async () => {
    process.env['NEXT_PUBLIC_APP_URL'] = 'https://storywork-editor-web.vercel.app'
    const { POST } = await import('../app/api/auth/logout/route')
    const res = await POST()
    expect(mockSignOut).toHaveBeenCalled()
    expect(res.headers.get('location')).toBe('https://storywork-editor-web.vercel.app/')
    if (ORIG === undefined) delete process.env['NEXT_PUBLIC_APP_URL']
    else process.env['NEXT_PUBLIC_APP_URL'] = ORIG
  })
})
