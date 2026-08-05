/**
 * capacity.test.ts — 대사 수용량 기반 페이지 계획 (LAYOUT-03)
 *
 * 검증 항목:
 *  - 말풍선 슬롯 동적 생성: safe area 준수 · 기존 슬롯 회피 · 상한 · 결정론
 *  - 수용량 인식 템플릿 매칭: 못 채우는 필수 포즈 슬롯 배제(= `empty-slot` 원인 제거)
 *  - 페이지 분할: 구간이 겹치지 않고 장면 전체를 덮는다 (대사 유실 0의 근거)
 *  - 합병 해제: 대사가 넘치거나 컷을 다 못 보여주면 장면별 페이지로
 */

import type { AnalyzeResult, AnalyzedScene } from '@storywork/ai-script'
import { describe, expect, it } from 'vitest'

import {
  generateBubbleSlots,
  MAX_BUBBLES_PER_PAGE,
  pageBubbleCapacity,
  withGeneratedBubbleSlots,
} from '../src/bubble-slots.js'
import { planCapacityPages, resolveTemplateHint, sceneSpeakers } from '../src/capacity.js'
import { matchTemplate, PRESET_TEMPLATES } from '../src/template-match.js'
import type { LayoutFormat, LayoutTemplate, PageGroup } from '../src/types.js'

const B5: LayoutFormat = {
  id: 'b5',
  widthMm: 128,
  heightMm: 182,
  dpi: 350,
  bleedMm: 3,
  safeMm: 5,
}

function preset(id: string): LayoutTemplate {
  const t = PRESET_TEMPLATES.find((p) => p.id === id)
  if (!t) throw new Error(`preset ${id} 없음`)
  return t
}

function makeScene(
  index: number,
  opts: { lines?: number; characters?: string[]; cameraAngle?: string } = {},
): AnalyzedScene {
  const characters = opts.characters ?? ['주인공']
  return {
    index,
    slug: `scene-${index}`,
    summary: `장면 ${index}`,
    meta: { cameraAngle: opts.cameraAngle as AnalyzedScene['meta']['cameraAngle'] },
    lines: Array.from({ length: opts.lines ?? 0 }, (_, i) => ({
      index: i,
      speaker: characters[0],
      text: `대사 ${index}-${i}`,
    })),
    characters,
    confidence: 0.9,
  }
}

function makeAnalyzed(scenes: AnalyzedScene[]): AnalyzeResult {
  return {
    format: 'novel',
    scenes,
    characters: [...new Set(scenes.flatMap((s) => s.characters))].map((name) => ({
      name,
      mentionCount: 1,
    })),
    seed: 0,
    modelVersion: 'rule-only',
  }
}

const CTX = { templates: [] as LayoutTemplate[], preferredIds: [] as string[], format: B5 }

// ─────────────────────────────────────────────
// 말풍선 슬롯 동적 생성
// ─────────────────────────────────────────────

