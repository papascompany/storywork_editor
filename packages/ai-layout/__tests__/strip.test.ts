/**
 * strip.test.ts — 웹툰 세로 스트립 분기 (MODE-03 / ADR-0017)
 *
 * 검증 항목:
 *  - 판형 판별·정규화: unit 폴백 mm · safeMm 가 리듬 인셋(px)으로 재해석
 *  - 리듬 템플릿: bg 는 전체 유지, 내용 슬롯만 세로 인셋
 *  - compose 스트립: 합병 없음(세그먼트 ≥ 장면 수) · 수용량 초과 = 세그먼트 추가 ·
 *    대사·서술 보존 100% · 내용 레이어가 리듬 띠를 지킴 · 결정론 · _aiMeta.mode
 *  - mm 경로 무회귀: unit 없는 기존 호출은 동작 불변
 */

import { recommend } from '@storywork/ai-recommend'
import { analyze } from '@storywork/ai-script'
import { describe, expect, it } from 'vitest'

import { measureAdoption } from '../src/adoption.js'
import { compose } from '../src/compose.js'
import {
  centerPoseLessSegment,
  isWebtoonFormat,
  normalizeWebtoonFormat,
  withStripRhythm,
  STRIP_RHYTHM_INSET,
} from '../src/strip.js'
import { PRESET_TEMPLATES } from '../src/template-match.js'
import type { ComposeResult, FabricLayer, LayoutFormat } from '../src/types.js'

/** 웹툰 표준 690px — 시드 preset-webtoon-690 과 동일 기하 (DB 는 safe/bleed 0) */
const WEBTOON: LayoutFormat = {
  id: 'preset-webtoon-690',
  unit: 'px',
  widthMm: 690,
  heightMm: 1280,
  dpi: 72,
  bleedMm: 0,
  safeMm: 0,
}

const B5: LayoutFormat = {
  id: 'preset-b5-novel',
  widthMm: 128,
  heightMm: 182,
  dpi: 350,
  bleedMm: 3,
  safeMm: 5,
}

/** 합병(1on1-talk)이 일어날 법한 2인 대화 + 서술 혼합 대본 */
const SCRIPT = `S#1. 카페 안 / 낮

창밖으로 비가 내리기 시작했다.

민수: 오랜만이야.
지영: 그러게. 몇 년 만이지?
민수: 삼 년.
지영: 그렇게 됐구나.

S#2. 카페 창가 / 낮

지영: 요즘은 뭐 해?
민수: 그냥 회사 다녀.
지영: 재밌어?
민수: 재밌을 리가.
지영: 하긴.
민수: 너는?
지영: 나는 가게 차렸어.
민수: 진짜?
`

async function composeWith(format: LayoutFormat): Promise<ComposeResult> {
  const analyzed = await analyze(SCRIPT, { format: 'auto', llmEnabled: false, maxAlternatives: 0 })
  const recommended = await recommend(analyzed, {
    seed: 0,
    characterMapping: {},
    candidatesPerCharacter: 5,
    llmEnabled: false,
  })
  return compose(analyzed, recommended, { formatId: format.id, format, seed: 0 })
}

// ─────────────────────────────────────────────
// 판형 판별·정규화
// ─────────────────────────────────────────────

describe('isWebtoonFormat() / normalizeWebtoonFormat()', () => {
  it('unit 생략은 mm — 기존 호출 하위호환', () => {
    expect(isWebtoonFormat(B5)).toBe(false)
    expect(isWebtoonFormat(WEBTOON)).toBe(true)
    expect(normalizeWebtoonFormat(B5)).toBe(B5)
  })

  it('px 판형의 safeMm 는 리듬 인셋(px)으로 재해석된다', () => {
    const n = normalizeWebtoonFormat(WEBTOON)
    expect(n.safeMm).toBeCloseTo(STRIP_RHYTHM_INSET * WEBTOON.heightMm, 9)
    expect(n.bleedMm).toBe(0)
  })
})

// ─────────────────────────────────────────────
// 리듬 템플릿
// ─────────────────────────────────────────────

