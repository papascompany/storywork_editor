/**
 * adoption.test.ts — 자동배치 채택률 측정 (AI-ACT-04)
 *
 * 검증 항목:
 *  - blocker 분류: safe-area / empty-slot / dpi-error 는 blocker, dpi-warning 은 아님
 *  - dialogue-loss: 원본 대사가 페이지에 실리지 않으면 결함 (compose 경고가 못 잡는 것)
 *  - speaker-missing: 장면 화자가 포즈로 배치되지 않으면 결함 (슬롯 부족은 면제)
 *  - 채택률·대사 보존율 산식
 *  - aggregateAdoption 합산
 */

import type { AnalyzeResult } from '@storywork/ai-script'
import { describe, expect, it } from 'vitest'

import { aggregateAdoption, measureAdoption } from '../src/adoption.js'
import type { ComposeResult, FabricLayer, PageFabricJson } from '../src/types.js'

// ─────────────────────────────────────────────
// 픽스처
// ─────────────────────────────────────────────

function makeAnalyzed(
  scenes: Array<{ index: number; characters: string[]; lines: string[] }>,
): AnalyzeResult {
  return {
    format: 'novel',
    seed: 0,
    modelVersion: 'rule-only',
    scenes: scenes.map((s) => ({
      index: s.index,
      slug: `scene-${String(s.index).padStart(2, '0')}`,
      summary: `장면 ${s.index}`,
      meta: {},
      lines: s.lines.map((t, i) => ({ index: i, speaker: s.characters[0], text: t })),
      characters: s.characters,
      confidence: 0.9,
    })),
    characters: [...new Set(scenes.flatMap((s) => s.characters))].map((name) => ({
      name,
      mentionCount: 1,
    })),
  }
}

function poseLayer(characterName: string): FabricLayer {
  return {
    id: `pose-${characterName}`,
    kind: 'pose',
    data: { meta: { kind: 'pose', characterName } },
    fabric: { type: 'image', left: 0, top: 0, width: 10, height: 10 },
  }
}

function bubbleLayer(text: string): FabricLayer {
  return {
    id: `bubble-${text.slice(0, 6)}`,
    kind: 'bubble',
    data: { meta: { text } },
    fabric: { type: 'textbox', left: 0, top: 0, width: 10, height: 5, text },
  }
}

function makeComposed(
  pages: Array<{
    pageIndex: number
    sceneIndices: number[]
    layers: FabricLayer[]
    warnings?: string[]
  }>,
): ComposeResult {
  return {
    formatId: 'b5',
    seed: 0,
    warnings: [],
    pages: pages.map((p) => ({
      pageIndex: p.pageIndex,
      templateId: 'tmpl',
      sceneIndices: p.sceneIndices,
      warnings: p.warnings ?? [],
      fabricJson: {
        v: 1,
        format: { id: 'b5', widthMm: 130, heightMm: 200, dpi: 300 },
        layers: p.layers,
      } as PageFabricJson,
    })),
  }
}

// ─────────────────────────────────────────────
// blocker 분류
// ─────────────────────────────────────────────

