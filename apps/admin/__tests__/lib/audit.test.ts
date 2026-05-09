/**
 * audit 헬퍼 단위 테스트
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

// prisma mock
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    },
  },
}))

import { recordAudit } from '../../src/lib/audit'
import { prisma } from '../../src/lib/prisma'

describe('recordAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('AuditLog.create 를 올바른 인수로 호출한다', async () => {
    await recordAudit({
      actorId: 'user-1',
      action: 'create',
      entityType: 'Format',
      entityId: 'format-1',
      meta: { name: 'B5 단행본' },
    })

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'user-1',
        action: 'create',
        target: 'format:format-1',
        payload: { meta: { name: 'B5 단행본' } },
      },
    })
  })

  it('diff 가 있으면 payload 에 포함한다', async () => {
    await recordAudit({
      actorId: 'user-1',
      action: 'update',
      entityType: 'Format',
      entityId: 'format-2',
      diff: { name: { before: '구 이름', after: '새 이름' } },
    })

    const call = vi.mocked(prisma.auditLog.create).mock.calls[0]
    expect(call?.[0]?.data?.payload).toMatchObject({
      diff: { name: { before: '구 이름', after: '새 이름' } },
    })
  })

  it('AuditLog.create 실패 시 예외를 전파하지 않는다', async () => {
    vi.mocked(prisma.auditLog.create).mockRejectedValueOnce(new Error('DB error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      recordAudit({
        actorId: 'user-1',
        action: 'delete',
        entityType: 'Format',
        entityId: 'format-3',
      }),
    ).resolves.toBeUndefined()

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('delete 액션 시 target 포맷이 올바르다', async () => {
    await recordAudit({
      actorId: 'actor-1',
      action: 'delete',
      entityType: 'Resource',
      entityId: 'res-abc',
    })

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ target: 'resource:res-abc' }),
      }),
    )
  })
})
