/**
 * bubble-cost.test.ts — 말풍선 배치 비용함수 4항 + 자동 QA (BUBBLE-02)
 *
 * 검증 항목:
 *  - 항별 비용: 근접(거리·꼬리 방향), 얼굴 가림, 읽기순서 역행, 경계 침범
 *  - assignBubblesByCost: 화자별 최적 슬롯 매핑, 결정론, 그리디 폴백
 *  - speakerAnchorFromPoseSlot: 키포인트 투영 + 휴리스틱 폴백
 *  - evaluateBubblePlacement: IoU 매칭·누락·초과·얼굴 가림 리포트
 */

import { describe, expect, it } from 'vitest'

import {
  assignBubblesByCost,
  boundaryCost,
  DEFAULT_BUBBLE_COST_WEIGHTS,
  occlusionCost,
  proximityCost,
  readingOrderCost,
  speakerAnchorFromPoseSlot,
} from '../src/bubble-cost.js'
import type { NormRect, SpeakerAnchor } from '../src/bubble-cost.js'
import { evaluateBubblePlacement, runBubbleQa } from '../src/bubble-qa.js'
import type { DetectedBubble } from '../src/bubble-qa.js'
import type { LayoutFormat, LayoutSlot } from '../src/types.js'

const B5: LayoutFormat = {
  id: 'b5',
  widthMm: 130,
  heightMm: 200,
  dpi: 300,
  bleedMm: 3,
  safeMm: 5,
}

function slot(id: string, x: number, y: number, w = 0.3, h = 0.15): LayoutSlot {
  return { id, allowedKinds: ['bubble'], x, y, w, h, zIndex: 2, optional: true }
}

function anchor(name: string, mouthX: number, mouthY: number): SpeakerAnchor {
  return {
    characterName: name,
    mouth: { x: mouthX, y: mouthY },
    faceBox: { x: mouthX - 0.08, y: mouthY - 0.1, w: 0.16, h: 0.14 },
  }
}

// ─────────────────────────────────────────────
// 항별 비용
// ─────────────────────────────────────────────

describe('proximityCost — w1 화자 근접 + 꼬리 각도', () => {
  it('mouth 에 가까운 말풍선이 더 낮은 비용', () => {
    const a = anchor('철수', 0.25, 0.3)
    const near: NormRect = { x: 0.1, y: 0.05, w: 0.3, h: 0.15 }
    const far: NormRect = { x: 0.65, y: 0.75, w: 0.3, h: 0.15 }
    expect(proximityCost(near, a)).toBeLessThan(proximityCost(far, a))
  })

  it('말풍선이 mouth 아래(꼬리가 위를 향함)면 페널티 증가', () => {
    const a = anchor('철수', 0.5, 0.4)
    const above: NormRect = { x: 0.35, y: 0.1, w: 0.3, h: 0.15 } // 중심 y=0.175
    const below: NormRect = { x: 0.35, y: 0.55, w: 0.3, h: 0.15 } // 중심 y=0.625 (동일 거리)
    expect(proximityCost(above, a)).toBeLessThan(proximityCost(below, a))
  })
})

describe('occlusionCost — w2 얼굴 가림', () => {
  it('얼굴을 완전히 덮으면 1, 겹치지 않으면 0', () => {
    const face: NormRect = { x: 0.4, y: 0.1, w: 0.2, h: 0.2 }
    expect(occlusionCost({ x: 0.3, y: 0.0, w: 0.4, h: 0.4 }, [face])).toBe(1)
    expect(occlusionCost({ x: 0.0, y: 0.6, w: 0.2, h: 0.2 }, [face])).toBe(0)
  })

  it('여러 얼굴 중 최악 가림 비율 반환', () => {
    const faces: NormRect[] = [
      { x: 0.0, y: 0.0, w: 0.2, h: 0.2 },
      { x: 0.5, y: 0.5, w: 0.2, h: 0.2 },
    ]
    const bubble: NormRect = { x: 0.5, y: 0.5, w: 0.1, h: 0.2 } // 두 번째 얼굴 절반 가림
    expect(occlusionCost(bubble, faces)).toBeCloseTo(0.5, 5)
  })
})

describe('readingOrderCost — w3 읽기순서 단조성', () => {
  it('위→아래 순서는 0', () => {
    const rects: NormRect[] = [
      { x: 0.1, y: 0.05, w: 0.3, h: 0.1 },
      { x: 0.1, y: 0.4, w: 0.3, h: 0.1 },
      { x: 0.1, y: 0.75, w: 0.3, h: 0.1 },
    ]
    expect(readingOrderCost(rects)).toBe(0)
  })

  it('역행(아래→위)이 섞이면 비율만큼 비용', () => {
    const rects: NormRect[] = [
      { x: 0.1, y: 0.75, w: 0.3, h: 0.1 },
      { x: 0.1, y: 0.05, w: 0.3, h: 0.1 },
    ]
    expect(readingOrderCost(rects)).toBe(1)
  })

  it('같은 행에서는 왼→오른쪽이 정방향', () => {
    const forward: NormRect[] = [
      { x: 0.05, y: 0.1, w: 0.3, h: 0.1 },
      { x: 0.6, y: 0.1, w: 0.3, h: 0.1 },
    ]
    const backward: NormRect[] = [forward[1] as NormRect, forward[0] as NormRect]
    expect(readingOrderCost(forward)).toBe(0)
    expect(readingOrderCost(backward)).toBe(1)
  })
})

