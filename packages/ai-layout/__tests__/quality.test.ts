/**
 * quality.test.ts — 배치 품질 지표 (LAYOUT-04)
 *
 * 검증 항목:
 *  - 각 축이 "좋은 배치"와 "나쁜 배치"를 실제로 구분하는가 (지표가 상수를 뱉으면 무의미하다)
 *  - 모든 축이 0..1 범위 · 결정론
 *  - 읽기 순서는 레이어 배열 순서가 아니라 `meta.lineIndex` 로 복원되는가
 */

import { describe, expect, it } from 'vitest'

import {
  aggregateQuality,
  balanceScore,
  densityScore,
  dialogueDensityScore,
  faceClearanceScore,
  measurePageQuality,
  measureQuality,
  readingFlowScore,
  worstPages,
  QUALITY_AXES,
} from '../src/quality.js'
import type { FabricLayer, LayoutFormat, PageDraft } from '../src/types.js'

const B5: LayoutFormat = {
  id: 'b5',
  widthMm: 128,
  heightMm: 182,
  dpi: 350,
  bleedMm: 3,
  safeMm: 5,
}

/** 정규화 좌표(0..1)로 레이어를 만든다 */
function layer(
  kind: string,
  norm: { x: number; y: number; w: number; h: number },
  meta: Record<string, unknown> = {},
): FabricLayer {
  return {
    id: `${kind}-${norm.x}-${norm.y}`,
    kind,
    data: { meta },
    fabric: {
      leftMm: norm.x * B5.widthMm,
      topMm: norm.y * B5.heightMm,
      widthMm: norm.w * B5.widthMm,
      heightMm: norm.h * B5.heightMm,
    },
  }
}

function page(layers: FabricLayer[], pageIndex = 0): PageDraft {
  return {
    pageIndex,
    fabricJson: {
      v: 1,
      format: { id: B5.id, widthMm: B5.widthMm, heightMm: B5.heightMm, dpi: B5.dpi },
      layers,
    },
    sceneIndices: [0],
    warnings: [],
  }
}

// ─────────────────────────────────────────────
// 구도 균형
// ─────────────────────────────────────────────

describe('balanceScore()', () => {
  it('중앙에 놓인 요소는 만점', () => {
    expect(balanceScore(page([layer('pose', { x: 0.3, y: 0.3, w: 0.4, h: 0.4 })]), B5)).toBeCloseTo(
      1,
      5,
    )
  })

  it('한쪽 구석으로 몰린 배치는 감점된다', () => {
    const corner = balanceScore(page([layer('pose', { x: 0, y: 0, w: 0.25, h: 0.25 })]), B5)
    expect(corner).toBeLessThan(0.5)
  })

  it('배경은 무게에서 제외한다 (포함하면 모든 페이지가 정중앙이 된다)', () => {
    const withBg = page([
      layer('bg', { x: 0, y: 0, w: 1, h: 1 }),
      layer('pose', { x: 0, y: 0, w: 0.2, h: 0.2 }),
    ])
    const withoutBg = page([layer('pose', { x: 0, y: 0, w: 0.2, h: 0.2 })])
    expect(balanceScore(withBg, B5)).toBeCloseTo(balanceScore(withoutBg, B5), 5)
  })

  it('요소가 없으면 균형을 논하지 않는다 (중립 1)', () => {
    expect(balanceScore(page([]), B5)).toBe(1)
  })
})

// ─────────────────────────────────────────────
// 지면 밀도
// ─────────────────────────────────────────────