describe('withStripRhythm()', () => {
  it('bg 는 세그먼트 전체를 유지하고 내용 슬롯만 세로 인셋된다', () => {
    for (const template of PRESET_TEMPLATES) {
      const rhythm = withStripRhythm(template)
      for (const slot of rhythm.slots) {
        const original = template.slots.find((s) => s.id === slot.id)
        if (!original) throw new Error('unreachable')
        if (slot.allowedKinds.includes('bg')) {
          expect(slot).toEqual(original)
        } else {
          expect(slot.y).toBeGreaterThanOrEqual(STRIP_RHYTHM_INSET - 1e-9)
          expect(slot.y + slot.h).toBeLessThanOrEqual(1 - STRIP_RHYTHM_INSET + 1e-9)
          expect(slot.x).toBe(original.x)
          expect(slot.w).toBe(original.w)
        }
      }
    }
  })
})

// ─────────────────────────────────────────────
// compose 스트립 분기
// ─────────────────────────────────────────────

describe('compose() — 웹툰 스트립 (MODE-03)', () => {
  it('합병 없이 장면당 1+ 세그먼트가 나온다 (스크롤 문법)', async () => {
    const analyzed = await analyze(SCRIPT, {
      format: 'auto',
      llmEnabled: false,
      maxAlternatives: 0,
    })
    const result = await composeWith(WEBTOON)

    // 모든 세그먼트가 단일 장면 — 합병(1on1-talk 2장면 등)이 없다
    for (const page of result.pages) {
      expect(page.sceneIndices).toHaveLength(1)
    }
    expect(result.pages.length).toBeGreaterThanOrEqual(analyzed.scenes.length)
  })

  it('수용량 초과 장면은 스트립 연장(세그먼트 추가)으로 담는다 — 대사·서술 보존 100%', async () => {
    const analyzed = await analyze(SCRIPT, {
      format: 'auto',
      llmEnabled: false,
      maxAlternatives: 0,
    })
    const recommended = await recommend(analyzed, {
      seed: 0,
      characterMapping: {},
      candidatesPerCharacter: 5,
      llmEnabled: false,
    })
    const composed = await compose(analyzed, recommended, {
      formatId: WEBTOON.id,
      format: WEBTOON,
      seed: 0,
    })

    const adoption = measureAdoption(analyzed, composed)
    expect(adoption.dialogueRetention).toBe(1)
    expect(adoption.blockerCounts['dialogue-loss']).toBe(0)
    // S#2 는 대사 8개 — 세그먼트 수용량(6)을 넘어 스트립이 연장돼야 한다
    const s2Segments = composed.pages.filter((p) => p.sceneIndices[0] === 1)
    expect(s2Segments.length).toBeGreaterThanOrEqual(2)
  })

  it('내용 레이어는 리듬 띠(상·하 6%)를 지킨다 — bg 제외', async () => {
    const result = await composeWith(WEBTOON)
    for (const page of result.pages) {
      for (const layer of page.fabricJson.layers) {
        if (layer.kind === 'bg') continue
        const top = (layer.fabric['topMm'] as number) / WEBTOON.heightMm
        const h = (layer.fabric['heightMm'] as number) / WEBTOON.heightMm
        expect(top).toBeGreaterThanOrEqual(STRIP_RHYTHM_INSET - 1e-9)
        expect(top + h).toBeLessThanOrEqual(1 - STRIP_RHYTHM_INSET + 1e-9)
      }
    }
  })

  it('세그먼트 fabricJson 에 웹툰 표시가 남는다 (_aiMeta.mode)', async () => {
    const result = await composeWith(WEBTOON)
    for (const page of result.pages) {
      expect(page.fabricJson._aiMeta?.mode).toBe('webtoon')
      expect(page.fabricJson.format.widthMm).toBe(690)
    }
  })

  it('결정론: 같은 입력 → 같은 스트립', async () => {
    const a = await composeWith(WEBTOON)
    const b = await composeWith(WEBTOON)
    expect(a).toEqual(b)
  })

  it('mm 경로 무회귀 — B5 는 _aiMeta.mode 없이 종전과 동일하게 동작한다', async () => {
    const result = await composeWith(B5)
    expect(result.pages.length).toBeGreaterThan(0)
    for (const page of result.pages) {
      expect(page.fabricJson._aiMeta?.mode).toBeUndefined()
    }
    // 합병이 살아 있는지(웹툰과 달리 멀티 장면 페이지 허용) — 존재를 강제하진 않는다
    const adoption = measureAdoption(
      await analyze(SCRIPT, { format: 'auto', llmEnabled: false, maxAlternatives: 0 }),
      result,
    )
    expect(adoption.dialogueRetention).toBe(1)
  })
})

