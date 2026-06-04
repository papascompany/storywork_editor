/**
 * __tests__/preflight/db-adapter.test.ts
 *
 * ProfileLoader 어댑터 통합 테스트.
 * mock loader 로 DB 없이 동작 검증.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { preflight } from '../../src/preflight/check.js'
import { PROFILES, getProfileLoader, setProfileLoader } from '../../src/preflight/profiles.js'
import type { ProfileLoader } from '../../src/preflight/profiles.js'

import { makeInput } from './fixtures.js'

// ─── mock loader ──────────────────────────────────────────────────────────────

const FIRST_PROFILE = PROFILES[0]
if (!FIRST_PROFILE) throw new Error('PROFILES 가 비어 있습니다')
const MOCK_PROFILE = FIRST_PROFILE

const mockLoader: ProfileLoader = {
  getById: vi.fn().mockImplementation(async (id: string) => {
    return id === MOCK_PROFILE.id ? MOCK_PROFILE : null
  }),
  listActive: vi.fn().mockResolvedValue([MOCK_PROFILE]),
}

describe('setProfileLoader / getProfileLoader', () => {
  afterEach(() => {
    // loader 초기화
    setProfileLoader(null)
  })

  it('loader 미등록 시 null', () => {
    expect(getProfileLoader()).toBeNull()
  })

  it('loader 등록 후 반환', () => {
    setProfileLoader(mockLoader)
    expect(getProfileLoader()).toBe(mockLoader)
  })
})

describe('preflight() DB 어댑터 우선', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setProfileLoader(mockLoader)
  })

  afterEach(() => {
    setProfileLoader(null)
  })

  it('listActive 호출 → mock 프로필 1개 반환', async () => {
    const input = makeInput(3)
    const reports = await preflight(input)
    expect(mockLoader.listActive).toHaveBeenCalledOnce()
    expect(reports).toHaveLength(1)
    expect(reports[0]?.profileId).toBe(MOCK_PROFILE.id)
  })

  it('profileId 지정 시 getById 호출', async () => {
    const input = makeInput(1)
    const reports = await preflight(input, MOCK_PROFILE.id)
    expect(mockLoader.getById).toHaveBeenCalledWith(MOCK_PROFILE.id)
    expect(reports).toHaveLength(1)
    expect(reports[0]?.profileId).toBe(MOCK_PROFILE.id)
  })

  it('DB 없는 profileId → unknown 에러 리포트', async () => {
    const input = makeInput(1)
    const reports = await preflight(input, 'does-not-exist')
    expect(reports).toHaveLength(1)
    expect(reports[0]?.ok).toBe(false)
  })

  it('listActive 실패 시 in-memory fallback 3개 반환', async () => {
    ;(mockLoader.listActive as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('DB 연결 실패'),
    )
    const input = makeInput(3)
    const reports = await preflight(input)
    // fallback: PROFILES (3개)
    expect(reports).toHaveLength(PROFILES.length)
  })
})
