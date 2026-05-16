/**
 * __tests__/lib/users.test.ts
 *
 * updateUserProfile 입력 검증 단위 테스트 (DB mock).
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

// prisma mock 설정
vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma'
import { updateUserProfile } from '../../lib/users'

const mockPrismaUser = {
  id: 'user-cuid-1',
  email: 'test@example.com',
  role: 'user' as const,
  name: '테스트',
  avatarUrl: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-05-14'),
}

describe('updateUserProfile — 입력 검증', () => {
  beforeEach(() => {
    vi.mocked(prisma.user.update).mockResolvedValue(mockPrismaUser as never)
  })

  it('정상 name 업데이트 성공', async () => {
    vi.mocked(prisma.user.update).mockResolvedValue(mockPrismaUser as never)
    const result = await updateUserProfile('user-cuid-1', { name: '홍길동' })
    expect(result.ok).toBe(true)
  })

  it('빈 name → 에러', async () => {
    const result = await updateUserProfile('user-cuid-1', { name: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/1~80/)
    }
  })

  it('공백만 있는 name → 에러 (trim 후 빈 문자열)', async () => {
    const result = await updateUserProfile('user-cuid-1', { name: '   ' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/1~80/)
    }
  })

  it('81자 name → 에러', async () => {
    const result = await updateUserProfile('user-cuid-1', { name: 'a'.repeat(81) })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/1~80/)
    }
  })

  it('80자 name → 성공', async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...mockPrismaUser,
      name: 'a'.repeat(80),
    } as never)
    const result = await updateUserProfile('user-cuid-1', { name: 'a'.repeat(80) })
    expect(result.ok).toBe(true)
  })

  it('유효한 https URL avatarUrl → 성공', async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...mockPrismaUser,
      avatarUrl: 'https://example.com/avatar.png',
    } as never)
    const result = await updateUserProfile('user-cuid-1', {
      avatarUrl: 'https://example.com/avatar.png',
    })
    expect(result.ok).toBe(true)
  })

  it('http:// avatarUrl → 에러', async () => {
    const result = await updateUserProfile('user-cuid-1', {
      avatarUrl: 'http://example.com/avatar.png',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/https/)
    }
  })

  it('빈 avatarUrl → 성공 (비워두는 것 허용)', async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({ ...mockPrismaUser, avatarUrl: null } as never)
    const result = await updateUserProfile('user-cuid-1', { avatarUrl: '' })
    expect(result.ok).toBe(true)
  })

  it('input 없이 호출해도 update 는 성공', async () => {
    vi.mocked(prisma.user.update).mockResolvedValue(mockPrismaUser as never)
    const result = await updateUserProfile('user-cuid-1', {})
    expect(result.ok).toBe(true)
  })
})
