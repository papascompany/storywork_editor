/**
 * compose.test.ts — compose() 동작 + 골든 5 시나리오 (M4-03 Step 4 DoD)
 *
 * 골든 5:
 *  G1: 1대1 대화 (2 scenes, 같은 location)
 *  G2: 풀샷 단독 (wide + props 3+)
 *  G3: 클로즈업 (closeup, 1 scene)
 *  G4: 풍경 단독 (wide, 1 scene)
 *  G5: 4컷 만화 (4 closeup scenes)
 *
 * 검증 항목:
 *  - fabricJson Schema v1 (v:1, format, layers)
 *  - 충돌 0 (slotId 중복 없음)
 *  - safe area 침범 0 (warning 없음)
 *  - 결정론 (같은 seed → 같은 결과)
 */

import type { BgTone, RecommendResult, SceneRecommendation } from '@storywork/ai-recommend'
import type { AnalyzeResult } from '@storywork/ai-script'
import { describe, it, expect } from 'vitest'

import { compose } from '../src/compose.js'
import type { ComposeOptions, LayoutFormat } from '../src/types.js'

// ─────────────────────────────────────────────
// 공통 픽스처
// ─────────────────────────────────────────────

const B5_FORMAT: LayoutFormat = {
  id: 'b5',
  widthMm: 128,
  heightMm: 182,
  dpi: 350,
  bleedMm: 3,
  safeMm: 5,
}

const BASE_OPTS: ComposeOptions = {
  formatId: 'b5',
  format: B5_FORMAT,
  seed: 42,
  preferredTemplateIds: [],
  enableSplitMerge: true,
}

function makeSceneRec(
  sceneIndex: number,
  opts: { charNames?: string[]; bgTone?: string } = {},
): SceneRecommendation {
  const charNames = opts.charNames ?? ['주인공']
  const poses: Record<string, SceneRecommendation['poses'][string]> = {}
  for (const name of charNames) {
    poses[name] = [
      {
        resourceId: `res-${name}-${sceneIndex}`,
        characterId: `char-${name}`,
        poseAction: 'standing',
        confidence: 0.9,
        reasoning: '',
      },
    ]
  }
  return {
    sceneIndex,
    poses,
    background: { suggestedTone: (opts.bgTone ?? 'cream') as BgTone, reasoning: '' },
    bubbles: [{ shape: 'rounded', tailToSpeaker: true, reasoning: '' }],
    confidence: 0.85,
    seed: 42,
  }
}

function makeAnalyzed(
  scenes: {
    index: number
    location?: string
    cameraAngle?: string
    emotion?: string
    props?: string[]
    lineCount?: number
    characters?: string[]
  }[],
): AnalyzeResult {
  return {
    format: 'novel',
    scenes: scenes.map((s) => ({
      index: s.index,
      slug: `scene-${String(s.index).padStart(2, '0')}`,
      summary: `장면 ${s.index}`,
      meta: {
        location: s.location,
        cameraAngle: s.cameraAngle as AnalyzeResult['scenes'][0]['meta']['cameraAngle'],
        emotion: s.emotion,
        props: s.props,
      },
      lines: Array.from({ length: s.lineCount ?? 1 }, (_, i) => ({
        index: i,
        speaker: s.characters?.[0] ?? '주인공',
        text: `대사 ${i}`,
      })),
      characters: s.characters ?? ['주인공'],
      confidence: 0.9,
    })),
    characters: [{ name: '주인공', mentionCount: 5 }],
    seed: 42,
    modelVersion: 'rule-only',
  }
}

function makeRecommended(
  sceneIndices: number[],
  opts: { bgTone?: string; charNames?: string[] } = {},
): RecommendResult {
  return {
    scenes: sceneIndices.map((i) =>
      makeSceneRec(i, { bgTone: opts.bgTone, charNames: opts.charNames }),
    ),
    seed: 42,
    modelVersion: 'rule-only',
  }
}

// ─────────────────────────────────────────────
// fabricJson 검증 헬퍼
// ─────────────────────────────────────────────

function validateFabricJson(fabricJson: unknown): void {
  expect(fabricJson).toBeDefined()
  const fj = fabricJson as Record<string, unknown>
  expect(fj['v']).toBe(1)
  expect(fj['format']).toBeDefined()
  expect(Array.isArray(fj['layers'])).toBe(true)
}

function countSafeAreaWarnings(warnings: string[]): number {
  return warnings.filter((w) => w.includes('[safe-area]')).length
}

function hasSlotIdCollision(layers: Array<{ data?: { slotId?: string } }>): boolean {
  const slotIds = layers.map((l) => l.data?.slotId).filter(Boolean) as string[]
  return new Set(slotIds).size < slotIds.length
}

// ─────────────────────────────────────────────
// 골든 5 시나리오
// ─────────────────────────────────────────────

