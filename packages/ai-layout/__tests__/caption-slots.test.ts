/**
 * caption-slots.test.ts — 캡션(내레이션·지문) 박스 (SCRIPT-KO-04)
 *
 * 검증 항목:
 *  - 묶음 규칙: 줄 수·글자 수 상한, 순서 보존, 한 줄이 상한을 넘어도 버리지 않음
 *  - 슬롯 생성: safe area 준수 · 말풍선 자리 회피 · 상한 · 결정론
 *  - 수용량 계산과 실제 보강 결과의 일치 (어긋나면 글이 유실된다)
 *  - 페이지 예산: 대사는 말풍선으로, 서술은 캡션 박스로 따로 센다
 */

import type { AnalyzeResult, AnalyzedLine, AnalyzedScene } from '@storywork/ai-script'
import { describe, expect, it } from 'vitest'

import {
  bubbleSlotsOf,
  MAX_BUBBLES_PER_PAGE,
  withGeneratedBubbleSlots,
} from '../src/bubble-slots.js'
import { fitsInPage, pageBudgetOf, planCapacityPages, planLineRanges } from '../src/capacity.js'
import {
  captionBoxesNeeded,
  captionSlotsOf,
  generateCaptionSlots,
  groupCaptionLines,
  pageCaptionSlotCapacity,
  withGeneratedCaptionSlots,
  CAPTION_CHARS_PER_BOX,
  CAPTION_LINES_PER_BOX,
  MAX_CAPTION_SLOTS_PER_PAGE,
} from '../src/caption-slots.js'
import { PRESET_TEMPLATES } from '../src/template-match.js'
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

function dialogue(index: number, speaker = '주인공'): AnalyzedLine {
  return { index, speaker, text: `대사 ${index}`, kind: 'dialogue' }
}

function narration(index: number, text = `서술 ${index}`): AnalyzedLine {
  return { index, text, kind: 'narration' }
}

