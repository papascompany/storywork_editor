/**
 * GET /api/cron/hard-delete-users — 사용자 영구 파기 (LEGAL-OPS-03 / PIPA)
 *
 * 회귀 방지: user.delete 전에 RESTRICT 자식(Subscription/Comment/Showcase/Project/Notice)
 * + FK 없는 Reaction 을 단일 트랜잭션으로 파기해야 한다. 미삭제 시 FK violation 으로
 * 영구 잔존(파기 의무 위반) → 감사 #1 (codebase-audit 2026-06-15) 회귀 차단.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const M = vi.hoisted(() => ({
  userFindMany: vi.fn(),
  userDelete: vi.fn(),
  subscriptionDeleteMany: vi.fn(),
  reactionDeleteMany: vi.fn(),
  commentDeleteMany: vi.fn(),
  showcaseDeleteMany: vi.fn(),
  projectDeleteMany: vi.fn(),
  noticeDeleteMany: vi.fn(),
  auditCreate: vi.fn(),
  txCalls: [] as unknown[][],
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findMany: M.userFindMany, delete: M.userDelete },
    subscription: { deleteMany: M.subscriptionDeleteMany },
    reaction: { deleteMany: M.reactionDeleteMany },
    comment: { deleteMany: M.commentDeleteMany },
    showcase: { deleteMany: M.showcaseDeleteMany },
    project: { deleteMany: M.projectDeleteMany },
    notice: { deleteMany: M.noticeDeleteMany },
    auditLog: { create: M.auditCreate },
    // 배열 트랜잭션 — 요소(이미 평가된 mock 결과)를 Promise.all 처리 + 호출 기록
    $transaction: (ops: unknown[]) => {
      M.txCalls.push(ops)
      return Promise.all(ops)
    },
  },
}))

const SECRET = 'test-cron-secret'

function req(token?: string): Request {
  return new Request('http://localhost:3000/api/cron/hard-delete-users', {
    method: 'GET',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  })
}

async function call(token?: string) {
  const { GET } = await import('../app/api/cron/hard-delete-users/route')
  return GET(req(token))
}

describe('GET /api/cron/hard-delete-users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    M.txCalls.length = 0
    process.env['CRON_SECRET'] = SECRET
    M.userFindMany.mockResolvedValue([])
    M.subscriptionDeleteMany.mockResolvedValue({ count: 0 })
    M.reactionDeleteMany.mockResolvedValue({ count: 0 })
    M.commentDeleteMany.mockResolvedValue({ count: 0 })
    M.showcaseDeleteMany.mockResolvedValue({ count: 0 })
    M.projectDeleteMany.mockResolvedValue({ count: 0 })
    M.noticeDeleteMany.mockResolvedValue({ count: 0 })
    M.userDelete.mockResolvedValue({ id: 'u1' })
    M.auditCreate.mockResolvedValue({})
  })
  afterEach(() => {
    delete process.env['CRON_SECRET']
  })

  it('CRON_SECRET 없음/불일치 → 401', async () => {
    delete process.env['CRON_SECRET']
    expect((await call(SECRET)).status).toBe(401)
    process.env['CRON_SECRET'] = SECRET
    expect((await call()).status).toBe(401)
    expect((await call('wrong')).status).toBe(401)
    expect(M.userFindMany).not.toHaveBeenCalled()
  })

  it('대상 없음 → deletedCount 0', async () => {
    const res = await call(SECRET)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { deletedCount: number }
    expect(body.deletedCount).toBe(0)
    expect(M.userDelete).not.toHaveBeenCalled()
  })

  it('RESTRICT 자식 + Reaction 을 user.delete 전에 모두 파기 (FK violation 방지)', async () => {
    M.userFindMany.mockResolvedValue([
      { id: 'u1', email: 'a@b.com', deletionScheduledFor: new Date('2026-05-01') },
    ])
    const res = await call(SECRET)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { deletedCount: number; failedCount: number }
    expect(body.deletedCount).toBe(1)
    expect(body.failedCount).toBe(0)

    // 모든 개인 콘텐츠 파기가 올바른 where 로 호출됐는가
    expect(M.subscriptionDeleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
    expect(M.reactionDeleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
    expect(M.commentDeleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
    expect(M.showcaseDeleteMany).toHaveBeenCalledWith({ where: { ownerId: 'u1' } })
    expect(M.projectDeleteMany).toHaveBeenCalledWith({ where: { ownerId: 'u1' } })
    expect(M.noticeDeleteMany).toHaveBeenCalledWith({ where: { authorId: 'u1' } })
    expect(M.userDelete).toHaveBeenCalledWith({ where: { id: 'u1' } })

    // 단일 트랜잭션으로 묶였는가 (원자성)
    expect(M.txCalls).toHaveLength(1)
    expect(M.txCalls[0]).toHaveLength(8) // sub,reaction,comment,showcase,project,notice,user,audit
  })

  it('트랜잭션 실패 → failedCount 집계, user 잔존(다음 실행 재시도)', async () => {
    M.userFindMany.mockResolvedValue([
      { id: 'u1', email: 'a@b.com', deletionScheduledFor: new Date('2026-05-01') },
    ])
    M.userDelete.mockRejectedValueOnce(new Error('FK violation P2003'))
    const res = await call(SECRET)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { deletedCount: number; failedCount: number }
    expect(body.deletedCount).toBe(0)
    expect(body.failedCount).toBe(1)
  })
})