describe('G1: 1대1 대화', () => {
  const analyzed = makeAnalyzed([
    {
      index: 0,
      location: '학교',
      cameraAngle: 'medium',
      emotion: 'happy',
      characters: ['철수', '영희'],
    },
    {
      index: 1,
      location: '학교',
      cameraAngle: 'medium',
      emotion: 'happy',
      characters: ['철수', '영희'],
    },
  ])
  const recommended = makeRecommended([0, 1], { charNames: ['철수', '영희'] })

  it('fabricJson 유효 (v:1, format, layers)', async () => {
    const result = await compose(analyzed, recommended, BASE_OPTS)
    expect(result.pages.length).toBeGreaterThanOrEqual(1)
    for (const page of result.pages) {
      validateFabricJson(page.fabricJson)
    }
  })

  it('같은 location → 1 페이지로 합병', async () => {
    const result = await compose(analyzed, recommended, BASE_OPTS)
    // R4: 같은 location → 1on1-talk 합병
    expect(result.pages.length).toBe(1)
    expect(result.pages[0]?.sceneIndices).toEqual([0, 1])
  })

  it('safe area 침범 0', async () => {
    const result = await compose(analyzed, recommended, BASE_OPTS)
    const allWarnings = result.pages.flatMap((p) => p.warnings)
    expect(countSafeAreaWarnings(allWarnings)).toBe(0)
  })

  it('충돌 0 (slotId 중복 없음)', async () => {
    const result = await compose(analyzed, recommended, BASE_OPTS)
    for (const page of result.pages) {
      expect(
        hasSlotIdCollision(page.fabricJson.layers as Array<{ data?: { slotId?: string } }>),
      ).toBe(false)
    }
  })
})

describe('G2: 풀샷 단독', () => {
  const analyzed = makeAnalyzed([
    {
      index: 0,
      cameraAngle: 'wide',
      props: ['나무', '집', '차'],
      emotion: 'neutral',
      characters: ['주인공'],
    },
  ])
  const recommended = makeRecommended([0])

  it('fabricJson 유효', async () => {
    const result = await compose(analyzed, recommended, BASE_OPTS)
    validateFabricJson(result.pages[0]?.fabricJson)
  })

  it('풀샷 → 단독 페이지 (R3)', async () => {
    const result = await compose(analyzed, recommended, BASE_OPTS)
    expect(result.pages).toHaveLength(1)
    expect(result.pages[0]?.sceneIndices).toEqual([0])
  })

  it('safe area 침범 0', async () => {
    const result = await compose(analyzed, recommended, BASE_OPTS)
    const allWarnings = result.pages.flatMap((p) => p.warnings)
    expect(countSafeAreaWarnings(allWarnings)).toBe(0)
  })

  it('충돌 0', async () => {
    const result = await compose(analyzed, recommended, BASE_OPTS)
    const page = result.pages[0]
    if (!page) return
    expect(
      hasSlotIdCollision(page.fabricJson.layers as Array<{ data?: { slotId?: string } }>),
    ).toBe(false)
  })
})

describe('G3: 클로즈업', () => {
  const analyzed = makeAnalyzed([
    {
      index: 0,
      cameraAngle: 'closeup',
      emotion: 'surprised',
      characters: ['주인공'],
      lineCount: 1,
    },
  ])
  const recommended = makeRecommended([0])

  it('fabricJson 유효', async () => {
    const result = await compose(analyzed, recommended, BASE_OPTS)
    validateFabricJson(result.pages[0]?.fabricJson)
  })

  it('template preset-closeup 사용', async () => {
    const result = await compose(analyzed, recommended, BASE_OPTS)
    expect(result.pages[0]?.templateId).toBe('preset-closeup')
  })

  it('safe area 침범 0', async () => {
    const result = await compose(analyzed, recommended, BASE_OPTS)
    const allWarnings = result.pages.flatMap((p) => p.warnings)
    expect(countSafeAreaWarnings(allWarnings)).toBe(0)
  })

  it('충돌 0', async () => {
    const result = await compose(analyzed, recommended, BASE_OPTS)
    const page = result.pages[0]
    if (!page) return
    expect(
      hasSlotIdCollision(page.fabricJson.layers as Array<{ data?: { slotId?: string } }>),
    ).toBe(false)
  })
})

describe('G4: 풍경 단독', () => {
  const analyzed = makeAnalyzed([
    { index: 0, cameraAngle: 'wide', emotion: 'neutral', characters: ['주인공'] },
  ])
  const recommended = makeRecommended([0])

  it('fabricJson 유효', async () => {
    const result = await compose(analyzed, recommended, BASE_OPTS)
    validateFabricJson(result.pages[0]?.fabricJson)
  })

  it('template preset-wide 사용', async () => {
    const result = await compose(analyzed, recommended, BASE_OPTS)
    expect(result.pages[0]?.templateId).toBe('preset-wide')
  })

  it('safe area 침범 0', async () => {
    const result = await compose(analyzed, recommended, BASE_OPTS)
    const allWarnings = result.pages.flatMap((p) => p.warnings)
    expect(countSafeAreaWarnings(allWarnings)).toBe(0)
  })
})

