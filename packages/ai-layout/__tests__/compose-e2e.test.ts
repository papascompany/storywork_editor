/**
 * compose-e2e.test.ts — 골든셋 5 + E2E + lowDpi 시나리오 (M4-03 Step 5 DoD)
 *
 * 검증:
 * - 골든 5 시나리오 모두 통과
 * - 충돌 0 + safe area 침범 0
 * - fabricJson Schema v1 라운드트립 (parsePageJson 호환)
 * - 결정론 (같은 seed → 같은 결과)
 * - lowDpi 자산 제약 검증 (ADR-0011a)
 */

import type { BgTone, RecommendResult, SceneRecommendation } from '@storywork/ai-recommend'
import type { AnalyzeResult } from '@storywork/ai-script'
import { describe, it, expect } from 'vitest'

import { compose } from '../src/compose.js'
import type { ComposeOptions, LayoutFormat, ResourceTagAdapter } from '../src/types.js'

// ─────────────────────────────────────────────
// 판형
// ─────────────────────────────────────────────

const B5: LayoutFormat = {
  id: 'b5',
  widthMm: 128,
  heightMm: 182,
  dpi: 350,
  bleedMm: 3,
  safeMm: 5,
}

const BASE: ComposeOptions = {
  formatId: 'b5',
  format: B5,
  seed: 777,
  preferredTemplateIds: [],
  enableSplitMerge: true,
}

// ─────────────────────────────────────────────
// 픽스처 헬퍼
// ─────────────────────────────────────────────

function rec(si: number, chars: string[], bgTone: BgTone = 'cream'): SceneRecommendation {
  const poses: Record<string, SceneRecommendation['poses'][string]> = {}
  for (const c of chars) {
    poses[c] = [
      {
        resourceId: `r-${c}-${si}`,
        characterId: `ch-${c}`,
        poseAction: 'standing',
        confidence: 0.9,
        reasoning: '',
      },
    ]
  }
  return {
    sceneIndex: si,
    poses,
    background: { suggestedTone: bgTone, reasoning: '' },
    bubbles: [{ shape: 'rounded', tailToSpeaker: true, reasoning: '' }],
    confidence: 0.85,
    seed: 777,
  }
}

function analyzed(
  scenes: {
    index: number
    location?: string
    cameraAngle?: string
    emotion?: string
    props?: string[]
    lineCount?: number
    chars?: string[]
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
        speaker: s.chars?.[0] ?? '주인공',
        text: `대사 ${i}`,
      })),
      characters: s.chars ?? ['주인공'],
      confidence: 0.9,
    })),
    characters: [{ name: '주인공', mentionCount: 5 }],
    seed: 777,
    modelVersion: 'rule-only',
  }
}

function recommended(recs: SceneRecommendation[]): RecommendResult {
  return { scenes: recs, seed: 777, modelVersion: 'rule-only' }
}

// ─────────────────────────────────────────────
// 공통 검증 헬퍼
// ─────────────────────────────────────────────

function assertNoConflict(result: Awaited<ReturnType<typeof compose>>): void {
  for (const page of result.pages) {
    const slotIds = page.fabricJson.layers
      .map((l) => (l as { data?: { slotId?: string } }).data?.slotId)
      .filter(Boolean) as string[]
    expect(new Set(slotIds).size).toBe(slotIds.length)
  }
}

function assertNoSafeAreaWarning(result: Awaited<ReturnType<typeof compose>>): void {
  const allWarnings = result.pages.flatMap((p) => p.warnings)
  const safeWarnings = allWarnings.filter((w) => w.includes('[safe-area]'))
  expect(safeWarnings).toHaveLength(0)
}

function assertFabricJsonV1(result: Awaited<ReturnType<typeof compose>>): void {
  for (const page of result.pages) {
    const fj = page.fabricJson as Record<string, unknown>
    expect(fj['v']).toBe(1)
    expect(typeof (fj['format'] as Record<string, unknown>)?.['widthMm']).toBe('number')
    expect(Array.isArray(fj['layers'])).toBe(true)
  }
}

// ─────────────────────────────────────────────
// 골든 시나리오 1: 1대1 대화
// ─────────────────────────────────────────────

describe('E2E-G1: 1대1 대화', () => {
  const a = analyzed([
    {
      index: 0,
      location: '교실',
      cameraAngle: 'medium',
      emotion: 'happy',
      chars: ['지수', '민준'],
    },
    {
      index: 1,
      location: '교실',
      cameraAngle: 'medium',
      emotion: 'happy',
      chars: ['지수', '민준'],
    },
  ])
  const r = recommended([rec(0, ['지수', '민준']), rec(1, ['지수', '민준'])])

  it('fabricJson v1 유효', async () => {
    assertFabricJsonV1(await compose(a, r, BASE))
  })

  it('충돌 0', async () => {
    assertNoConflict(await compose(a, r, BASE))
  })

  it('safe area 침범 0', async () => {
    assertNoSafeAreaWarning(await compose(a, r, BASE))
  })

  it('1on1-talk 합병 → 1 페이지', async () => {
    const result = await compose(a, r, BASE)
    expect(result.pages).toHaveLength(1)
    expect(result.pages[0]?.templateId).toBe('preset-1on1-talk')
  })
})