describe('boundaryCost — w4 패널 경계 침범', () => {
  it('safe area 안이면 0', () => {
    expect(boundaryCost({ x: 0.2, y: 0.2, w: 0.3, h: 0.2 }, B5)).toBe(0)
  })

  it('safe area 밖으로 넘친 면적 비율만큼 비용', () => {
    // safe 좌측 경계 ≈ 5/130 ≈ 0.0385 — x<0 으로 절반 넘김
    const halfOut: NormRect = { x: -0.15, y: 0.2, w: 0.3, h: 0.2 }
    const cost = boundaryCost(halfOut, B5)
    expect(cost).toBeGreaterThan(0.5)
    expect(cost).toBeLessThan(0.75)
  })
})

// ─────────────────────────────────────────────
// speakerAnchorFromPoseSlot
// ─────────────────────────────────────────────

describe('speakerAnchorFromPoseSlot', () => {
  const pose: NormRect = { x: 0.1, y: 0.2, w: 0.4, h: 0.6 }

  it('키포인트 없으면 슬롯 상단 중앙 휴리스틱', () => {
    const a = speakerAnchorFromPoseSlot(pose, '철수')
    expect(a.mouth.x).toBeCloseTo(0.3, 5)
    expect(a.mouth.y).toBeCloseTo(0.2 + 0.6 * 0.18, 5)
    expect(a.faceBox.w).toBeCloseTo(0.16, 5)
  })

  it('mouth/head 키포인트가 있으면 슬롯 공간으로 투영', () => {
    const a = speakerAnchorFromPoseSlot(pose, '철수', [
      { name: 'mouth', x: 0.5, y: 0.1 },
      { name: 'head', x: 0.5, y: 0.05 },
    ])
    expect(a.mouth.x).toBeCloseTo(0.1 + 0.5 * 0.4, 5)
    expect(a.mouth.y).toBeCloseTo(0.2 + 0.1 * 0.6, 5)
  })
})

// ─────────────────────────────────────────────
// assignBubblesByCost — 배치 최적화
// ─────────────────────────────────────────────

describe('assignBubblesByCost', () => {
  it('화자 위치에 맞춰 슬롯 교차 배치 (왼쪽 화자 → 왼쪽 말풍선)', () => {
    // 슬롯: 왼쪽 상단 / 오른쪽 상단. 대사: line0=오른쪽 화자, line1=왼쪽 화자
    const slots = [slot('b-left', 0.05, 0.05), slot('b-right', 0.65, 0.05)]
    const anchors = new Map([
      ['왼캐릭', anchor('왼캐릭', 0.2, 0.4)],
      ['오른캐릭', anchor('오른캐릭', 0.8, 0.4)],
    ])
    const r = assignBubblesByCost({
      lines: [{ speaker: '오른캐릭' }, { speaker: '왼캐릭' }],
      slots,
      anchors,
      format: B5,
      // 읽기순서 가중을 낮춰 근접 항이 지배하게
      weights: { ...DEFAULT_BUBBLE_COST_WEIGHTS, readingOrder: 0.1 },
    })
    expect(r.slotIndexByLine.get(0)).toBe(1) // 오른캐릭 → b-right
    expect(r.slotIndexByLine.get(1)).toBe(0) // 왼캐릭 → b-left
  })

  it('화자 정보가 없으면 읽기순서가 지배 → 순서 유지', () => {
    const slots = [slot('top', 0.1, 0.05), slot('bottom', 0.1, 0.7)]
    const r = assignBubblesByCost({
      lines: [{ speaker: null }, { speaker: null }],
      slots,
      anchors: new Map(),
      format: B5,
    })
    expect(r.slotIndexByLine.get(0)).toBe(0)
    expect(r.slotIndexByLine.get(1)).toBe(1)
  })

  it('결정론: 같은 입력 → 같은 배치', () => {
    const slots = [slot('a', 0.05, 0.05), slot('b', 0.65, 0.05), slot('c', 0.05, 0.7)]
    const anchors = new Map([['철수', anchor('철수', 0.5, 0.5)]])
    const input = {
      lines: [{ speaker: '철수' }, { speaker: null }],
      slots,
      anchors,
      format: B5,
    }
    const r1 = assignBubblesByCost(input)
    const r2 = assignBubblesByCost(input)
    expect([...r1.slotIndexByLine.entries()]).toEqual([...r2.slotIndexByLine.entries()])
    expect(r1.totalCost).toBe(r2.totalCost)
  })

  it('대사가 슬롯보다 많으면 슬롯 수만큼만 배치', () => {
    const slots = [slot('only', 0.1, 0.05)]
    const r = assignBubblesByCost({
      lines: [{ speaker: null }, { speaker: null }, { speaker: null }],
      slots,
      anchors: new Map(),
      format: B5,
    })
    expect(r.slotIndexByLine.size).toBe(1)
  })

  it('슬롯 8개 초과 시 그리디 폴백도 유효한 단사 매핑', () => {
    const slots = Array.from({ length: 9 }, (_, i) => slot(`s${i}`, 0.05, 0.02 + i * 0.1))
    const r = assignBubblesByCost({
      lines: Array.from({ length: 4 }, () => ({ speaker: null })),
      slots,
      anchors: new Map(),
      format: B5,
    })
    const used = [...r.slotIndexByLine.values()]
    expect(used).toHaveLength(4)
    expect(new Set(used).size).toBe(4)
  })

  it('빈 입력 → 빈 결과', () => {
    const r = assignBubblesByCost({ lines: [], slots: [], anchors: new Map(), format: B5 })
    expect(r.slotIndexByLine.size).toBe(0)
    expect(r.totalCost).toBe(0)
  })
})