describe('generateBubbleSlots()', () => {
  const safeX = B5.safeMm / B5.widthMm
  const safeY = B5.safeMm / B5.heightMm

  it('생성 슬롯은 safe area 안에 있다 (인쇄 사고 방지)', () => {
    for (const template of PRESET_TEMPLATES) {
      for (const slot of generateBubbleSlots(template, B5, MAX_BUBBLES_PER_PAGE)) {
        expect(slot.x).toBeGreaterThanOrEqual(safeX - 1e-9)
        expect(slot.y).toBeGreaterThanOrEqual(safeY - 1e-9)
        expect(slot.x + slot.w).toBeLessThanOrEqual(1 - safeX + 1e-9)
        expect(slot.y + slot.h).toBeLessThanOrEqual(1 - safeY + 1e-9)
      }
    }
  })

  it('생성 슬롯은 optional — 대사가 모자라면 그냥 빈다', () => {
    const slots = generateBubbleSlots(preset('preset-closeup'), B5, 3)
    expect(slots.length).toBe(3)
    expect(slots.every((s) => s.optional)).toBe(true)
    expect(slots.every((s) => s.allowedKinds.includes('bubble'))).toBe(true)
  })

  it('기존 말풍선 슬롯 자리를 침범하지 않는다', () => {
    const template = preset('preset-1on1-talk')
    const existing = template.slots.filter((s) => s.allowedKinds.includes('bubble'))
    for (const gen of generateBubbleSlots(template, B5, MAX_BUBBLES_PER_PAGE)) {
      for (const e of existing) {
        const w = Math.min(gen.x + gen.w, e.x + e.w) - Math.max(gen.x, e.x)
        const h = Math.min(gen.y + gen.h, e.y + e.h) - Math.max(gen.y, e.y)
        const overlap = w > 0 && h > 0 ? (w * h) / (gen.w * gen.h) : 0
        expect(overlap).toBeLessThanOrEqual(0.15 + 1e-9)
      }
    }
  })

  it('생성 슬롯끼리도 크게 겹치지 않는다', () => {
    const slots = generateBubbleSlots(preset('preset-wide'), B5, MAX_BUBBLES_PER_PAGE)
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i]
        const b = slots[j]
        if (!a || !b) continue
        const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
        const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
        const overlap = w > 0 && h > 0 ? (w * h) / (a.w * a.h) : 0
        expect(overlap).toBeLessThanOrEqual(0.05 + 1e-9)
      }
    }
  })

  it('결정론: 같은 입력 → 같은 슬롯', () => {
    const a = generateBubbleSlots(preset('preset-1on1-talk'), B5, 4)
    const b = generateBubbleSlots(preset('preset-1on1-talk'), B5, 4)
    expect(a).toEqual(b)
  })

  it('요청이 0 이하면 생성하지 않는다', () => {
    expect(generateBubbleSlots(preset('preset-wide'), B5, 0)).toEqual([])
    expect(generateBubbleSlots(preset('preset-wide'), B5, -1)).toEqual([])
  })
})

describe('pageBubbleCapacity() / withGeneratedBubbleSlots()', () => {
  it('수용량은 페이지 상한을 넘지 않는다', () => {
    for (const template of PRESET_TEMPLATES) {
      const cap = pageBubbleCapacity(template, B5)
      expect(cap).toBeGreaterThan(0)
      expect(cap).toBeLessThanOrEqual(MAX_BUBBLES_PER_PAGE)
    }
  })

  it('보강 결과 슬롯 수가 수용량 계산과 일치한다 (어긋나면 대사가 유실된다)', () => {
    for (const template of PRESET_TEMPLATES) {
      const cap = pageBubbleCapacity(template, B5)
      const augmented = withGeneratedBubbleSlots(template, B5, cap)
      const bubbles = augmented.slots.filter(
        (s) => s.allowedKinds.includes('bubble') || s.allowedKinds.includes('text'),
      )
      expect(bubbles.length).toBeGreaterThanOrEqual(cap)
    }
  })

  it('필요 수가 기존 슬롯 이하면 원본을 그대로 쓴다', () => {
    const template = preset('preset-four-cut')
    expect(withGeneratedBubbleSlots(template, B5, 2)).toBe(template)
  })
})

// ─────────────────────────────────────────────
// 수용량 인식 템플릿 매칭
// ─────────────────────────────────────────────

describe('matchTemplate() — 수용량 인식 (LAYOUT-03)', () => {
  it('화자가 없으면 필수 포즈 슬롯이 있는 템플릿을 고르지 않는다', () => {
    // baseline `empty-slot` 61건의 원인 — 화자 0인 장면에 2인 템플릿이 붙었다
    const { template } = matchTemplate('default', [], 0, [], {
      dialogueCount: 3,
      requiredPoseCount: 0,
    })
    const requiredPose = template.slots.filter(
      (s) => s.allowedKinds.includes('pose') && !s.optional,
    )
    expect(requiredPose).toHaveLength(0)
  })

  it('컷 수보다 포즈 슬롯이 적은 템플릿은 고르지 않는다', () => {
    const { template } = matchTemplate('closeup', [], 2, [], {
      dialogueCount: 2,
      requiredPoseCount: 2,
    })
    const poseSlots = template.slots.filter((s) => s.allowedKinds.includes('pose'))
    expect(poseSlots.length).toBeGreaterThanOrEqual(2)
  })

  it('실현 가능한 후보가 없으면 전체 풀로 완화해 항상 매칭된다', () => {
    const impossible: LayoutTemplate[] = [
      {
        id: 'only-one',
        name: '단독',
        slots: [
          { id: 'p', allowedKinds: ['pose'], x: 0, y: 0, w: 1, h: 1, zIndex: 1, optional: false },
        ],
      },
    ]
    const { template } = matchTemplate('default', [], 0, impossible, { requiredPoseCount: 9 })
    expect(template.id).toBe('only-one')
  })
})