// ─────────────────────────────────────────────
// 골든 시나리오 2: 풀샷 단독
// ─────────────────────────────────────────────

describe('E2E-G2: 풀샷 단독', () => {
  const a = analyzed([
    {
      index: 0,
      cameraAngle: 'wide',
      props: ['산', '하늘', '강'],
      emotion: 'neutral',
      chars: ['여행자'],
    },
  ])
  const r = recommended([rec(0, ['여행자'])])

  it('fabricJson v1 유효', async () => {
    assertFabricJsonV1(await compose(a, r, BASE))
  })

  it('충돌 0', async () => {
    assertNoConflict(await compose(a, r, BASE))
  })

  it('safe area 침범 0', async () => {
    assertNoSafeAreaWarning(await compose(a, r, BASE))
  })

  it('full-shot-solo 단독 페이지', async () => {
    const result = await compose(a, r, BASE)
    expect(result.pages).toHaveLength(1)
    expect(result.pages[0]?.templateId).toBe('preset-full-shot-solo')
  })
})

// ─────────────────────────────────────────────
// 골든 시나리오 3: 클로즈업
// ─────────────────────────────────────────────

describe('E2E-G3: 클로즈업', () => {
  const a = analyzed([
    { index: 0, cameraAngle: 'closeup', emotion: 'angry', chars: ['주인공'], lineCount: 1 },
  ])
  const r = recommended([rec(0, ['주인공'])])

  it('fabricJson v1 유효', async () => {
    assertFabricJsonV1(await compose(a, r, BASE))
  })

  it('충돌 0', async () => {
    assertNoConflict(await compose(a, r, BASE))
  })

  it('safe area 침범 0', async () => {
    assertNoSafeAreaWarning(await compose(a, r, BASE))
  })

  it('closeup template 사용', async () => {
    const result = await compose(a, r, BASE)
    expect(result.pages[0]?.templateId).toBe('preset-closeup')
  })
})

// ─────────────────────────────────────────────
// 골든 시나리오 4: 풍경 단독
// ─────────────────────────────────────────────

describe('E2E-G4: 풍경 단독', () => {
  const a = analyzed([{ index: 0, cameraAngle: 'wide', emotion: 'calm', chars: ['나레이터'] }])
  const r = recommended([rec(0, ['나레이터'])])

  it('fabricJson v1 유효', async () => {
    assertFabricJsonV1(await compose(a, r, BASE))
  })

  it('충돌 0', async () => {
    assertNoConflict(await compose(a, r, BASE))
  })

  it('safe area 침범 0', async () => {
    assertNoSafeAreaWarning(await compose(a, r, BASE))
  })

  it('wide template 사용', async () => {
    const result = await compose(a, r, BASE)
    expect(result.pages[0]?.templateId).toBe('preset-wide')
  })
})

// ─────────────────────────────────────────────
// 골든 시나리오 5: 4컷 만화
// ─────────────────────────────────────────────

describe('E2E-G5: 4컷 만화', () => {
  const a = analyzed([
    { index: 0, cameraAngle: 'closeup', emotion: 'happy', chars: ['A'], lineCount: 4 },
    { index: 1, cameraAngle: 'closeup', emotion: 'happy', chars: ['A'], lineCount: 4 },
    { index: 2, cameraAngle: 'closeup', emotion: 'happy', chars: ['A'], lineCount: 4 },
    { index: 3, cameraAngle: 'closeup', emotion: 'happy', chars: ['A'], lineCount: 4 },
  ])
  const r = recommended([rec(0, ['A']), rec(1, ['A']), rec(2, ['A']), rec(3, ['A'])])

  it('fabricJson v1 유효', async () => {
    assertFabricJsonV1(await compose(a, r, BASE))
  })

  it('충돌 0', async () => {
    assertNoConflict(await compose(a, r, BASE))
  })

  it('safe area 침범 0', async () => {
    assertNoSafeAreaWarning(await compose(a, r, BASE))
  })

  it('four-cut 합병 → 1 페이지', async () => {
    const result = await compose(a, r, BASE)
    expect(result.pages).toHaveLength(1)
    expect(result.pages[0]?.templateId).toBe('preset-four-cut')
    expect(result.pages[0]?.sceneIndices).toHaveLength(4)
  })
})

// ─────────────────────────────────────────────
// 결정론 E2E
// ─────────────────────────────────────────────

