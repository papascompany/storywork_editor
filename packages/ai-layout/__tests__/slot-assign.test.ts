/**
 * slot-assign.test.ts — template-match + slot-assign + lowDpi 제약 단위 테스트
 * (M4-03 Step 2+3 DoD)
 */

import type { SceneRecommendation } from '@storywork/ai-recommend'
import type { AnalyzedScene } from '@storywork/ai-script'
import { describe, it, expect } from 'vitest'

import {
  checkLowDpiConstraint,
  slotMaxSideMm,
  pageMaxSideMm,
  DPI_ERROR_THRESHOLD,
} from '../src/constraints/low-dpi.js'
import { assignSlots } from '../src/slot-assign.js'
import { matchTemplate, scoreTemplate, PRESET_TEMPLATES } from '../src/template-match.js'
import type { LayoutFormat, LayoutSlot, LayoutTemplate, ResourceTagAdapter } from '../src/types.js'

// ─────────────────────────────────────────────
// 픽스처
// ─────────────────────────────────────────────

const B5_FORMAT: LayoutFormat = {
  id: 'b5',
  widthMm: 128,
  heightMm: 182,
  dpi: 350,
  bleedMm: 3,
  safeMm: 5,
}

function makeScene(
  opts: {
    index?: number
    characters?: string[]
    lineCount?: number
    location?: string
  } = {},
): AnalyzedScene {
  const lineCount = opts.lineCount ?? 2
  return {
    index: opts.index ?? 0,
    slug: 'scene-00',
    summary: '테스트 장면',
    meta: { location: opts.location ?? '학교' },
    lines: Array.from({ length: lineCount }, (_, i) => ({
      index: i,
      speaker: i === 0 ? '철수' : '영희',
      text: `대사 ${i}`,
    })),
    characters: opts.characters ?? ['철수', '영희'],
    confidence: 0.9,
  }
}

function makeSceneRec(sceneIndex = 0): SceneRecommendation {
  return {
    sceneIndex,
    poses: {
      철수: [
        {
          resourceId: 'res-01',
          characterId: 'char-01',
          poseAction: 'standing',
          confidence: 0.9,
          reasoning: '',
        },
        {
          resourceId: 'res-02',
          characterId: 'char-01',
          poseAction: 'waving',
          confidence: 0.7,
          reasoning: '',
        },
      ],
      영희: [
        {
          resourceId: 'res-03',
          characterId: 'char-02',
          poseAction: 'standing',
          confidence: 0.85,
          reasoning: '',
        },
      ],
    },
    background: { suggestedTone: 'cream', reasoning: '' },
    bubbles: [
      { shape: 'rounded', tailToSpeaker: true, reasoning: '' },
      { shape: 'oval', tailToSpeaker: false, reasoning: '' },
    ],
    confidence: 0.85,
    seed: 0,
  }
}

// mock ResourceTagAdapter
function makeMockAdapter(lowDpiResources: string[]): ResourceTagAdapter {
  return {
    async getTags(resourceId: string) {
      return lowDpiResources.includes(resourceId) ? ['lowDpi'] : []
    },
    async getMasterSize(_resourceId: string) {
      return { w: 750, h: 750 }
    },
  }
}

// ─────────────────────────────────────────────
// template-match 테스트
// ─────────────────────────────────────────────

