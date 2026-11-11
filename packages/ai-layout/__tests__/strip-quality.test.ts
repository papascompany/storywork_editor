/**
 * strip-quality.test.ts — 웹툰 화면 스크롤 단위 품질 (MODE-06)
 *
 * 검증 항목:
 *  - 창 계획: 반 화면 겹침 + 마지막 창은 스트립 끝 정렬
 *  - 각 축이 좋은/나쁜 배치를 실제로 구분하는가 (상수를 뱉는 지표는 무의미)
 *  - 페이지 지표와 판정이 갈리는 지점: 세로 치우침은 벌하지 않고, 전경 없는 스크롤은 잡아낸다
 *  - 대사 흐름은 세그먼트 경계를 넘어서도 이어서 본다
 *  - 0..1 범위 · 결정론 · px 판형 전용
 */

import { describe, expect, it } from 'vitest'

import { measureQuality } from '../src/quality.js'
import {
  STRIP_VIEWPORT_ASPECT,
  aggregateStripQuality,
  measureStripQuality,
  worstWindows,
} from '../src/strip-quality.js'
import type { ComposeResult, FabricLayer, LayoutFormat, PageDraft } from '../src/types.js'

const WEBTOON: LayoutFormat = {
  id: 'preset-webtoon-690',
  unit: 'px',
  widthMm: 690,
  heightMm: 1280,
  dpi: 72,
  bleedMm: 0,
  safeMm: 0,
}

const VIEWPORT_H = WEBTOON.widthMm * STRIP_VIEWPORT_ASPECT

/** 세그먼트 정규화 좌표(0..1)로 레이어를 만든다 — 값은 px 로 저장 */
function layer(
  kind: string,
  norm: { x: number; y: number; w: number; h: number },
  meta: Record<string, unknown> = {},
): FabricLayer {
  return {
    id: `${kind}-${norm.x}-${norm.y}-${JSON.stringify(meta)}`,
    kind,
    data: { meta },
    fabric: {
      leftMm: norm.x * WEBTOON.widthMm,
      topMm: norm.y * WEBTOON.heightMm,
      widthMm: norm.w * WEBTOON.widthMm,
      heightMm: norm.h * WEBTOON.heightMm,
    },
  }
}

const BG = layer('bg', { x: 0, y: 0, w: 1, h: 1 })

function segment(layers: FabricLayer[], pageIndex = 0): PageDraft {
  return {
    pageIndex,
    fabricJson: {
      v: 1,
      format: { id: WEBTOON.id, unit: 'px', widthMm: 690, heightMm: 1280, dpi: 72 },
      layers: [BG, ...layers],
    },
    sceneIndices: [pageIndex],
    warnings: [],
  }
}

function strip(segments: FabricLayer[][]): ComposeResult {
  return {
    formatId: WEBTOON.id,
    pages: segments.map((layers, i) => segment(layers, i)),
    warnings: [],
    seed: 0,
  }
}

/** 화면 중앙에 인물 하나 + 말풍선 두 개 — 무난한 세그먼트 */
function goodSegment(lineBase = 0): FabricLayer[] {
  return [
    layer('pose', { x: 0.25, y: 0.3, w: 0.5, h: 0.6 }),
    layer('bubble', { x: 0.05, y: 0.08, w: 0.35, h: 0.1 }, { lineIndex: lineBase }),
    layer('bubble', { x: 0.6, y: 0.15, w: 0.35, h: 0.1 }, { lineIndex: lineBase + 1 }),
  ]
}

// ─────────────────────────────────────────────
// 창 계획
// ─────────────────────────────────────────────