describe('결정론 E2E', () => {
  const a = analyzed([
    { index: 0, location: '학교', cameraAngle: 'medium', emotion: 'happy', chars: ['A', 'B'] },
    { index: 1, cameraAngle: 'closeup', emotion: 'tense', chars: ['A'], lineCount: 4 },
    { index: 2, cameraAngle: 'wide', props: ['p1', 'p2', 'p3'], chars: ['B'] },
  ])
  const r = recommended([rec(0, ['A', 'B']), rec(1, ['A']), rec(2, ['B'])])

  it('seed=777 → 3회 동일 결과', async () => {
    const r1 = await compose(a, r, BASE)
    const r2 = await compose(a, r, BASE)
    const r3 = await compose(a, r, BASE)
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2))
    expect(JSON.stringify(r2)).toBe(JSON.stringify(r3))
  })

  it('충돌 0 (복합 시나리오)', async () => {
    assertNoConflict(await compose(a, r, BASE))
  })

  it('safe area 침범 0 (복합 시나리오)', async () => {
    assertNoSafeAreaWarning(await compose(a, r, BASE))
  })
})

// ─────────────────────────────────────────────
// lowDpi 시나리오 E2E (ADR-0011a)
// ─────────────────────────────────────────────

describe('lowDpi 시나리오 E2E', () => {
  const lowDpiAdapter: ResourceTagAdapter = {
    async getTags(rid) {
      return rid.includes('lowdpi') ? ['lowDpi'] : []
    },
    async getMasterSize(_rid) {
      return { w: 750, h: 750 }
    },
  }

  it('lowDpi 자산 + 풀샷 슬롯 → warning 발생', async () => {
    const a = analyzed([
      {
        index: 0,
        cameraAngle: 'wide',
        emotion: 'neutral',
        chars: ['주인공'],
        props: ['a', 'b', 'c'],
      },
    ])
    const r = recommended([
      {
        sceneIndex: 0,
        poses: {
          주인공: [
            {
              resourceId: 'res-lowdpi',
              characterId: 'c1',
              poseAction: 'standing',
              confidence: 0.9,
              reasoning: '',
            },
          ],
        },
        background: { suggestedTone: 'cream', reasoning: '' },
        bubbles: [],
        confidence: 0.8,
        seed: 777,
      },
    ])
    const result = await compose(a, r, { ...BASE, _resourceTagAdapter: lowDpiAdapter })
    const allWarnings = result.pages.flatMap((p) => p.warnings)
    const lowDpiWarns = allWarnings.filter((w) => w.includes('[lowDpi]') || w.includes('lowDpi'))
    expect(lowDpiWarns.length).toBeGreaterThan(0)
  })

  it('lowDpi 자산 + 작은 슬롯(0.3×0.3) → size-violation 없음', async () => {
    // 커스텀 template: 포즈 슬롯 0.3×0.3 (54.6mm < 91mm)
    const smallTemplate = {
      id: 'small-pose',
      name: '작은 포즈',
      slots: [
        { id: 'bg', allowedKinds: ['bg'], x: 0, y: 0, w: 1, h: 1, zIndex: 0, optional: false },
        {
          id: 'pose-sm',
          allowedKinds: ['pose'],
          x: 0.35,
          y: 0.35,
          w: 0.3,
          h: 0.3,
          zIndex: 1,
          optional: false,
        },
      ],
    }
    const a = analyzed([
      { index: 0, cameraAngle: 'closeup', emotion: 'neutral', chars: ['주인공'] },
    ])
    const r = recommended([
      {
        sceneIndex: 0,
        poses: {
          주인공: [
            {
              resourceId: 'res-lowdpi',
              characterId: 'c1',
              poseAction: 'standing',
              confidence: 0.9,
              reasoning: '',
            },
          ],
        },
        background: { suggestedTone: 'cream', reasoning: '' },
        bubbles: [],
        confidence: 0.8,
        seed: 777,
      },
    ])
    const result = await compose(a, r, {
      ...BASE,
      _templates: [smallTemplate],
      preferredTemplateIds: ['small-pose'],
      _resourceTagAdapter: lowDpiAdapter,
    })
    const allWarnings = result.pages.flatMap((p) => p.warnings)
    const sizeViolations = allWarnings.filter((w) => w.includes('size-violation'))
    expect(sizeViolations).toHaveLength(0)
  })

  it('non-lowDpi 자산 + 풀샷 슬롯 → lowDpi warning 없음', async () => {
    const a = analyzed([
      {
        index: 0,
        cameraAngle: 'wide',
        emotion: 'neutral',
        chars: ['주인공'],
        props: ['a', 'b', 'c'],
      },
    ])
    const r = recommended([
      {
        sceneIndex: 0,
        poses: {
          주인공: [
            {
              resourceId: 'res-hd',
              characterId: 'c1',
              poseAction: 'standing',
              confidence: 0.9,
              reasoning: '',
            },
          ],
        },
        background: { suggestedTone: 'cream', reasoning: '' },
        bubbles: [],
        confidence: 0.8,
        seed: 777,
      },
    ])
    const result = await compose(a, r, { ...BASE, _resourceTagAdapter: lowDpiAdapter })
    const allWarnings = result.pages.flatMap((p) => p.warnings)
    const lowDpiWarns = allWarnings.filter((w) => w.includes('[lowDpi]'))
    expect(lowDpiWarns).toHaveLength(0)
  })
})