describe('densityScore()', () => {
  it('적정 점유율은 만점', () => {
    expect(densityScore(page([layer('pose', { x: 0.1, y: 0.1, w: 0.7, h: 0.7 })]), B5)).toBe(1)
  })

  it('거의 빈 페이지는 감점된다', () => {
    expect(
      densityScore(page([layer('pose', { x: 0.4, y: 0.4, w: 0.1, h: 0.1 })]), B5),
    ).toBeLessThan(1)
  })

  it('과밀한 페이지도 감점된다 ("다닥다닥")', () => {
    // 점유율 합 12 × 0.32² ≈ 1.23 — DENSITY_MAX(0.85) 초과
    const crowded = Array.from({ length: 12 }, (_, i) =>
      layer('bubble', {
        x: 0.02 + (i % 3) * 0.32,
        y: 0.02 + Math.floor(i / 3) * 0.24,
        w: 0.32,
        h: 0.32,
      }),
    )
    expect(densityScore(page(crowded), B5)).toBeLessThan(1)
  })
})

// ─────────────────────────────────────────────
// 대사 밀도
// ─────────────────────────────────────────────

describe('dialogueDensityScore()', () => {
  const bubbles = (n: number): PageDraft =>
    page(
      Array.from({ length: n }, (_, i) => layer('bubble', { x: 0.1, y: 0.1 * i, w: 0.3, h: 0.08 })),
    )

  it('적정 범위(2~6)는 만점', () => {
    expect(dialogueDensityScore(bubbles(2))).toBe(1)
    expect(dialogueDensityScore(bubbles(4))).toBe(1)
    expect(dialogueDensityScore(bubbles(6))).toBe(1)
  })

  it('대사가 없거나 너무 많으면 감점', () => {
    expect(dialogueDensityScore(bubbles(0))).toBeLessThan(1)
    expect(dialogueDensityScore(bubbles(12))).toBeLessThan(1)
  })
})

// ─────────────────────────────────────────────
// 시선 흐름
// ─────────────────────────────────────────────

describe('readingFlowScore()', () => {
  it('위→아래·좌→우 순서면 만점', () => {
    const p = page([
      layer('bubble', { x: 0.05, y: 0.1, w: 0.4, h: 0.1 }, { lineIndex: 0 }),
      layer('bubble', { x: 0.55, y: 0.1, w: 0.4, h: 0.1 }, { lineIndex: 1 }),
      layer('bubble', { x: 0.05, y: 0.6, w: 0.4, h: 0.1 }, { lineIndex: 2 }),
    ])
    expect(readingFlowScore(p, B5)).toBe(1)
  })

  it('역행 배치는 감점된다', () => {
    const p = page([
      layer('bubble', { x: 0.05, y: 0.7, w: 0.4, h: 0.1 }, { lineIndex: 0 }),
      layer('bubble', { x: 0.55, y: 0.1, w: 0.4, h: 0.1 }, { lineIndex: 1 }),
    ])
    expect(readingFlowScore(p, B5)).toBeLessThan(1)
  })

  it('레이어 배열 순서가 아니라 lineIndex 로 판정한다', () => {
    // 배열은 역순이지만 lineIndex 는 정순 — 읽기 흐름은 정상이어야 한다
    const p = page([
      layer('bubble', { x: 0.05, y: 0.6, w: 0.4, h: 0.1 }, { lineIndex: 2 }),
      layer('bubble', { x: 0.55, y: 0.1, w: 0.4, h: 0.1 }, { lineIndex: 1 }),
      layer('bubble', { x: 0.05, y: 0.1, w: 0.4, h: 0.1 }, { lineIndex: 0 }),
    ])
    expect(readingFlowScore(p, B5)).toBe(1)
  })

  it('말풍선이 1개 이하면 흐름을 논하지 않는다', () => {
    expect(readingFlowScore(page([]), B5)).toBe(1)
  })
})

// ─────────────────────────────────────────────
// 얼굴 가림
// ─────────────────────────────────────────────