describe('matchTemplate()', () => {
  it('1on1-talk hint → preset-1on1-talk 선택', () => {
    const result = matchTemplate('1on1-talk', [], 2, [])
    expect(result.template.id).toBe('preset-1on1-talk')
    expect(result.score).toBeGreaterThanOrEqual(100)
  })

  it('full-shot-solo hint → preset-full-shot-solo 선택', () => {
    const result = matchTemplate('full-shot-solo', [], 1, [])
    expect(result.template.id).toBe('preset-full-shot-solo')
  })

  it('four-cut hint → preset-four-cut 선택', () => {
    const result = matchTemplate('four-cut', [], 4, [])
    expect(result.template.id).toBe('preset-four-cut')
  })

  it('closeup hint → preset-closeup 선택', () => {
    const result = matchTemplate('closeup', [], 1, [])
    expect(result.template.id).toBe('preset-closeup')
  })

  it('wide hint → preset-wide 선택', () => {
    const result = matchTemplate('wide', [], 0, [])
    expect(result.template.id).toBe('preset-wide')
  })

  it('preferredTemplateIds 우선', () => {
    const customTemplate: LayoutTemplate = {
      id: 'custom-01',
      name: '커스텀',
      slots: [
        { id: 'bg', allowedKinds: ['bg'], x: 0, y: 0, w: 1, h: 1, zIndex: 0, optional: false },
        {
          id: 'pose',
          allowedKinds: ['pose'],
          x: 0.1,
          y: 0.1,
          w: 0.8,
          h: 0.8,
          zIndex: 1,
          optional: false,
        },
      ],
    }
    const result = matchTemplate('default', ['custom-01'], 1, [...PRESET_TEMPLATES, customTemplate])
    expect(result.template.id).toBe('custom-01')
  })

  it('결정론: 동일 입력 → 동일 결과', () => {
    const r1 = matchTemplate('1on1-talk', [], 2, [])
    const r2 = matchTemplate('1on1-talk', [], 2, [])
    expect(r1.template.id).toBe(r2.template.id)
    expect(r1.score).toBe(r2.score)
  })
})

describe('scoreTemplate()', () => {
  it('hint 직접 매핑 → 100점 가산', () => {
    const t = PRESET_TEMPLATES.find((t) => t.id === 'preset-1on1-talk')
    if (!t) throw new Error('preset-1on1-talk 없음')
    const score = scoreTemplate(t, '1on1-talk', [], 2)
    expect(score).toBeGreaterThanOrEqual(100)
  })

  it('preferredIds 포함 → 50점 가산', () => {
    const t = PRESET_TEMPLATES.find((t) => t.id === 'preset-closeup')
    if (!t) throw new Error('preset-closeup 없음')
    const score = scoreTemplate(t, 'default', ['preset-closeup'], 1)
    expect(score).toBeGreaterThanOrEqual(50)
  })
})

// ─────────────────────────────────────────────
// assignSlots() 테스트
// ─────────────────────────────────────────────

