/**
 * character-search.test.ts — character scope 임베딩 검색 테스트 (M4-02)
 *
 * DB 없이 mock 어댑터로 동작 검증.
 */

import type { SceneMeta } from '@storywork/ai-script'
import { describe, expect, it, vi } from 'vitest'

import { searchPosesByCharacter } from '../src/embedding/character-search.js'
import type { PoseSearchRow } from '../src/embedding/character-search.js'

// ─────────────────────────────────────────────
// mock DB 어댑터
// ─────────────────────────────────────────────

const MOCK_POSES: PoseSearchRow[] = [
  {
    id: 'pose-001',
    slug: 'walk_01_1',
    meta: { action: 'walking', view: 'front', bodyType: 'F' },
    tags: ['walking', 'front'],
    score: 0.92,
  },
  {
    id: 'pose-002',
    slug: 'run_01_1',
    meta: { action: 'running', view: 'side', bodyType: 'F' },
    tags: ['running', 'side'],
    score: 0.85,
  },
  {
    id: 'pose-003',
    slug: 'jump-01_1',
    meta: { action: 'jumping', view: 'front', bodyType: 'F' },
    tags: ['jumping', 'front'],
    score: 0.78,
  },
  {
    id: 'pose-004',
    slug: 'stand_01_1',
    meta: { action: 'standing', view: 'front', bodyType: 'F' },
    tags: ['standing', 'front'],
    score: 0.7,
  },
  {
    id: 'pose-005',
    slug: 'Fight_01',
    meta: { action: 'fighting', view: 'side', bodyType: 'F' },
    tags: ['fighting', 'action'],
    score: 0.65,
  },
]

const mockAdapter = vi.fn(
  async (_characterId: string, _queryVec: string, limit: number): Promise<PoseSearchRow[]> => {
    return MOCK_POSES.slice(0, limit)
  },
)

// ─────────────────────────────────────────────
// 테스트
// ─────────────────────────────────────────────

describe('searchPosesByCharacter — mock DB', () => {
  it('K=5 반환 (DB 결과 충분)', async () => {
    const meta: SceneMeta = { emotion: 'happy', cameraAngle: 'wide' }
    const results = await searchPosesByCharacter('char-001', meta, 5, { dbAdapter: mockAdapter })
    expect(results).toHaveLength(5)
  })

  it('PoseCandidate 스키마 충족', async () => {
    const meta: SceneMeta = { emotion: 'happy' }
    const results = await searchPosesByCharacter('char-001', meta, 3, { dbAdapter: mockAdapter })
    for (const r of results) {
      expect(typeof r.resourceId).toBe('string')
      expect(typeof r.characterId).toBe('string')
      expect(typeof r.poseAction).toBe('string')
      expect(r.confidence).toBeGreaterThanOrEqual(0)
      expect(r.confidence).toBeLessThanOrEqual(1)
      expect(typeof r.reasoning).toBe('string')
    }
  })

  it('characterId 전달됨', async () => {
    const meta: SceneMeta = { emotion: 'happy' }
    await searchPosesByCharacter('my-char-id', meta, 5, { dbAdapter: mockAdapter })
    expect(mockAdapter).toHaveBeenCalledWith(
      'my-char-id',
      expect.stringMatching(/^\[/),
      expect.any(Number),
    )
  })

  it('confidence 내림차순 정렬', async () => {
    const meta: SceneMeta = { emotion: 'angry', mood: 'action' }
    const results = await searchPosesByCharacter('char-001', meta, 5, { dbAdapter: mockAdapter })
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1]?.confidence ?? 0
      const curr = results[i]?.confidence ?? 0
      expect(prev).toBeGreaterThanOrEqual(curr)
    }
  })

  it('DB 빈 결과 → 룰 기반 플레이스홀더로 채움', async () => {
    const emptyAdapter = vi.fn(async () => [] as PoseSearchRow[])
    const meta: SceneMeta = { emotion: 'sad' }
    const results = await searchPosesByCharacter('char-001', meta, 5, { dbAdapter: emptyAdapter })
    // 룰 기반 플레이스홀더가 K개까지 채움
    expect(results.length).toBeGreaterThan(0)
    const hasPlaceholder = results.some((r) => r.resourceId.startsWith('rule-placeholder:'))
    expect(hasPlaceholder).toBe(true)
  })

  it('결정론 — 동일 입력 → 동일 결과', async () => {
    const meta: SceneMeta = { emotion: 'happy', cameraAngle: 'closeup', mood: 'romantic' }
    const r1 = await searchPosesByCharacter('char-001', meta, 5, { dbAdapter: mockAdapter })
    const r2 = await searchPosesByCharacter('char-001', meta, 5, { dbAdapter: mockAdapter })
    expect(r1.map((r) => r.resourceId)).toEqual(r2.map((r) => r.resourceId))
    expect(r1.map((r) => r.confidence)).toEqual(r2.map((r) => r.confidence))
  })
})