describe('faceClearanceScore()', () => {
  const pose = layer('pose', { x: 0.1, y: 0.1, w: 0.4, h: 0.8 })
  // 얼굴 근사 = 포즈 상단 35%, 좌우 25% 안쪽 → x 0.2~0.4 · y 0.1~0.38

  it('얼굴을 피한 말풍선은 만점', () => {
    const p = page([pose, layer('bubble', { x: 0.55, y: 0.6, w: 0.4, h: 0.2 }, { lineIndex: 0 })])
    expect(faceClearanceScore(p, B5)).toBe(1)
  })

  it('얼굴을 덮은 말풍선은 감점된다', () => {
    const p = page([pose, layer('bubble', { x: 0.15, y: 0.1, w: 0.35, h: 0.25 }, { lineIndex: 0 })])
    expect(faceClearanceScore(p, B5)).toBeLessThan(0.5)
  })

  it('캡션이 얼굴을 덮어도 잡는다', () => {
    const p = page([
      pose,
      layer('text', { x: 0.15, y: 0.1, w: 0.35, h: 0.25 }, { kind: 'caption' }),
    ])
    expect(faceClearanceScore(p, B5)).toBeLessThan(0.5)
  })

  it('포즈가 없으면 가릴 얼굴도 없다 (중립 1)', () => {
    expect(faceClearanceScore(page([layer('bubble', { x: 0, y: 0, w: 1, h: 1 })]), B5)).toBe(1)
  })
})

// ─────────────────────────────────────────────
// 집계
// ─────────────────────────────────────────────

describe('measureQuality() / aggregateQuality()', () => {
  const good = page(
    [
      layer('bg', { x: 0, y: 0, w: 1, h: 1 }),
      layer('pose', { x: 0.08, y: 0.12, w: 0.4, h: 0.55 }),
      layer('pose', { x: 0.52, y: 0.12, w: 0.4, h: 0.55 }),
      layer('bubble', { x: 0.05, y: 0.72, w: 0.42, h: 0.2 }, { lineIndex: 0 }),
      layer('bubble', { x: 0.53, y: 0.72, w: 0.42, h: 0.2 }, { lineIndex: 1 }),
    ],
    0,
  )
  const bad = page(
    [
      layer('bg', { x: 0, y: 0, w: 1, h: 1 }),
      layer('pose', { x: 0.05, y: 0.05, w: 0.4, h: 0.7 }),
      layer('bubble', { x: 0.1, y: 0.06, w: 0.35, h: 0.25 }, { lineIndex: 0 }),
    ],
    1,
  )

  it('모든 축이 0..1 범위', () => {
    for (const p of [good, bad]) {
      const q = measurePageQuality(p, B5)
      for (const axis of QUALITY_AXES) {
        expect(q[axis]).toBeGreaterThanOrEqual(0)
        expect(q[axis]).toBeLessThanOrEqual(1)
      }
      expect(q.score).toBeGreaterThanOrEqual(0)
      expect(q.score).toBeLessThanOrEqual(1)
    }
  })

  it('좋은 배치가 나쁜 배치보다 높은 점수를 받는다 (지표의 변별력)', () => {
    expect(measurePageQuality(good, B5).score).toBeGreaterThan(measurePageQuality(bad, B5).score)
  })

  it('결정론: 같은 입력 → 같은 결과', () => {
    const composed = { formatId: B5.id, pages: [good, bad], warnings: [], seed: 0 }
    expect(measureQuality(composed, B5)).toEqual(measureQuality(composed, B5))
  })

  it('worstPages 는 점수 오름차순', () => {
    const composed = { formatId: B5.id, pages: [good, bad], warnings: [], seed: 0 }
    const worst = worstPages(measureQuality(composed, B5), 2)
    expect(worst[0]?.pageIndex).toBe(1)
    expect(worst[0]?.score).toBeLessThanOrEqual(worst[1]?.score ?? 1)
  })

  it('집계는 페이지 전체를 모은다', () => {
    const a = measureQuality({ formatId: B5.id, pages: [good], warnings: [], seed: 0 }, B5)
    const b = measureQuality({ formatId: B5.id, pages: [bad], warnings: [], seed: 0 }, B5)
    expect(aggregateQuality([a, b]).totalPages).toBe(2)
  })
})