// ─────────────────────────────────────────────
// evaluateBubblePlacement — 자동 QA
// ─────────────────────────────────────────────

describe('evaluateBubblePlacement — 검출 대조 QA', () => {
  const expected: NormRect[] = [
    { x: 0.1, y: 0.05, w: 0.3, h: 0.15 },
    { x: 0.6, y: 0.6, w: 0.3, h: 0.15 },
  ]

  it('전부 검출되고 가림 없으면 pass', () => {
    const detected: DetectedBubble[] = [
      { box: { x: 0.11, y: 0.06, w: 0.29, h: 0.14 }, score: 0.9 },
      { box: { x: 0.6, y: 0.61, w: 0.3, h: 0.14 }, score: 0.85 },
    ]
    const report = evaluateBubblePlacement(expected, detected)
    expect(report.matches).toHaveLength(2)
    expect(report.missing).toEqual([])
    expect(report.extra).toEqual([])
    expect(report.pass).toBe(true)
  })

  it('검출 누락 → missing + fail', () => {
    const detected: DetectedBubble[] = [{ box: { x: 0.11, y: 0.06, w: 0.29, h: 0.14 }, score: 0.9 }]
    const report = evaluateBubblePlacement(expected, detected)
    expect(report.missing).toEqual([1])
    expect(report.pass).toBe(false)
  })

  it('저신뢰 검출은 무시 (minScore)', () => {
    const detected: DetectedBubble[] = [{ box: { x: 0.11, y: 0.06, w: 0.29, h: 0.14 }, score: 0.2 }]
    const report = evaluateBubblePlacement(expected, detected)
    expect(report.matches).toHaveLength(0)
    expect(report.missing).toEqual([0, 1])
  })

  it('기대에 없는 검출 → extra', () => {
    const detected: DetectedBubble[] = [
      { box: { x: 0.11, y: 0.06, w: 0.29, h: 0.14 }, score: 0.9 },
      { box: { x: 0.6, y: 0.61, w: 0.3, h: 0.14 }, score: 0.9 },
      { box: { x: 0.4, y: 0.4, w: 0.1, h: 0.1 }, score: 0.9 },
    ]
    const report = evaluateBubblePlacement(expected, detected)
    expect(report.extra).toEqual([2])
  })

  it('얼굴 가림 임계값 초과 → faceOcclusions + fail', () => {
    const detected: DetectedBubble[] = [
      { box: { x: 0.1, y: 0.05, w: 0.3, h: 0.15 }, score: 0.9 },
      { box: { x: 0.6, y: 0.6, w: 0.3, h: 0.15 }, score: 0.9 },
    ]
    const faces: NormRect[] = [{ x: 0.15, y: 0.08, w: 0.1, h: 0.1 }] // 첫 말풍선이 완전 가림
    const report = evaluateBubblePlacement(expected, detected, faces)
    expect(report.faceOcclusions.length).toBeGreaterThan(0)
    expect(report.pass).toBe(false)
  })

  it('runBubbleQa 는 주입된 검출기를 호출한다 (mock ONNX 어댑터 자리)', async () => {
    const fakeDetector = {
      async detect() {
        return [{ box: { x: 0.1, y: 0.05, w: 0.3, h: 0.15 }, score: 0.99 }]
      },
    }
    const report = await runBubbleQa(
      new Uint8Array([0x89, 0x50]),
      [expected[0] as NormRect],
      fakeDetector,
    )
    expect(report.pass).toBe(true)
    expect(report.matches).toHaveLength(1)
  })
})
