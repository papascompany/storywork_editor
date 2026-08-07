/**
 * layout05.test.ts — 구도 균형 개선 (LAYOUT-05)
 *
 * 검증 항목:
 *  - unionArea: 겹침 제외 정확 합집합 · 페이지 밖 클램프 · 결정론
 *  - 얼굴 회피 축소: 생성 슬롯이 얼굴(headBox)을 물지 않는다 (잔여 가림 3%의 원인 제거)
 *  - 중앙 우선 채택: 요소가 적은 페이지에서 생성 슬롯이 상단에 몰리지 않는다
 *  - 미래 자리 보존: 말풍선 채택이 캡션 수용량을 죽이지 않는다 (screenplay 51→94p 회귀 가드)
 */

import { describe, expect, it } from 'vitest'

import { generateBubbleSlots, generateGridSlots } from '../src/bubble-slots.js'
import { pageBudgetOf } from '../src/capacity.js'
import { unionArea } from '../src/quality.js'
import { PRESET_TEMPLATES } from '../src/template-match.js'
import type { LayoutFormat, LayoutTemplate } from '../src/types.js'

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

// ─────────────────────────────────────────────
// unionArea — 지면 밀도 정확화
// ─────────────────────────────────────────────

describe('unionArea()', () => {
  it('겹치지 않는 사각형은 면적 합', () => {
    expect(
      unionArea([
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
      ]),
    ).toBeCloseTo(0.5, 9)
  })

  it('완전히 겹친 사각형은 한 번만 센다 (종전 단순 합의 과대 추정 제거)', () => {
    const r = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 }
    expect(unionArea([r, r, r])).toBeCloseTo(0.16, 9)
  })

  it('부분 겹침도 정확하다', () => {
    // 0.5×0.5 두 개가 0.25×0.25 만큼 겹침 → 0.25+0.25−0.0625
    expect(
      unionArea([
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.25, y: 0.25, w: 0.5, h: 0.5 },
      ]),
    ).toBeCloseTo(0.4375, 9)
  })

  it('페이지 밖(bleed 확장)은 지면 점유로 세지 않는다', () => {
    expect(unionArea([{ x: -0.5, y: 0, w: 1, h: 1 }])).toBeCloseTo(0.5, 9)
    expect(unionArea([{ x: 0, y: 0, w: 2, h: 2 }])).toBeCloseTo(1, 9)
  })

  it('빈 입력·퇴화 사각형은 0', () => {
    expect(unionArea([])).toBe(0)
    expect(unionArea([{ x: 0.5, y: 0.5, w: 0, h: 0.3 }])).toBe(0)
  })
})

// ─────────────────────────────────────────────
// 얼굴 회피 축소
// ─────────────────────────────────────────────

describe('generateGridSlots() — 얼굴 회피 축소', () => {
  it('1on1-talk 생성 말풍선은 얼굴(headBox)과 겹치지 않는다', () => {
    // LAYOUT-04 잔여 3%: 상단 중앙 칸이 두 인물 얼굴의 안쪽 가장자리를 7~15% 물었다
    const template = preset('preset-1on1-talk')
    const faces = template.slots
      .filter((s) => s.allowedKinds.includes('pose'))
      .map((s) => ({ x: s.x + s.w * 0.25, y: s.y, w: s.w * 0.5, h: s.h * 0.35 }))

    for (const slot of generateBubbleSlots(template, B5, 6)) {
      for (const f of faces) {
        const w = Math.min(slot.x + slot.w, f.x + f.w) - Math.max(slot.x, f.x)
        const h = Math.min(slot.y + slot.h, f.y + f.h) - Math.max(slot.y, f.y)
        expect(w <= 1e-9 || h <= 1e-9).toBe(true)
      }
    }
  })

  it('축소된 슬롯도 텍스트를 담을 최소 폭을 지킨다', () => {
    for (const t of PRESET_TEMPLATES) {
      for (const slot of generateGridSlots(t, B5, 6)) {
        expect(slot.w).toBeGreaterThanOrEqual(0.22 - 1e-9)
      }
    }
  })
})

// ─────────────────────────────────────────────
// 중앙 우선 채택 (wide 균형)
// ─────────────────────────────────────────────

describe('generateGridSlots() — 중앙 우선 채택', () => {
  it('요청이 적으면 상단이 아니라 중앙부터 채운다 (wide 61페이지 균형 0점의 원인 제거)', () => {
    // 얼굴 없는 템플릿(bg 만) — 종전 "위에서 아래" 채움은 첫 슬롯을 최상단에 뒀다
    const bare: LayoutTemplate = {
      id: 'bare',
      name: '빈 템플릿',
      slots: [
        { id: 'bg', allowedKinds: ['bg'], x: 0, y: 0, w: 1, h: 1, zIndex: 0, optional: false },
      ],
    }
    const one = generateGridSlots(bare, B5, 1)
    expect(one).toHaveLength(1)
    const first = one[0]
    if (!first) throw new Error('unreachable')
    const cy = first.y + first.h / 2
    // 페이지 세로 중앙(±0.15) — 최상단 행(y≈0.03)이면 실패한다
    expect(Math.abs(cy - 0.5)).toBeLessThanOrEqual(0.15)
  })

  it('요청이 많으면 수용량을 희생하지 않는다 (222→264p 회귀 가드)', () => {
    // 중앙 우선만 쓰면 3열 격자의 좌·우 칸이 중앙 칸과 배타라 행당 1개로 줄어든다.
    const bare: LayoutTemplate = {
      id: 'bare',
      name: '빈 템플릿',
      slots: [
        { id: 'bg', allowedKinds: ['bg'], x: 0, y: 0, w: 1, h: 1, zIndex: 0, optional: false },
      ],
    }
    expect(generateGridSlots(bare, B5, 6).length).toBe(6)
  })

  it('결정론: 같은 입력 → 같은 슬롯', () => {
    const a = generateGridSlots(preset('preset-wide'), B5, 3)
    const b = generateGridSlots(preset('preset-wide'), B5, 3)
    expect(a).toEqual(b)
  })
})

// ─────────────────────────────────────────────
// 미래 자리 보존 (말풍선 → 캡션 순서)
// ─────────────────────────────────────────────

describe('pageBudgetOf() — 캡션 자리 보존', () => {
  it('1on1-talk 대사 5 에서 캡션 박스가 남는다 (screenplay 지문 페이지 격리 회귀 가드)', () => {
    // 균형 우선 채택이 중앙 열을 세로로 차지하면 캡션 후보가 전멸해 captionBoxes 0 이 됐고,
    // 지문 하나가 나올 때마다 별도 페이지로 격리돼 screenplay 가 51→94p 로 튀었다(실측).
    const budget = pageBudgetOf(preset('preset-1on1-talk'), B5, 5)
    expect(budget.bubbles).toBeGreaterThanOrEqual(6)
    expect(budget.captionBoxes).toBeGreaterThanOrEqual(1)
  })

  it('대사가 적으면 캡션 수용량이 온전하다', () => {
    for (const t of PRESET_TEMPLATES) {
      const budget = pageBudgetOf(t, B5, 2)
      expect(budget.captionBoxes).toBeGreaterThanOrEqual(2)
    }
  })
})