function makeScene(index: number, lines: AnalyzedLine[], characters = ['주인공']): AnalyzedScene {
  return {
    index,
    slug: `scene-${index}`,
    summary: `장면 ${index}`,
    meta: {},
    lines,
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

// ─────────────────────────────────────────────
// 묶음 규칙
// ─────────────────────────────────────────────

describe('groupCaptionLines()', () => {
  it('연속된 서술을 한 박스로 묶는다 (페이지 수용량이 늘어나는 근거)', () => {
    const boxes = groupCaptionLines(['가', '나', '다'])
    expect(boxes).toEqual([['가', '나', '다']])
  })

  it(`박스당 ${CAPTION_LINES_PER_BOX} 줄을 넘지 않는다`, () => {
    const boxes = groupCaptionLines(Array.from({ length: 7 }, (_, i) => `줄${i}`))
    expect(boxes).toHaveLength(3)
    for (const box of boxes) expect(box.length).toBeLessThanOrEqual(CAPTION_LINES_PER_BOX)
  })

  it('글자 수 상한을 넘으면 다음 박스로 넘긴다', () => {
    const long = 'ㄱ'.repeat(CAPTION_CHARS_PER_BOX - 10)
    const boxes = groupCaptionLines([long, long])
    expect(boxes).toHaveLength(2)
  })

  it('한 줄이 상한을 넘어도 버리지 않는다', () => {
    const huge = 'ㄴ'.repeat(CAPTION_CHARS_PER_BOX * 3)
    const boxes = groupCaptionLines([huge])
    expect(boxes).toEqual([[huge]])
  })

  it('입력 순서를 보존한다 (결정론)', () => {
    const texts = Array.from({ length: 10 }, (_, i) => `줄${i}`)
    expect(groupCaptionLines(texts).flat()).toEqual(texts)
    expect(groupCaptionLines(texts)).toEqual(groupCaptionLines(texts))
  })

  it('빈 입력은 박스 0개', () => {
    expect(groupCaptionLines([])).toEqual([])
    expect(captionBoxesNeeded([])).toBe(0)
  })
})

// ─────────────────────────────────────────────
// 슬롯 생성
// ─────────────────────────────────────────────

describe('generateCaptionSlots()', () => {
  const safeX = B5.safeMm / B5.widthMm
  const safeY = B5.safeMm / B5.heightMm

  it('생성 슬롯은 safe area 안에 있다 (인쇄 사고 방지)', () => {
    for (const template of PRESET_TEMPLATES) {
      for (const slot of generateCaptionSlots(template, B5, MAX_CAPTION_SLOTS_PER_PAGE)) {
        expect(slot.x).toBeGreaterThanOrEqual(safeX - 1e-9)
        expect(slot.y).toBeGreaterThanOrEqual(safeY - 1e-9)
        expect(slot.x + slot.w).toBeLessThanOrEqual(1 - safeX + 1e-9)
        expect(slot.y + slot.h).toBeLessThanOrEqual(1 - safeY + 1e-9)
      }
    }
  })

  it('캡션 슬롯은 말풍선 목록에 잡히지 않는다 (대사가 캡션 자리에 들어가면 안 된다)', () => {
    const template = withGeneratedCaptionSlots(preset('preset-closeup'), B5, 2)
    const captions = captionSlotsOf(template)
    expect(captions.length).toBeGreaterThan(0)
    const bubbleIds = bubbleSlotsOf(template).map((s) => s.id)
    for (const c of captions) expect(bubbleIds).not.toContain(c.id)
  })

  it('먼저 만든 말풍선 자리를 침범하지 않는다', () => {
    const withBubbles = withGeneratedBubbleSlots(preset('preset-closeup'), B5, MAX_BUBBLES_PER_PAGE)
    const captions = generateCaptionSlots(withBubbles, B5, MAX_CAPTION_SLOTS_PER_PAGE)
    for (const c of captions) {
      for (const b of bubbleSlotsOf(withBubbles)) {
        const w = Math.min(c.x + c.w, b.x + b.w) - Math.max(c.x, b.x)
        const h = Math.min(c.y + c.h, b.y + b.h) - Math.max(c.y, b.y)
        const overlap = w > 0 && h > 0 ? (w * h) / (c.w * c.h) : 0
        expect(overlap).toBeLessThanOrEqual(0.15 + 1e-9)
      }
    }
  })

  it('결정론: 같은 입력 → 같은 슬롯', () => {
    const a = generateCaptionSlots(preset('preset-wide'), B5, 3)
    const b = generateCaptionSlots(preset('preset-wide'), B5, 3)
    expect(a).toEqual(b)
  })
})

describe('pageCaptionSlotCapacity() / withGeneratedCaptionSlots()', () => {
  it('수용량은 페이지 상한을 넘지 않는다', () => {
    for (const template of PRESET_TEMPLATES) {
      const cap = pageCaptionSlotCapacity(template, B5)
      expect(cap).toBeGreaterThan(0)
      expect(cap).toBeLessThanOrEqual(MAX_CAPTION_SLOTS_PER_PAGE)
    }
  })

  it('보강 결과 슬롯 수가 수용량 계산과 일치한다 (어긋나면 서술이 유실된다)', () => {
    for (const template of PRESET_TEMPLATES) {
      const cap = pageCaptionSlotCapacity(template, B5)
      const augmented = withGeneratedCaptionSlots(template, B5, cap)
      expect(captionSlotsOf(augmented).length).toBeGreaterThanOrEqual(cap)
    }
  })
})

// ─────────────────────────────────────────────
// 페이지 예산
// ─────────────────────────────────────────────

describe('pageBudgetOf() / planLineRanges() — 대사·캡션 분리 예산', () => {
  it('서술은 말풍선 수용량을 쓰지 않는다 (종전에는 한 줄이 말풍선 하나였다)', () => {
    const template = preset('preset-1on1-talk')
    const budget = pageBudgetOf(template, B5, 2)
    // 대사 2 + 서술 6 — 서술이 말풍선을 먹었다면 8 > 6 으로 넘쳤을 구성
    const lines = [
      dialogue(0),
      dialogue(1),
      ...Array.from({ length: 6 }, (_, i) => narration(i + 2)),
    ]
    expect(fitsInPage(lines, budget)).toBe(true)
  })

  it('대사가 말풍선 수용량을 넘으면 나눈다', () => {
    const template = preset('preset-1on1-talk')
    const budget = pageBudgetOf(template, B5, 20)
    const lines = Array.from({ length: 20 }, (_, i) => dialogue(i))
    const ranges = planLineRanges(lines, budget)
    expect(ranges.length).toBeGreaterThan(1)
    for (const r of ranges) expect(r.end - r.start).toBeLessThanOrEqual(budget.bubbles)
  })

  it('구간은 겹치지 않고 라인 전체를 덮는다 (유실 0의 근거)', () => {
    const template = preset('preset-closeup')
    const budget = pageBudgetOf(template, B5, 9)
    const lines = [
      ...Array.from({ length: 9 }, (_, i) => dialogue(i)),
      ...Array.from({ length: 15 }, (_, i) => narration(i + 9)),
    ]
    const covered = planLineRanges(lines, budget).flatMap((r) => {
      const out: number[] = []
      for (let i = r.start; i < r.end; i++) out.push(i)
      return out
    })
    expect(covered).toEqual(lines.map((_, i) => i))
  })

  it('결정론: 같은 입력 → 같은 구간', () => {
    const budget = pageBudgetOf(preset('preset-wide'), B5, 12)
    const lines = Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? dialogue(i) : narration(i)))
    expect(planLineRanges(lines, budget)).toEqual(planLineRanges(lines, budget))
  })
})

describe('planCapacityPages() — 서술 위주 장면 (SCRIPT-KO-04)', () => {
  const CTX = { templates: [] as LayoutTemplate[], preferredIds: [] as string[], format: B5 }

  it('서술 6줄짜리 장면이 한 페이지에 들어간다 (종전에는 수용량이 꽉 찼다)', () => {
    const scene = makeScene(
      0,
      Array.from({ length: 6 }, (_, i) => narration(i)),
      [],
    )
    const groups: PageGroup[] = [{ pageIndex: 0, sceneIndices: [0], templateHint: 'default' }]
    expect(planCapacityPages(groups, makeAnalyzed([scene]), CTX)).toHaveLength(1)
  })

  it('서술이 캡션 수용량을 넘으면 나눈다 (버리지 않는다)', () => {
    const scene = makeScene(
      0,
      Array.from({ length: 30 }, (_, i) => narration(i)),
      [],
    )
    const groups: PageGroup[] = [{ pageIndex: 0, sceneIndices: [0], templateHint: 'default' }]
    const planned = planCapacityPages(groups, makeAnalyzed([scene]), CTX)
    expect(planned.length).toBeGreaterThan(1)
    const covered = planned
      .flatMap((p) => p.lineRanges ?? [])
      .flatMap((r) => {
        const out: number[] = []
        for (let i = r.start; i < r.end; i++) out.push(i)
        return out
      })
    expect(covered.sort((a, b) => a - b)).toEqual(Array.from({ length: 30 }, (_, i) => i))
  })
})