describe('measureStripQuality — 창 계획', () => {
  it('반 화면씩 겹쳐 이동하고 마지막 창은 스트립 끝에 맞춘다', () => {
    const result = measureStripQuality(
      strip([goodSegment(0), goodSegment(2), goodSegment(4)]),
      WEBTOON,
    )
    const total = 3 * WEBTOON.heightMm
    expect(result.viewportHeight).toBeCloseTo(VIEWPORT_H)
    const tops = result.windows.map((w) => w.top)
    expect(tops[0]).toBe(0)
    expect(tops[1]).toBeCloseTo(VIEWPORT_H / 2)
    expect(tops.at(-1)).toBeCloseTo(total - VIEWPORT_H)
    // 세그먼트 경계를 걸친 창은 두 세그먼트를 함께 본다
    expect(result.windows.some((w) => w.segments.length === 2)).toBe(true)
  })

  it('스트립이 화면보다 짧으면 창은 하나', () => {
    const short: LayoutFormat = { ...WEBTOON, heightMm: 600 }
    const page: PageDraft = {
      ...segment(goodSegment()),
      fabricJson: {
        ...segment(goodSegment()).fabricJson,
        format: { id: 'short', unit: 'px', widthMm: 690, heightMm: 600, dpi: 72 },
      },
    }
    const result = measureStripQuality(
      { formatId: 'short', pages: [page], warnings: [], seed: 0 },
      short,
    )
    expect(result.totalWindows).toBe(1)
  })

  it('px 판형이 아니면 거부, 빈 결과는 중립', () => {
    const b5: LayoutFormat = {
      id: 'b5',
      widthMm: 128,
      heightMm: 182,
      dpi: 350,
      bleedMm: 3,
      safeMm: 5,
    }
    expect(() => measureStripQuality(strip([goodSegment()]), b5)).toThrow('px(웹툰)')
    const empty = measureStripQuality(strip([]), WEBTOON)
    expect(empty).toMatchObject({ totalSegments: 0, totalWindows: 0, score: 1 })
  })
})

// ─────────────────────────────────────────────
// 축별 변별력
// ─────────────────────────────────────────────

describe('measureStripQuality — 축', () => {
  it('전경 없는 스크롤 구간을 잡아낸다 (density · backgroundOnlyRatio)', () => {
    const full = measureStripQuality(
      strip([goodSegment(0), goodSegment(2), goodSegment(4)]),
      WEBTOON,
    )
    const holed = measureStripQuality(strip([goodSegment(0), [], goodSegment(2)]), WEBTOON)
    expect(full.backgroundOnlyRatio).toBe(0)
    expect(holed.backgroundOnlyRatio).toBeGreaterThan(0)
    expect(holed.density).toBeLessThan(full.density)
  })

  it('세로 치우침은 벌하지 않는다 — 페이지 지표와 판정이 갈리는 지점', () => {
    // 인물을 세그먼트 하단에 붙인다. 페이지로 보면 무게중심이 아래로 쏠리지만,
    // 스크롤 화면에서는 다음 세그먼트와 이어져 보이므로 가로만 본다
    const bottomHeavy = [
      layer('pose', { x: 0.3, y: 0.55, w: 0.4, h: 0.45 }),
      layer('bubble', { x: 0.3, y: 0.45, w: 0.4, h: 0.08 }, { lineIndex: 0 }),
    ]
    const composed = strip([bottomHeavy, bottomHeavy, bottomHeavy])
    const page = measureQuality(composed, WEBTOON)
    const scroll = measureStripQuality(composed, WEBTOON)
    expect(page.balance).toBeLessThan(0.8)
    expect(scroll.balance).toBeGreaterThan(0.95)
  })

  it('가로로 치우치면 balance 가 떨어진다', () => {
    const left = [layer('pose', { x: 0, y: 0.2, w: 0.3, h: 0.7 })]
    const centered = [layer('pose', { x: 0.35, y: 0.2, w: 0.3, h: 0.7 })]
    const l = measureStripQuality(strip([left, left]), WEBTOON)
    const c = measureStripQuality(strip([centered, centered]), WEBTOON)
    expect(l.balance).toBeLessThan(0.4)
    expect(c.balance).toBeCloseTo(1)
  })

  it('한 화면에 대사가 몰리면 dialogueDensity 가 떨어진다', () => {
    const crowded = [
      layer('pose', { x: 0.3, y: 0.4, w: 0.4, h: 0.5 }),
      ...Array.from({ length: 9 }, (_, i) =>
        layer(
          'bubble',
          { x: (i % 3) * 0.33, y: 0.05 + Math.floor(i / 3) * 0.1, w: 0.3, h: 0.08 },
          {
            lineIndex: i,
          },
        ),
      ),
    ]
    const c = measureStripQuality(strip([crowded, crowded]), WEBTOON)
    const g = measureStripQuality(strip([goodSegment(0), goodSegment(2)]), WEBTOON)
    expect(c.dialogueDensity).toBeLessThan(g.dialogueDensity)
    expect(c.windows.some((w) => w.raw.texts > 4)).toBe(true)
  })

  it('대사 흐름은 세그먼트 경계를 넘어 이어서 본다', () => {
    // 순서 0 → 1 이 같은 세그먼트 안에서 아래 → 위로 거꾸로 놓였다
    const upward = [
      layer('bubble', { x: 0.3, y: 0.8, w: 0.4, h: 0.08 }, { lineIndex: 0 }),
      layer('bubble', { x: 0.3, y: 0.1, w: 0.4, h: 0.08 }, { lineIndex: 1 }),
    ]
    const downward = [
      layer('bubble', { x: 0.3, y: 0.1, w: 0.4, h: 0.08 }, { lineIndex: 0 }),
      layer('bubble', { x: 0.3, y: 0.8, w: 0.4, h: 0.08 }, { lineIndex: 1 }),
    ]
    const bad = measureStripQuality(strip([upward, upward]), WEBTOON)
    const good = measureStripQuality(strip([downward, downward]), WEBTOON)
    expect(good.readingFlow).toBe(1)
    expect(bad.readingFlow).toBeLessThan(1)
    // 다음 세그먼트의 첫 대사(위쪽)는 이전 세그먼트 마지막 대사보다 스트립상 아래 — 역행 아님
    expect(good.windows.every((w) => w.readingFlow === 1)).toBe(true)
  })

  it('말풍선이 얼굴을 덮으면 그 세그먼트에 걸친 화면의 faceClearance 가 떨어진다', () => {
    const covered = [
      layer('pose', { x: 0.3, y: 0.3, w: 0.4, h: 0.6 }),
      layer('bubble', { x: 0.35, y: 0.32, w: 0.3, h: 0.12 }, { lineIndex: 0 }),
    ]
    const r = measureStripQuality(strip([goodSegment(0), covered]), WEBTOON)
    expect(r.faceClearance).toBeLessThan(1)
    expect(worstWindows(r, 1)[0]?.segments).toContain(1)
  })
})