describe('measureAdoption — 경고 분류', () => {
  const analyzed = makeAnalyzed([{ index: 0, characters: ['철수'], lines: ['안녕'] }])
  const baseLayers = [poseLayer('철수'), bubbleLayer('안녕')]

  it('결함 없으면 채택 가능 (채택률 1.0)', () => {
    const r = measureAdoption(
      analyzed,
      makeComposed([{ pageIndex: 0, sceneIndices: [0], layers: baseLayers }]),
    )
    expect(r.adoptionRate).toBe(1)
    expect(r.pages[0]?.adoptable).toBe(true)
  })

  it('safe-area 침범은 blocker', () => {
    const r = measureAdoption(
      analyzed,
      makeComposed([
        {
          pageIndex: 0,
          sceneIndices: [0],
          layers: baseLayers,
          warnings: ['[safe-area] 말풍선 슬롯 b1 가 safe area 를 침범합니다.'],
        },
      ]),
    )
    expect(r.adoptionRate).toBe(0)
    expect(r.blockerCounts['safe-area']).toBe(1)
  })

  it('slot-empty 는 blocker', () => {
    const r = measureAdoption(
      analyzed,
      makeComposed([
        {
          pageIndex: 0,
          sceneIndices: [0],
          layers: baseLayers,
          warnings: ['[slot-empty] 필수 포즈 슬롯 p1 에 배치할 캐릭터가 없습니다.'],
        },
      ]),
    )
    expect(r.blockerCounts['empty-slot']).toBe(1)
    expect(r.adoptionRate).toBe(0)
  })

  it('dpi-error 는 blocker, dpi-warning 은 soft (채택 유지)', () => {
    const err = measureAdoption(
      analyzed,
      makeComposed([
        {
          pageIndex: 0,
          sceneIndices: [0],
          layers: baseLayers,
          warnings: ['[lowDpi] resource=r1 slot=p1: dpi-error 인쇄 불가'],
        },
      ]),
    )
    expect(err.blockerCounts['dpi-error']).toBe(1)
    expect(err.adoptionRate).toBe(0)

    const warn = measureAdoption(
      analyzed,
      makeComposed([
        {
          pageIndex: 0,
          sceneIndices: [0],
          layers: baseLayers,
          warnings: ['[lowDpi] resource=r1 slot=p1: dpi-warning 권장 미달'],
        },
      ]),
    )
    expect(warn.softSignalCounts['dpi-warning']).toBe(1)
    expect(warn.adoptionRate).toBe(1) // 취향/개선 신호는 채택을 막지 않는다
  })
})

// ─────────────────────────────────────────────
// 경고가 못 잡는 결함
// ─────────────────────────────────────────────

describe('measureAdoption — 대사 유실 (compose 경고 밖 결함)', () => {
  it('대사가 페이지에 안 실리면 blocker + 보존율 하락', () => {
    const analyzed = makeAnalyzed([
      { index: 0, characters: ['철수'], lines: ['첫 대사', '둘째 대사', '셋째 대사'] },
    ])
    // 말풍선 1개만 배치 → 2개 유실
    const r = measureAdoption(
      analyzed,
      makeComposed([
        { pageIndex: 0, sceneIndices: [0], layers: [poseLayer('철수'), bubbleLayer('첫 대사')] },
      ]),
    )
    expect(r.blockerCounts['dialogue-loss']).toBe(1)
    expect(r.adoptionRate).toBe(0)
    expect(r.dialogueRetention).toBeCloseTo(1 / 3, 5)
    expect(r.pages[0]?.dialoguePlaced).toBe(1)
    expect(r.pages[0]?.dialogueTotal).toBe(3)
  })

  it('말줄임으로 잘려 배치돼도 유실로 세지 않는다 (접두 일치 허용)', () => {
    const analyzed = makeAnalyzed([
      { index: 0, characters: ['철수'], lines: ['아주 긴 대사가 여기에 있습니다'] },
    ])
    const r = measureAdoption(
      analyzed,
      makeComposed([
        {
          pageIndex: 0,
          sceneIndices: [0],
          layers: [poseLayer('철수'), bubbleLayer('아주 긴 대사가')],
        },
      ]),
    )
    expect(r.blockerCounts['dialogue-loss']).toBe(0)
    expect(r.dialogueRetention).toBe(1)
  })

  it('대사 없는 장면(지문만)은 보존율 계산에서 중립', () => {
    const analyzed = makeAnalyzed([{ index: 0, characters: ['철수'], lines: [] }])
    const r = measureAdoption(
      analyzed,
      makeComposed([{ pageIndex: 0, sceneIndices: [0], layers: [poseLayer('철수')] }]),
    )
    expect(r.dialogueRetention).toBe(1)
    expect(r.adoptionRate).toBe(1)
  })
})

