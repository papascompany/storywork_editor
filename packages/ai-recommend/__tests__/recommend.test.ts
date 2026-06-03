/**
 * recommend.test.ts — recommend() 메인 함수 통합 테스트 (M4-02 Step 3)
 *
 * mock DB 어댑터 + mock AnalyzeResult 로 DB 없이 동작 검증.
 */

import type { AnalyzeResult } from '@storywork/ai-script'
import { describe, expect, it } from 'vitest'

import type { PoseSearchRow } from '../src/embedding/character-search.js'
import { recommend } from '../src/recommend.js'
import type { RecommendInternalOptions } from '../src/recommend.js'

// ─────────────────────────────────────────────
// 테스트 픽스처
// ─────────────────────────────────────────────

const MOCK_POSES: PoseSearchRow[] = [
  {
    id: 'pose-001',
    slug: 'walk_01_1',
    meta: { action: 'walking', view: 'front', bodyType: 'F' },
    tags: ['walking'],
    score: 0.9,
  },
  {
    id: 'pose-002',
    slug: 'jump-01_1',
    meta: { action: 'jumping', view: 'front', bodyType: 'F' },
    tags: ['jumping'],
    score: 0.85,
  },
  {
    id: 'pose-003',
    slug: 'Fight_01',
    meta: { action: 'fighting', view: 'side', bodyType: 'F' },
    tags: ['fighting'],
    score: 0.8,
  },
  {
    id: 'pose-004',
    slug: 'stand_01_1',
    meta: { action: 'standing', view: 'front', bodyType: 'F' },
    tags: ['standing'],
    score: 0.75,
  },
  {
    id: 'pose-005',
    slug: 'sit_16_2',
    meta: { action: 'sitting', view: 'side', bodyType: 'F' },
    tags: ['sitting'],
    score: 0.7,
  },
]

const mockAdapter = async (
  _characterId: string,
  _queryVec: string,
  limit: number,
): Promise<PoseSearchRow[]> => {
  return MOCK_POSES.slice(0, limit)
}

// 샘플 AnalyzeResult
function makeAnalyzeResult(overrides: Partial<AnalyzeResult> = {}): AnalyzeResult {
  return {
    format: 'novel',
    seed: 0,
    modelVersion: 'rule-only',
    scenes: [
      {
        index: 0,
        slug: 'scene-00',
        summary: '민준과 서연이 학교에서 만난다.',
        meta: {
          location: '학교',
          cameraAngle: 'medium',
          emotion: 'happy',
          mood: 'calm',
          timeOfDay: 'morning',
        },
        lines: [
          { index: 0, speaker: '민준', text: '안녕!' },
          { index: 1, speaker: '서연', text: '어, 안녕. 오늘 날씨 좋다?' },
          { index: 2, text: '두 사람은 웃으며 학교 정문을 지나갔다.' },
        ],
        characters: ['민준', '서연'],
        confidence: 0.9,
      },
      {
        index: 1,
        slug: 'scene-01',
        summary: '긴장된 대결 장면.',
        meta: {
          location: '전장',
          cameraAngle: 'wide',
          emotion: 'tense',
          mood: 'action',
        },
        lines: [
          { index: 0, speaker: '민준', text: '물러서!!!' },
          { index: 1, speaker: '서연', text: '절대로!' },
        ],
        characters: ['민준', '서연'],
        confidence: 0.85,
      },
    ],
    characters: [
      { name: '민준', mentionCount: 5 },
      { name: '서연', mentionCount: 4 },
    ],
    ...overrides,
  }
}

// ─────────────────────────────────────────────
// 테스트
// ─────────────────────────────────────────────

const defaultOpts: RecommendInternalOptions = {
  seed: 0,
  _dbAdapter: mockAdapter,
}