describe('G5: 4컷 만화', () => {
  const analyzed = makeAnalyzed([
    { index: 0, cameraAngle: 'closeup', emotion: 'happy', lineCount: 4 },
    { index: 1, cameraAngle: 'closeup', emotion: 'happy', lineCount: 4 },
    { index: 2, cameraAngle: 'closeup', emotion: 'happy', lineCount: 4 },
    { index: 3, cameraAngle: 'closeup', emotion: 'happy', lineCount: 4 },
  ])
  const recommended = makeRecommended([0, 1, 2, 3])

  it('fabricJson 유효', async () => {
    const result = await compose(analyzed, recommended, BASE_OPTS)
    expect(result.pages.length).toBeGreaterThanOrEqual(1)
    for (const page of result.pages) {
      validateFabricJson(page.fabricJson)
    }
  })

  it('4개 closeup → 1 페이지 four-cut (R2)', async () => {
    const result = await compose(analyzed, recommended, BASE_OPTS)
    // R2: closeup×4 → 1페이지 합병
    expect(result.pages).toHaveLength(1)
    expect(result.pages[0]?.sceneIndices).toHaveLength(4)
    expect(result.pages[0]?.templateId).toBe('preset-four-cut')
  })

  it('safe area 침범 0', async () => {
    const result = await compose(analyzed, recommended, BASE_OPTS)
    const allWarnings = result.pages.flatMap((p) => p.warnings)
    expect(countSafeAreaWarnings(allWarnings)).toBe(0)
  })

  it('충돌 0', async () => {
    const result = await compose(analyzed, recommended, BASE_OPTS)
    for (const page of result.pages) {
      // 4컷은 슬롯이 많으므로 중복 체크 강화
      const slotIds = page.fabricJson.layers
        .map((l) => (l as { data?: { slotId?: string } }).data?.slotId)
        .filter(Boolean) as string[]
      expect(new Set(slotIds).size).toBe(slotIds.length)
    }
  })
})

// ─────────────────────────────────────────────
// 결정론 검증
// ─────────────────────────────────────────────

describe('결정론: 동일 seed → 동일 결과', () => {
  it('3회 호출 동일 결과', async () => {
    const analyzed = makeAnalyzed([
      {
        index: 0,
        location: '학교',
        cameraAngle: 'medium',
        emotion: 'happy',
        characters: ['철수', '영희'],
      },
      { index: 1, location: '학교', cameraAngle: 'medium', emotion: 'happy', characters: ['철수'] },
    ])
    const recommended = makeRecommended([0, 1], { charNames: ['철수', '영희'] })

    const r1 = await compose(analyzed, recommended, { ...BASE_OPTS, seed: 99 })
    const r2 = await compose(analyzed, recommended, { ...BASE_OPTS, seed: 99 })
    const r3 = await compose(analyzed, recommended, { ...BASE_OPTS, seed: 99 })

    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2))
    expect(JSON.stringify(r2)).toBe(JSON.stringify(r3))
  })

  it('다른 seed → 다른 ID (layer id)', async () => {
    const analyzed = makeAnalyzed([
      { index: 0, cameraAngle: 'medium', emotion: 'neutral', characters: ['주인공'] },
    ])
    const recommended = makeRecommended([0])

    const r1 = await compose(analyzed, recommended, { ...BASE_OPTS, seed: 1 })
    const r2 = await compose(analyzed, recommended, { ...BASE_OPTS, seed: 2 })

    // seed 가 다르면 layer id 가 달라야 함
    const ids1 = r1.pages[0]?.fabricJson.layers.map((l) => l.id) ?? []
    const ids2 = r2.pages[0]?.fabricJson.layers.map((l) => l.id) ?? []
    expect(ids1.join(',')).not.toBe(ids2.join(','))
  })
})

// ─────────────────────────────────────────────
// _aiMeta 검증
// ─────────────────────────────────────────────

describe('fabricJson._aiMeta', () => {
  it('generatedBy=ai-layout, schemaVersion=1', async () => {
    const analyzed = makeAnalyzed([{ index: 0, cameraAngle: 'medium' }])
    const recommended = makeRecommended([0])
    const result = await compose(analyzed, recommended, BASE_OPTS)
    const meta = result.pages[0]?.fabricJson._aiMeta
    expect(meta?.generatedBy).toBe('ai-layout')
    expect(meta?.schemaVersion).toBe(1)
    expect(meta?.seed).toBe(42)
  })
})