describe('measureAdoption — 화자 미배치', () => {
  it('장면 화자가 포즈로 없으면 blocker', () => {
    const analyzed = makeAnalyzed([{ index: 0, characters: ['철수', '영희'], lines: ['안녕'] }])
    // 포즈 슬롯 2개인데 영희가 빠짐
    const r = measureAdoption(
      analyzed,
      makeComposed([
        {
          pageIndex: 0,
          sceneIndices: [0],
          layers: [poseLayer('철수'), poseLayer('민수'), bubbleLayer('안녕')],
        },
      ]),
    )
    expect(r.blockerCounts['speaker-missing']).toBe(1)
  })

  it('포즈 슬롯이 부족하면 물리적 한계로 보고 면제', () => {
    const analyzed = makeAnalyzed([
      { index: 0, characters: ['철수', '영희', '민수'], lines: ['안녕'] },
    ])
    // 슬롯 1개뿐 — 2명은 못 넣는 게 정상
    const r = measureAdoption(
      analyzed,
      makeComposed([
        { pageIndex: 0, sceneIndices: [0], layers: [poseLayer('철수'), bubbleLayer('안녕')] },
      ]),
    )
    expect(r.blockerCounts['speaker-missing']).toBe(0)
  })

  it('strictSpeakers 면 슬롯 부족도 결함으로 센다', () => {
    const analyzed = makeAnalyzed([
      { index: 0, characters: ['철수', '영희', '민수'], lines: ['안녕'] },
    ])
    const r = measureAdoption(
      analyzed,
      makeComposed([
        { pageIndex: 0, sceneIndices: [0], layers: [poseLayer('철수'), bubbleLayer('안녕')] },
      ]),
      { strictSpeakers: true },
    )
    expect(r.blockerCounts['speaker-missing']).toBe(1)
  })
})

// ─────────────────────────────────────────────
// 산식·합산
// ─────────────────────────────────────────────

describe('채택률 산식 / aggregateAdoption', () => {
  it('페이지 3개 중 2개 채택 가능 → 2/3', () => {
    const analyzed = makeAnalyzed([
      { index: 0, characters: ['철수'], lines: ['A'] },
      { index: 1, characters: ['철수'], lines: ['B'] },
      { index: 2, characters: ['철수'], lines: ['C'] },
    ])
    const r = measureAdoption(
      analyzed,
      makeComposed([
        { pageIndex: 0, sceneIndices: [0], layers: [poseLayer('철수'), bubbleLayer('A')] },
        { pageIndex: 1, sceneIndices: [1], layers: [poseLayer('철수'), bubbleLayer('B')] },
        {
          pageIndex: 2,
          sceneIndices: [2],
          layers: [poseLayer('철수'), bubbleLayer('C')],
          warnings: ['[safe-area] 침범'],
        },
      ]),
    )
    expect(r.totalPages).toBe(3)
    expect(r.adoptablePages).toBe(2)
    expect(r.adoptionRate).toBeCloseTo(2 / 3, 5)
  })

  it('여러 대본 리포트를 합산', () => {
    const analyzed = makeAnalyzed([{ index: 0, characters: ['철수'], lines: ['A'] }])
    const good = measureAdoption(
      analyzed,
      makeComposed([
        { pageIndex: 0, sceneIndices: [0], layers: [poseLayer('철수'), bubbleLayer('A')] },
      ]),
    )
    const bad = measureAdoption(
      analyzed,
      makeComposed([
        {
          pageIndex: 0,
          sceneIndices: [0],
          layers: [poseLayer('철수')],
          warnings: ['[safe-area] 침범'],
        },
      ]),
    )
    const merged = aggregateAdoption([good, bad])
    expect(merged.totalPages).toBe(2)
    expect(merged.adoptablePages).toBe(1)
    expect(merged.adoptionRate).toBe(0.5)
    expect(merged.blockerCounts['safe-area']).toBe(1)
    expect(merged.blockerCounts['dialogue-loss']).toBe(1) // bad 페이지는 대사도 유실
    expect(merged.dialogueRetention).toBe(0.5)
  })

  it('빈 결과는 0 페이지·보존율 1 (0 나눗셈 안전)', () => {
    const r = measureAdoption(makeAnalyzed([]), makeComposed([]))
    expect(r.totalPages).toBe(0)
    expect(r.adoptionRate).toBe(0)
    expect(r.dialogueRetention).toBe(1)
  })
})