// ─────────────────────────────────────────────
// 범위 · 결정론 · 합산
// ─────────────────────────────────────────────

describe('measureStripQuality — 계약', () => {
  it('모든 축은 0..1, 같은 입력은 같은 결과', () => {
    const composed = strip([goodSegment(0), [], goodSegment(2), goodSegment(4)])
    const a = measureStripQuality(composed, WEBTOON)
    const b = measureStripQuality(composed, WEBTOON)
    expect(a).toEqual(b)
    for (const w of a.windows) {
      for (const v of [
        w.balance,
        w.density,
        w.dialogueDensity,
        w.readingFlow,
        w.faceClearance,
        w.score,
      ]) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })

  it('aggregateStripQuality 는 창 단위로 합산한다', () => {
    const a = measureStripQuality(strip([goodSegment(0), goodSegment(2)]), WEBTOON)
    const b = measureStripQuality(strip([goodSegment(0), [], []]), WEBTOON)
    const all = aggregateStripQuality([a, b])
    expect(all.totalWindows).toBe(a.totalWindows + b.totalWindows)
    expect(all.totalSegments).toBe(5)
    const expected =
      (a.score * a.totalWindows + b.score * b.totalWindows) / (a.totalWindows + b.totalWindows)
    expect(all.score).toBeCloseTo(expected)
  })
})

describe('measureStripQuality — 캡션 박스 단위 계수', () => {
  it('같은 캡션 박스의 줄들은 텍스트 하나로 센다', () => {
    const lines = [0, 1, 2].map((i) =>
      layer(
        'text',
        { x: 0.3, y: 0.1 + i * 0.05, w: 0.4, h: 0.05 },
        { kind: 'caption', captionBoxSlotId: 'gen-caption-1', captionLineIndex: i },
      ),
    )
    const pose = layer('pose', { x: 0.3, y: 0.4, w: 0.4, h: 0.5 })
    const r = measureStripQuality(strip([[pose, ...lines]]), WEBTOON)
    expect(r.windows[0]?.raw.texts).toBe(1)
  })
})