describe('resolveTemplateHint()', () => {
  it("'default' 는 장면 수·카메라 앵글로 다시 추론한다", () => {
    expect(resolveTemplateHint('default', 4, makeScene(0))).toBe('four-cut')
    expect(resolveTemplateHint('default', 2, makeScene(0))).toBe('1on1-talk')
    expect(resolveTemplateHint('default', 1, makeScene(0, { cameraAngle: 'closeup' }))).toBe(
      'closeup',
    )
  })

  it('명시적 힌트는 보존한다 (R3 풀샷 단독 등)', () => {
    expect(resolveTemplateHint('full-shot-solo', 1, makeScene(0))).toBe('full-shot-solo')
  })
})

// ─────────────────────────────────────────────
// 페이지 계획
// ─────────────────────────────────────────────

describe('planCapacityPages() — 페이지 분할', () => {
  it('수용량 안이면 나누지 않는다', () => {
    const analyzed = makeAnalyzed([makeScene(0, { lines: 2 })])
    const groups: PageGroup[] = [{ pageIndex: 0, sceneIndices: [0], templateHint: 'default' }]
    const planned = planCapacityPages(groups, analyzed, CTX)
    expect(planned).toHaveLength(1)
    expect(planned[0]?.lineRanges).toBeUndefined()
    expect(planned[0]?.templateId).toBeDefined()
  })

  it('수용량을 넘으면 나누고, 구간이 장면 전체를 빠짐없이 덮는다', () => {
    const lineCount = 17
    const analyzed = makeAnalyzed([makeScene(0, { lines: lineCount })])
    const groups: PageGroup[] = [{ pageIndex: 0, sceneIndices: [0], templateHint: 'default' }]
    const planned = planCapacityPages(groups, analyzed, CTX)

    expect(planned.length).toBeGreaterThan(1)
    const ranges = planned.flatMap((p) => p.lineRanges ?? [])
    expect(ranges).toHaveLength(planned.length)

    // 구간이 [0, lineCount) 를 겹침 없이 정확히 덮는가 — 대사 유실 0 의 근거
    const covered = ranges.flatMap((r) => {
      const out: number[] = []
      for (let i = r.start; i < r.end; i++) out.push(i)
      return out
    })
    expect(covered.sort((a, b) => a - b)).toEqual(Array.from({ length: lineCount }, (_, i) => i))
  })

  it('페이지당 대사가 수용량을 넘지 않는다', () => {
    const analyzed = makeAnalyzed([makeScene(0, { lines: 23 })])
    const planned = planCapacityPages(
      [{ pageIndex: 0, sceneIndices: [0], templateHint: 'default' }],
      analyzed,
      CTX,
    )
    for (const page of planned) {
      const range = page.lineRanges?.[0]
      expect(range).toBeDefined()
      expect((range?.end ?? 0) - (range?.start ?? 0)).toBeLessThanOrEqual(MAX_BUBBLES_PER_PAGE)
    }
  })

  it('pageIndex 는 0부터 연속 재부여된다', () => {
    const analyzed = makeAnalyzed([makeScene(0, { lines: 14 }), makeScene(1, { lines: 2 })])
    const planned = planCapacityPages(
      [
        { pageIndex: 0, sceneIndices: [0], templateHint: 'default' },
        { pageIndex: 1, sceneIndices: [1], templateHint: 'default' },
      ],
      analyzed,
      CTX,
    )
    expect(planned.map((p) => p.pageIndex)).toEqual(planned.map((_, i) => i))
  })

  it('allowSplit=false 면 나누지 않는다 (enableSplitMerge=false 계약)', () => {
    const analyzed = makeAnalyzed([makeScene(0, { lines: 20 })])
    const planned = planCapacityPages(
      [{ pageIndex: 0, sceneIndices: [0], templateHint: 'default' }],
      analyzed,
      { ...CTX, allowSplit: false },
    )
    expect(planned).toHaveLength(1)
    expect(planned[0]?.lineRanges).toBeUndefined()
  })

  it('결정론: 같은 입력 → 같은 계획', () => {
    const analyzed = makeAnalyzed([makeScene(0, { lines: 11 })])
    const groups: PageGroup[] = [{ pageIndex: 0, sceneIndices: [0], templateHint: 'default' }]
    expect(planCapacityPages(groups, analyzed, CTX)).toEqual(
      planCapacityPages(groups, analyzed, CTX),
    )
  })
})