// ─────────────────────────────────────────────
// LAYOUT-07 — 인물 없는 세그먼트 텍스트 묶음 가로 중앙 정렬
// ─────────────────────────────────────────────

describe('centerPoseLessSegment (LAYOUT-07)', () => {
  const PX: LayoutFormat = {
    id: 'w',
    unit: 'px',
    widthMm: 690,
    heightMm: 1280,
    dpi: 72,
    bleedMm: 0,
    safeMm: 0,
  }

  function box(kind: string, x: number, y: number, w: number, h: number, meta = {}): FabricLayer {
    return {
      id: `${kind}-${x}-${y}`,
      kind,
      data: { meta },
      fabric: { leftMm: x, topMm: y, widthMm: w, heightMm: h },
    }
  }

  const bg = box('bg', 0, 0, 690, 1280)
  const centroidX = (layers: FabricLayer[]): number => {
    let a = 0
    let c = 0
    for (const l of layers.filter((x) => x.kind !== 'bg')) {
      const w = l.fabric['widthMm'] as number
      const h = l.fabric['heightMm'] as number
      a += w * h
      c += ((l.fabric['leftMm'] as number) + w / 2) * w * h
    }
    return c / a
  }

  it('왼쪽 열에 붙은 캡션을 가로 가운데로 옮긴다 (세로 위치·배경은 그대로)', () => {
    const input = [
      bg,
      box('text', 77, 557, 216, 96, { kind: 'caption' }),
      box('text', 77, 653, 216, 96, { kind: 'caption' }),
    ]
    const out = centerPoseLessSegment(input, PX)
    expect(centroidX(out)).toBeCloseTo(345)
    expect(out.map((l) => l.fabric['topMm'])).toEqual(input.map((l) => l.fabric['topMm']))
    expect(out[0]).toBe(bg)
    // 입력 불변
    expect(input[1]?.fabric['leftMm']).toBe(77)
  })

  it('말풍선과 캡션을 묶음째 옮겨 상대 배치(겹침·좌우 순서)를 보존한다', () => {
    const bubble = box('bubble', 173, 370, 345, 225)
    const caption = box('text', 77, 557, 216, 96, { kind: 'caption' })
    const out = centerPoseLessSegment([bg, bubble, caption], PX)
    const dx = (out[1]?.fabric['leftMm'] as number) - 173
    expect(dx).not.toBe(0)
    expect((out[2]?.fabric['leftMm'] as number) - 77).toBeCloseTo(dx)
  })

  it('가장자리 쪽으로는 원래 더 좁았던 여백 이상을 유지한다', () => {
    // 폭 넓은 묶음(왼쪽 여백 20, 오른쪽 여백 100) — 중앙까지 가려면 오른쪽으로 40 이동이 필요하지만
    // 여백 20 을 지키는 한도에서 이동한다
    const out = centerPoseLessSegment(
      [bg, box('text', 20, 100, 570, 100), box('text', 20, 300, 100, 100)],
      PX,
    )
    const xs = out.slice(1).map((l) => l.fabric['leftMm'] as number)
    const right = Math.max(
      ...out.slice(1).map((l) => (l.fabric['leftMm'] as number) + (l.fabric['widthMm'] as number)),
    )
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(20)
    expect(690 - right).toBeGreaterThanOrEqual(20)
  })

  it('인물이 있는 세그먼트와 인쇄 판형은 건드리지 않는다', () => {
    const withPose = [bg, box('pose', 50, 300, 200, 700), box('text', 77, 557, 216, 96)]
    expect(centerPoseLessSegment(withPose, PX)).toEqual(withPose)
    const mm: LayoutFormat = { ...PX, unit: 'mm', widthMm: 128, heightMm: 182 }
    const caption = [box('text', 5, 50, 30, 20)]
    expect(centerPoseLessSegment(caption, mm)).toEqual(caption)
  })
})
