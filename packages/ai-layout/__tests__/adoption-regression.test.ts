/**
 * adoption-regression.test.ts — 채택률 회귀 가드 (AI-ACT-04)
 *
 * baseline(2026-08-05, 코퍼스 217장면): 채택률 13.8% · 대사 보존 52.2%
 * → docs/eval/adoption-baseline-2026-08-05.md
 *
 * 이 테스트는 **"현재보다 나빠지지 않음"** 만 보장한다.
 * 레이아웃을 개선하면(LAYOUT-03) 아래 하한을 함께 올려야 가드가 의미를 유지한다.
 *
 * CI 에서 전체 코퍼스(21편)를 돌리면 느리므로, 형식별 대표 대본을 인라인 축약본으로
 * 고정해 같은 병목(대사 수용량)을 재현한다. 전체 측정은 scripts/measure-adoption.ts.
 */

import { recommend } from '@storywork/ai-recommend'
import { analyze } from '@storywork/ai-script'
import { describe, expect, it } from 'vitest'

import { aggregateAdoption, measureAdoption } from '../src/adoption.js'
import { compose } from '../src/compose.js'
import type { AdoptionResult, LayoutFormat } from '../src/types.js'

const FORMAT: LayoutFormat = {
  id: 'preset-b5-novel',
  widthMm: 128,
  heightMm: 182,
  dpi: 350,
  bleedMm: 3,
  safeMm: 5,
}

/** 형식별 대표 축약본 — 코퍼스와 같은 병목(장면당 대사 다수)을 재현 */
const SAMPLES: Array<{ name: string; text: string }> = [
  {
    name: 'screenplay',
    text: `S#1. 카페 안 / 낮

민수: 오랜만이야.
지영: 그러게. 몇 년 만이지?
민수: 삼 년.
지영: 그렇게 됐구나.
민수: 여기 그대로네.
지영: 사장님도 그대로셔.

S#2. 카페 창가 / 낮

지영: 요즘은 뭐 해?
민수: 그냥 회사 다녀.
지영: 재밌어?
민수: 재밌을 리가.
지영: 하긴.
`,
  },
  {
    name: 'novel',
    text: `현우는 문을 열고 들어섰다. 카운터 뒤에서 은지가 고개를 들었다.

"왔네." 은지가 말했다.
"응." 현우가 짧게 대답했다.
"뭐 마실래?" 은지가 물었다.
"아무거나." 현우가 자리에 앉았다.
"그런 메뉴 없어." 은지가 웃었다.

창밖으로 비가 내리기 시작했다. 현우는 우산을 두고 왔다는 걸 그제야 깨달았다.

"우산 있어?" 은지가 물었다.
"없어." 현우가 대답했다.
"내 거 빌려줄게." 은지가 말했다.
`,
  },
]

async function measureSample(text: string): Promise<AdoptionResult> {
  const analyzed = await analyze(text, { format: 'auto', llmEnabled: false, maxAlternatives: 0 })
  const recommended = await recommend(analyzed, {
    seed: 0,
    characterMapping: {},
    candidatesPerCharacter: 5,
    llmEnabled: false,
  })
  const composed = await compose(analyzed, recommended, {
    formatId: FORMAT.id,
    format: FORMAT,
    seed: 0,
  })
  return measureAdoption(analyzed, composed)
}

describe('자동배치 채택률 회귀 가드', () => {
  it('측정이 결정론적이다 (같은 입력 → 같은 수치)', async () => {
    const a = await measureSample(SAMPLES[0]?.text ?? '')
    const b = await measureSample(SAMPLES[0]?.text ?? '')
    expect(a.adoptionRate).toBe(b.adoptionRate)
    expect(a.dialogueRetention).toBe(b.dialogueRetention)
    expect(a.blockerCounts).toEqual(b.blockerCounts)
  })

  it('대사 보존율이 baseline 하한 아래로 떨어지지 않는다', async () => {
    const results: AdoptionResult[] = []
    for (const s of SAMPLES) results.push(await measureSample(s.text))
    const overall = aggregateAdoption(results)
    // 전체 코퍼스 baseline 은 0.522. 이 축약본은 대사 밀도가 더 높아 실측 0.261 —
    // 가드는 "현재보다 나빠지지 않음"이 목적이므로 실측 바로 아래인 0.25 로 잡는다.
    // 개선(LAYOUT-03) 시 이 하한을 함께 올릴 것.
    expect(overall.dialogueRetention).toBeGreaterThanOrEqual(0.25)
  })

  it('인쇄 사고성 blocker(safe-area·dpi-error)는 0을 유지한다', async () => {
    const results: AdoptionResult[] = []
    for (const s of SAMPLES) results.push(await measureSample(s.text))
    const overall = aggregateAdoption(results)
    // 이 둘은 이미 달성된 품질선 — 회귀하면 인쇄 사고로 직결된다
    expect(overall.blockerCounts['safe-area']).toBe(0)
    expect(overall.blockerCounts['dpi-error']).toBe(0)
  })

  it('페이지가 실제로 생성된다 (파이프라인 무결성)', async () => {
    for (const s of SAMPLES) {
      const r = await measureSample(s.text)
      expect(r.totalPages).toBeGreaterThan(0)
    }
  })
})