describe('planCapacityPages() — 합병 해제', () => {
  it('합병 페이지가 대사를 다 못 담으면 장면별로 나눈다', () => {
    const analyzed = makeAnalyzed([
      makeScene(0, { lines: 5, cameraAngle: 'closeup' }),
      makeScene(1, { lines: 5, cameraAngle: 'closeup' }),
    ])
    const planned = planCapacityPages(
      [{ pageIndex: 0, sceneIndices: [0, 1], templateHint: '1on1-talk' }],
      analyzed,
      CTX,
    )
    expect(planned.length).toBeGreaterThanOrEqual(2)
    expect(planned.every((p) => p.sceneIndices.length === 1)).toBe(true)
  })

  it('컷을 다 보여줄 수 없으면 장면별로 나눈다', () => {
    // preset-closeup 은 포즈 슬롯 1개 — 3컷을 담을 수 없다
    const analyzed = makeAnalyzed([
      makeScene(0, { lines: 1, cameraAngle: 'closeup' }),
      makeScene(1, { lines: 1, cameraAngle: 'closeup' }),
      makeScene(2, { lines: 1, cameraAngle: 'closeup' }),
    ])
    const planned = planCapacityPages(
      [{ pageIndex: 0, sceneIndices: [0, 1, 2], templateHint: 'closeup' }],
      analyzed,
      CTX,
    )
    for (const page of planned) {
      const template = preset(page.templateId ?? '')
      const poseSlots = template.slots.filter((s) => s.allowedKinds.includes('pose'))
      expect(poseSlots.length).toBeGreaterThanOrEqual(page.sceneIndices.length)
    }
  })

  it('대사가 수용량 안이면 합병을 유지한다', () => {
    const analyzed = makeAnalyzed([
      makeScene(0, { lines: 1, characters: ['A'] }),
      makeScene(1, { lines: 1, characters: ['B'] }),
    ])
    const planned = planCapacityPages(
      [{ pageIndex: 0, sceneIndices: [0, 1], templateHint: '1on1-talk' }],
      analyzed,
      CTX,
    )
    expect(planned).toHaveLength(1)
    expect(planned[0]?.sceneIndices).toEqual([0, 1])
    expect(planned[0]?.templateId).toBe('preset-1on1-talk')
  })
})

describe('sceneSpeakers()', () => {
  it('장면 characters 와 대사 화자의 합집합 (slot-assign 과 같은 정의)', () => {
    const scene = makeScene(0, { lines: 0, characters: ['철수'] })
    scene.lines = [
      { index: 0, speaker: '영희', text: '안녕' },
      { index: 1, speaker: '철수', text: '응' },
      { index: 2, text: '바람이 분다' },
    ]
    expect(sceneSpeakers(scene).sort()).toEqual(['영희', '철수'])
  })

  it('화자가 전혀 없으면 빈 배열', () => {
    const scene = makeScene(0, { lines: 0, characters: [] })
    scene.lines = [{ index: 0, text: '지문만 있는 장면' }]
    expect(sceneSpeakers(scene)).toEqual([])
  })
})