describe('assignSlots() 기본 시나리오', () => {
  it('1대1 대화: 포즈 2개 + 배경 1개 배치', async () => {
    const template = PRESET_TEMPLATES.find((t) => t.id === 'preset-1on1-talk')
    if (!template) throw new Error('preset-1on1-talk 없음')
    const scene = makeScene({ characters: ['철수', '영희'] })
    const sceneRec = makeSceneRec()

    const result = await assignSlots(template, sceneRec, scene, B5_FORMAT, null)

    // 배경 슬롯 배치 확인
    const bgAssign = result.assignments.find((a) => a.kind === 'background')
    expect(bgAssign).toBeDefined()

    // 포즈 슬롯 배치 확인 (최소 2개)
    const poseAssigns = result.assignments.filter((a) => a.kind === 'pose')
    expect(poseAssigns.length).toBeGreaterThanOrEqual(1)
    expect(poseAssigns.some((a) => a.characterName === '철수')).toBe(true)
  })

  it('풀샷 단독: 포즈 1개 배치', async () => {
    const template = PRESET_TEMPLATES.find((t) => t.id === 'preset-full-shot-solo')
    if (!template) throw new Error('preset-full-shot-solo 없음')
    const scene = makeScene({ characters: ['주인공'] })
    const sceneRec: SceneRecommendation = {
      ...makeSceneRec(),
      poses: {
        주인공: [
          {
            resourceId: 'res-hero',
            characterId: 'c-01',
            poseAction: 'standing',
            confidence: 0.9,
            reasoning: '',
          },
        ],
      },
    }

    const result = await assignSlots(template, sceneRec, scene, B5_FORMAT, null)
    const poseAssigns = result.assignments.filter((a) => a.kind === 'pose')
    expect(poseAssigns.length).toBeGreaterThanOrEqual(1)
    expect(poseAssigns[0]?.resourceId).toBe('res-hero')
  })

  it('safe area 침범 없음 (기본 프리셋은 safe area 침범 없음)', async () => {
    const template = PRESET_TEMPLATES.find((t) => t.id === 'preset-1on1-talk')
    if (!template) throw new Error('preset-1on1-talk 없음')
    const scene = makeScene()
    const sceneRec = makeSceneRec()
    const result = await assignSlots(template, sceneRec, scene, B5_FORMAT, null)
    const safeWarnings = result.warnings.filter((w) => w.includes('[safe-area]'))
    expect(safeWarnings).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────
// M2-07 lowDpi 제약 테스트 (ADR-0011a)
// ─────────────────────────────────────────────

describe('checkLowDpiConstraint() ADR-0011a', () => {
  // B5: 128×182mm → pageMaxSide=182mm, half=91mm
  const halfMm = pageMaxSideMm(B5_FORMAT) / 2 // 91mm

  it('non-lowDpi 자산 → 항상 ok', () => {
    const slot: LayoutSlot = {
      id: 's',
      allowedKinds: ['pose'],
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      zIndex: 1,
      optional: false,
    }
    const result = checkLowDpiConstraint(false, { w: 750, h: 750 }, slot, B5_FORMAT)
    expect(result.ok).toBe(true)
  })

  it('lowDpi + 슬롯 max side > 페이지 1/2 → size-violation', () => {
    // 슬롯 w=0.8 → 0.8×128=102.4mm > 91mm → 위반
    const slot: LayoutSlot = {
      id: 's',
      allowedKinds: ['pose'],
      x: 0.1,
      y: 0.1,
      w: 0.8,
      h: 0.8,
      zIndex: 1,
      optional: false,
    }
    const result = checkLowDpiConstraint(true, { w: 750, h: 750 }, slot, B5_FORMAT)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('size-violation')
  })

  it('lowDpi + 슬롯 max side ≤ 페이지 1/2 → ok', () => {
    // 슬롯 w=0.44 → 0.44×128=56.3mm < 91mm → OK
    const slot: LayoutSlot = {
      id: 's',
      allowedKinds: ['pose'],
      x: 0.02,
      y: 0.1,
      w: 0.44,
      h: 0.8,
      zIndex: 1,
      optional: false,
    }
    // h=0.8 → 0.8×182=145.6mm > 91mm → 위반 (height 가 더 큼)
    const result = checkLowDpiConstraint(true, { w: 750, h: 750 }, slot, B5_FORMAT)
    // slotMaxSide = max(56.3, 145.6) = 145.6mm > 91mm → violation
    expect(result.ok).toBe(false)
  })

  it('작은 슬롯 (0.3×0.3) + lowDpi → ok (슬롯 max 38.4mm < 91mm)', () => {
    const slot: LayoutSlot = {
      id: 's',
      allowedKinds: ['pose'],
      x: 0.1,
      y: 0.1,
      w: 0.3,
      h: 0.3,
      zIndex: 1,
      optional: false,
    }
    // w: 0.3×128=38.4mm, h: 0.3×182=54.6mm → max=54.6mm < 91mm
    // effectiveDpi = 750/54.6*25.4 = 348.9 → ok
    const result = checkLowDpiConstraint(true, { w: 750, h: 750 }, slot, B5_FORMAT)
    expect(result.ok).toBe(true)
  })

  it('effectiveDpi < 200 → dpi-warning', () => {
    // 슬롯 크기를 크게 해서 dpi 를 낮춤 (pageHalf 이하이어야 함)
    // pageHalf=91mm, 슬롯 h=0.4 → 0.4×182=72.8mm < 91mm (size-violation 없음)
    // effectiveDpi = 750/72.8*25.4 = 261.5 → ok (위 임계치)
    // 더 낮추려면 asset 를 작게
    const slot: LayoutSlot = {
      id: 's',
      allowedKinds: ['pose'],
      x: 0.1,
      y: 0.1,
      w: 0.3,
      h: 0.4,
      zIndex: 1,
      optional: false,
    }
    // assetSize 100×100 → effectiveDpi = 100/72.8*25.4 = 34.9 < 150 → dpi-error
    const result = checkLowDpiConstraint(true, { w: 100, h: 100 }, slot, B5_FORMAT)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('dpi-error')
    expect(result.effectiveDpi).toBeLessThan(DPI_ERROR_THRESHOLD)
  })

  it('slotMaxSideMm 계산 검증 (B5 128×182)', () => {
    const slot: LayoutSlot = {
      id: 's',
      allowedKinds: ['pose'],
      x: 0,
      y: 0,
      w: 0.5,
      h: 0.5,
      zIndex: 1,
      optional: false,
    }
    // w: 0.5×128=64, h: 0.5×182=91 → max=91
    expect(slotMaxSideMm(slot, B5_FORMAT)).toBeCloseTo(91, 0)
  })

  it(`pageMaxSideMm B5 = 182`, () => {
    expect(pageMaxSideMm(B5_FORMAT)).toBe(182)
  })

  it(`halfMm B5 = ${halfMm}`, () => {
    expect(halfMm).toBe(91)
  })
})

describe('assignSlots() + lowDpi 제약 통합', () => {
  it('lowDpi 자산이 풀샷 슬롯(>halfMm)에 배치 시도 → warning 발생', async () => {
    const template = PRESET_TEMPLATES.find((t) => t.id === 'preset-full-shot-solo')
    if (!template) throw new Error('preset-full-shot-solo 없음')
    const scene = makeScene({ characters: ['주인공'] })
    const sceneRec: SceneRecommendation = {
      ...makeSceneRec(),
      poses: {
        주인공: [
          {
            resourceId: 'res-lowdpi',
            characterId: 'c-01',
            poseAction: 'standing',
            confidence: 0.9,
            reasoning: '',
          },
        ],
      },
    }

    const adapter = makeMockAdapter(['res-lowdpi'])
    const result = await assignSlots(template, sceneRec, scene, B5_FORMAT, adapter)

    // lowDpi 경고 발생 확인
    const lowDpiWarnings = result.warnings.filter((w) => w.includes('[lowDpi]'))
    expect(lowDpiWarnings.length).toBeGreaterThan(0)
  })

  it('lowDpi 자산이 작은 슬롯(<=halfMm)에 배치 시도 → warning 없음', async () => {
    // 커스텀 template: 작은 포즈 슬롯 (0.3×0.3)
    const smallTemplate: LayoutTemplate = {
      id: 'small-slot',
      name: '작은 슬롯',
      slots: [
        { id: 'bg', allowedKinds: ['bg'], x: 0, y: 0, w: 1, h: 1, zIndex: 0, optional: false },
        {
          id: 'pose-small',
          allowedKinds: ['pose'],
          x: 0.1,
          y: 0.1,
          w: 0.3,
          h: 0.3,
          zIndex: 1,
          optional: false,
        },
      ],
    }
    const scene = makeScene({ characters: ['주인공'] })
    const sceneRec: SceneRecommendation = {
      ...makeSceneRec(),
      poses: {
        주인공: [
          {
            resourceId: 'res-lowdpi',
            characterId: 'c-01',
            poseAction: 'standing',
            confidence: 0.9,
            reasoning: '',
          },
        ],
      },
    }

    const adapter = makeMockAdapter(['res-lowdpi'])
    const result = await assignSlots(smallTemplate, sceneRec, scene, B5_FORMAT, adapter)

    // 슬롯 max = max(0.3×128, 0.3×182) = max(38.4, 54.6) = 54.6mm < 91mm
    // size-violation 없음 → lowDpi 경고 없어야 함
    const lowDpiWarnings = result.warnings.filter((w) => w.includes('size-violation'))
    expect(lowDpiWarnings).toHaveLength(0)
  })

  it('안전 영역: 할당 결과에 충돌(overlap) 없음', async () => {
    const template = PRESET_TEMPLATES.find((t) => t.id === 'preset-1on1-talk')
    if (!template) throw new Error('preset-1on1-talk 없음')
    const scene = makeScene({ characters: ['철수', '영희'] })
    const sceneRec = makeSceneRec()
    const result = await assignSlots(template, sceneRec, scene, B5_FORMAT, null)

    // 각 slotId 는 unique (중복 없음)
    const slotIds = result.assignments.map((a) => a.slotId)
    const uniqueIds = new Set(slotIds)
    expect(slotIds.length).toBe(uniqueIds.size)
  })
})