describe('recommend() — 기본 동작', () => {
  it('RecommendResult 스키마 충족', async () => {
    const analyzed = makeAnalyzeResult()
    const result = await recommend(analyzed, defaultOpts)

    expect(result.seed).toBe(0)
    expect(result.modelVersion).toBe('rule-only')
    expect(Array.isArray(result.scenes)).toBe(true)
    expect(result.scenes).toHaveLength(2)
    expect(Array.isArray(result.alternatives)).toBe(true)
  })

  it('각 장면에 poses, background, bubbles 존재', async () => {
    const analyzed = makeAnalyzeResult()
    const result = await recommend(analyzed, defaultOpts)

    for (const scene of result.scenes) {
      expect(typeof scene.sceneIndex).toBe('number')
      expect(typeof scene.poses).toBe('object')
      expect(typeof scene.background).toBe('object')
      expect(Array.isArray(scene.bubbles)).toBe(true)
      expect(scene.confidence).toBeGreaterThan(0)
      expect(scene.confidence).toBeLessThanOrEqual(1)
    }
  })

  it('장면 캐릭터별 포즈 K=5 반환', async () => {
    const analyzed = makeAnalyzeResult()
    const result = await recommend(analyzed, { ...defaultOpts, candidatesPerCharacter: 5 })

    const scene0 = result.scenes[0]
    expect(scene0).toBeDefined()
    // '민준', '서연' 두 캐릭터
    expect(Object.keys(scene0?.poses ?? {})).toContain('민준')
    expect(Object.keys(scene0?.poses ?? {})).toContain('서연')
    expect(scene0?.poses['민준']?.length).toBe(5)
    expect(scene0?.poses['서연']?.length).toBe(5)
  })

  it('말풍선 line 수 일치', async () => {
    const analyzed = makeAnalyzeResult()
    const result = await recommend(analyzed, defaultOpts)

    const scene0 = result.scenes[0]
    expect(scene0?.bubbles).toHaveLength(3) // scene-00 line 3개

    const scene1 = result.scenes[1]
    expect(scene1?.bubbles).toHaveLength(2) // scene-01 line 2개
  })

  it('배경 톤 — calm(mint) / action mood(navy)', async () => {
    const analyzed = makeAnalyzeResult()
    const result = await recommend(analyzed, defaultOpts)

    // scene-00: mood=calm → mint
    const scene0Bg = result.scenes[0]?.background
    expect(scene0Bg?.suggestedTone).toBe('mint')

    // scene-01: mood=action → navy
    const scene1Bg = result.scenes[1]?.background
    expect(scene1Bg?.suggestedTone).toBe('navy')
  })

  it('외침 대사 → wordFx 존재', async () => {
    const analyzed = makeAnalyzeResult()
    const result = await recommend(analyzed, defaultOpts)

    // scene-01: '물러서!!!' → shout wordFx
    const scene1 = result.scenes[1]
    expect(scene1?.wordFx).toBeDefined()
    const hasShout = scene1?.wordFx?.some((fx) => fx.scope === 'shout')
    expect(hasShout).toBe(true)
  })
})

describe('recommend() — alternatives', () => {
  it('alternatives K=3 생성', async () => {
    const analyzed = makeAnalyzeResult()
    const result = await recommend(analyzed, defaultOpts)

    expect(result.alternatives).toHaveLength(3)
    for (const alt of result.alternatives ?? []) {
      expect(alt.scenes).toHaveLength(2)
      expect(alt.seed).not.toBe(result.seed)
    }
  })

  it('alternatives seed 다름', async () => {
    const analyzed = makeAnalyzeResult()
    const result = await recommend(analyzed, defaultOpts)

    const seeds = (result.alternatives ?? []).map((a) => a.seed)
    expect(new Set(seeds).size).toBe(seeds.length)
  })
})

describe('recommend() — 결정론', () => {
  it('같은 seed → 같은 결과', async () => {
    const analyzed = makeAnalyzeResult()

    const r1 = await recommend(analyzed, { ...defaultOpts, seed: 42 })
    const r2 = await recommend(analyzed, { ...defaultOpts, seed: 42 })

    expect(r1.scenes.length).toBe(r2.scenes.length)
    for (let i = 0; i < r1.scenes.length; i++) {
      expect(r1.scenes[i]?.background.suggestedTone).toBe(r2.scenes[i]?.background.suggestedTone)
      expect(r1.scenes[i]?.bubbles.map((b) => b.shape)).toEqual(
        r2.scenes[i]?.bubbles.map((b) => b.shape),
      )
    }
  })

  it('다른 seed → alternatives seed 다름', async () => {
    const analyzed = makeAnalyzeResult()
    const r1 = await recommend(analyzed, { ...defaultOpts, seed: 0 })
    const r2 = await recommend(analyzed, { ...defaultOpts, seed: 100 })

    expect(r1.seed).toBe(0)
    expect(r2.seed).toBe(100)
    expect(r1.alternatives?.[0]?.seed).not.toBe(r2.alternatives?.[0]?.seed)
  })
})

describe('recommend() — characterMapping', () => {
  it('characterMapping 전달 → 해당 characterId 로 검색', async () => {
    const analyzed = makeAnalyzeResult()
    const mappingAdapter = async (characterId: string, _: string, limit: number) => {
      if (characterId === 'char-minjun') {
        return MOCK_POSES.slice(0, limit)
      }
      return MOCK_POSES.slice(2, limit + 2)
    }

    const result = await recommend(analyzed, {
      seed: 0,
      characterMapping: { 민준: 'char-minjun', 서연: 'char-seoyeon' },
      _dbAdapter: mappingAdapter,
    })

    expect(result.scenes[0]?.poses['민준']).toBeDefined()
    expect(result.scenes[0]?.poses['서연']).toBeDefined()
  })

  it('빈 장면(characters=[]) → default 포즈 생성', async () => {
    const analyzed = makeAnalyzeResult({
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '빈 장면',
          meta: {},
          lines: [],
          characters: [],
          confidence: 0.5,
        },
      ],
    })
    const result = await recommend(analyzed, defaultOpts)
    expect(result.scenes[0]?.poses['default']).toBeDefined()
  })
})
