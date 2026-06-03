/**
 * page-split.test.ts — splitScenes() 5 규칙 단위 테스트 (M4-03 Step 1 DoD)
 *
 * 15+ cases, 결정론 검증 포함
 */

import type { RecommendResult, SceneRecommendation } from '@storywork/ai-recommend'
import type { AnalyzeResult } from '@storywork/ai-script'
import { describe, it, expect } from 'vitest'

import {
  splitScenes,
  emotionGroup,
  isEmotionShift,
  isFullShotSolo,
  isCloseupDialogue,
} from '../src/page-split.js'

// ─────────────────────────────────────────────
// 픽스처 헬퍼
// ─────────────────────────────────────────────

function makeScene(
  index: number,
  opts: {
    location?: string
    cameraAngle?: string
    emotion?: string
    mood?: string
    pacing?: string
    props?: string[]
    lineCount?: number
    characters?: string[]
  } = {},
): AnalyzeResult['scenes'][0] {
  const lines = Array.from({ length: opts.lineCount ?? 1 }, (_, i) => ({
    index: i,
    speaker: '주인공',
    text: `대사 ${i}`,
  }))
  return {
    index,
    slug: `scene-${String(index).padStart(2, '0')}`,
    summary: `장면 ${index}`,
    meta: {
      location: opts.location,
      cameraAngle: opts.cameraAngle as AnalyzeResult['scenes'][0]['meta']['cameraAngle'],
      emotion: opts.emotion,
      mood: opts.mood,
      pacing: opts.pacing as AnalyzeResult['scenes'][0]['meta']['pacing'],
      props: opts.props,
    },
    lines,
    characters: opts.characters ?? ['주인공'],
    confidence: 0.9,
  }
}

function makeAnalyzed(scenes: AnalyzeResult['scenes'][0][]): AnalyzeResult {
  return {
    format: 'novel',
    scenes,
    characters: [{ name: '주인공', mentionCount: 5 }],
    seed: 0,
    modelVersion: 'rule-only',
  }
}

function makeRec(sceneIndex: number): SceneRecommendation {
  return {
    sceneIndex,
    poses: {},
    background: { suggestedTone: 'white', reasoning: '' },
    bubbles: [],
    confidence: 0.8,
    seed: 0,
  }
}

function makeRecommended(sceneIndices: number[]): RecommendResult {
  return {
    scenes: sceneIndices.map(makeRec),
    seed: 0,
    modelVersion: 'rule-only',
  }
}

// ─────────────────────────────────────────────
// 헬퍼 함수 단위 테스트
// ─────────────────────────────────────────────

describe('emotionGroup()', () => {
  it('happy → calm', () => expect(emotionGroup('happy')).toBe('calm'))
  it('tense → tense', () => expect(emotionGroup('tense')).toBe('tense'))
  it('angry → tense', () => expect(emotionGroup('angry')).toBe('tense'))
  it('undefined → neutral', () => expect(emotionGroup(undefined)).toBe('neutral'))
  it('romantic → calm', () => expect(emotionGroup('romantic')).toBe('calm'))
  it('action → tense', () => expect(emotionGroup('action')).toBe('tense'))
})

describe('isEmotionShift()', () => {
  it('calm → tense 는 shift', () => expect(isEmotionShift('happy', 'tense')).toBe(true))
  it('tense → calm 는 shift', () => expect(isEmotionShift('angry', 'romantic')).toBe(true))
  it('같은 그룹은 shift 아님', () => expect(isEmotionShift('happy', 'calm')).toBe(false))
  it('neutral 포함 → shift 아님', () => expect(isEmotionShift(undefined, 'tense')).toBe(false))
})

describe('isFullShotSolo()', () => {
  it('wide + props 3개 → true', () => {
    const s = makeScene(0, { cameraAngle: 'wide', props: ['나무', '집', '차'] })
    expect(isFullShotSolo(s)).toBe(true)
  })
  it('wide + props 2개 → false', () => {
    const s = makeScene(0, { cameraAngle: 'wide', props: ['나무', '집'] })
    expect(isFullShotSolo(s)).toBe(false)
  })
  it('medium + props 3개 → false', () => {
    const s = makeScene(0, { cameraAngle: 'medium', props: ['a', 'b', 'c'] })
    expect(isFullShotSolo(s)).toBe(false)
  })
})

describe('isCloseupDialogue()', () => {
  it('closeup + 4 lines → true', () => {
    const s = makeScene(0, { cameraAngle: 'closeup', lineCount: 4 })
    expect(isCloseupDialogue(s)).toBe(true)
  })
  it('closeup + 3 lines → false', () => {
    const s = makeScene(0, { cameraAngle: 'closeup', lineCount: 3 })
    expect(isCloseupDialogue(s)).toBe(false)
  })
  it('medium + 5 lines → false', () => {
    const s = makeScene(0, { cameraAngle: 'medium', lineCount: 5 })
    expect(isCloseupDialogue(s)).toBe(false)
  })
})

// ─────────────────────────────────────────────
// splitScenes() 5 규칙 테스트
// ─────────────────────────────────────────────

describe('R1: 기본 1 페이지 = 1 장면', () => {
  it('단일 장면 → 1 페이지', () => {
    const s0 = makeScene(0, { cameraAngle: 'medium', emotion: 'neutral' })
    const analyzed = makeAnalyzed([s0])
    const rec = makeRecommended([0])
    const pages = splitScenes(rec.scenes, analyzed)
    expect(pages).toHaveLength(1)
    expect(pages[0]?.sceneIndices).toEqual([0])
    expect(pages[0]?.templateHint).toBe('default')
  })

  it('3 장면 서로 다른 location + emotion → 3 페이지', () => {
    const scenes = [
      makeScene(0, { location: '학교', emotion: 'happy', cameraAngle: 'medium' }),
      makeScene(1, { location: '집', emotion: 'tense', cameraAngle: 'medium' }),
      makeScene(2, { location: '공원', emotion: 'romantic', cameraAngle: 'medium' }),
    ]
    const analyzed = makeAnalyzed(scenes)
    const rec = makeRecommended([0, 1, 2])
    const pages = splitScenes(rec.scenes, analyzed)
    expect(pages).toHaveLength(3)
    for (let i = 0; i < 3; i++) {
      expect(pages[i]?.pageIndex).toBe(i)
    }
  })

  it('빈 입력 → 빈 배열', () => {
    const analyzed = makeAnalyzed([])
    const pages = splitScenes([], analyzed)
    expect(pages).toHaveLength(0)
  })
})

describe('R2: closeup + dialogue 4+ → 4컷 합병', () => {
  it('closeup×4 + 4 lines each → 1 페이지 four-cut', () => {
    const scenes = [
      makeScene(0, { cameraAngle: 'closeup', emotion: 'happy', lineCount: 4 }),
      makeScene(1, { cameraAngle: 'closeup', emotion: 'happy', lineCount: 4 }),
      makeScene(2, { cameraAngle: 'closeup', emotion: 'happy', lineCount: 4 }),
      makeScene(3, { cameraAngle: 'closeup', emotion: 'happy', lineCount: 4 }),
    ]
    const analyzed = makeAnalyzed(scenes)
    const rec = makeRecommended([0, 1, 2, 3])
    const pages = splitScenes(rec.scenes, analyzed)
    expect(pages).toHaveLength(1)
    expect(pages[0]?.sceneIndices).toEqual([0, 1, 2, 3])
    expect(pages[0]?.templateHint).toBe('four-cut')
  })

  it('closeup×2 → 1 페이지 closeup (2개 합병)', () => {
    const scenes = [
      makeScene(0, { cameraAngle: 'closeup', emotion: 'happy', lineCount: 4 }),
      makeScene(1, { cameraAngle: 'closeup', emotion: 'happy', lineCount: 4 }),
    ]
    const analyzed = makeAnalyzed(scenes)
    const rec = makeRecommended([0, 1])
    const pages = splitScenes(rec.scenes, analyzed)
    expect(pages).toHaveLength(1)
    expect(pages[0]?.sceneIndices).toHaveLength(2)
    expect(pages[0]?.templateHint).toBe('closeup')
  })

  it('R5 급변 도중 4컷 합병 중단', () => {
    const scenes = [
      makeScene(0, { cameraAngle: 'closeup', emotion: 'happy', lineCount: 4 }),
      makeScene(1, { cameraAngle: 'closeup', emotion: 'happy', lineCount: 4 }),
      makeScene(2, { cameraAngle: 'closeup', emotion: 'tense', lineCount: 4 }), // 급변
      makeScene(3, { cameraAngle: 'closeup', emotion: 'tense', lineCount: 4 }),
    ]
    const analyzed = makeAnalyzed(scenes)
    const rec = makeRecommended([0, 1, 2, 3])
    const pages = splitScenes(rec.scenes, analyzed)
    // 0,1 합병 / 2,3 별개 처리
    expect(pages.length).toBeGreaterThanOrEqual(2)
  })
})

describe('R3: wide + props 다수 → 풀샷 단독', () => {
  it('wide + 3 props → full-shot-solo, 다른 장면과 합병 안 됨', () => {
    const scenes = [
      makeScene(0, { cameraAngle: 'wide', props: ['나무', '집', '차'], emotion: 'neutral' }),
      makeScene(1, { cameraAngle: 'medium', emotion: 'neutral', location: 'outdoor' }),
    ]
    const analyzed = makeAnalyzed(scenes)
    const rec = makeRecommended([0, 1])
    const pages = splitScenes(rec.scenes, analyzed)
    expect(pages[0]?.templateHint).toBe('full-shot-solo')
    expect(pages[0]?.sceneIndices).toEqual([0])
  })

  it('wide + 4 props → full-shot-solo 단독 (R4 합병 불가)', () => {
    const scenes = [
      makeScene(0, {
        location: '공원',
        cameraAngle: 'wide',
        props: ['a', 'b', 'c', 'd'],
        emotion: 'neutral',
      }),
      makeScene(1, { location: '공원', cameraAngle: 'medium', emotion: 'neutral' }),
    ]
    const analyzed = makeAnalyzed(scenes)
    const rec = makeRecommended([0, 1])
    const pages = splitScenes(rec.scenes, analyzed)
    expect(pages[0]?.templateHint).toBe('full-shot-solo')
    expect(pages).toHaveLength(2)
  })
})

describe('R4: 같은 location 연속 → 결합', () => {
  it('같은 location 연속 2장면 → 1 페이지 1on1-talk', () => {
    const scenes = [
      makeScene(0, { location: '학교', cameraAngle: 'medium', emotion: 'happy' }),
      makeScene(1, { location: '학교', cameraAngle: 'medium', emotion: 'happy' }),
    ]
    const analyzed = makeAnalyzed(scenes)
    const rec = makeRecommended([0, 1])
    const pages = splitScenes(rec.scenes, analyzed)
    expect(pages).toHaveLength(1)
    expect(pages[0]?.templateHint).toBe('1on1-talk')
    expect(pages[0]?.sceneIndices).toEqual([0, 1])
  })

  it('location 다름 → 결합 안 됨', () => {
    const scenes = [
      makeScene(0, { location: '학교', cameraAngle: 'medium', emotion: 'happy' }),
      makeScene(1, { location: '집', cameraAngle: 'medium', emotion: 'happy' }),
    ]
    const analyzed = makeAnalyzed(scenes)
    const rec = makeRecommended([0, 1])
    const pages = splitScenes(rec.scenes, analyzed)
    expect(pages).toHaveLength(2)
  })

  it('R5 급변하면 같은 location도 결합 안 됨', () => {
    const scenes = [
      makeScene(0, { location: '학교', cameraAngle: 'medium', emotion: 'happy' }),
      makeScene(1, { location: '학교', cameraAngle: 'medium', emotion: 'tense' }),
    ]
    const analyzed = makeAnalyzed(scenes)
    const rec = makeRecommended([0, 1])
    const pages = splitScenes(rec.scenes, analyzed)
    // happy(calm) → tense(tense) = 급변 → 분리
    expect(pages).toHaveLength(2)
  })
})

describe('R5: emotion 급변 → 강제 페이지 분할', () => {
  it('calm → tense 전환 → 별개 페이지', () => {
    const scenes = [
      makeScene(0, { cameraAngle: 'medium', emotion: 'calm', location: 'A' }),
      makeScene(1, { cameraAngle: 'medium', emotion: 'tense', location: 'A' }),
    ]
    const analyzed = makeAnalyzed(scenes)
    const rec = makeRecommended([0, 1])
    const pages = splitScenes(rec.scenes, analyzed)
    expect(pages).toHaveLength(2)
  })

  it('같은 tense 연속 → 분리 안 됨 (같은 location 시 결합)', () => {
    const scenes = [
      makeScene(0, { cameraAngle: 'medium', emotion: 'tense', location: 'B' }),
      makeScene(1, { cameraAngle: 'medium', emotion: 'action', location: 'B' }),
    ]
    const analyzed = makeAnalyzed(scenes)
    const rec = makeRecommended([0, 1])
    const pages = splitScenes(rec.scenes, analyzed)
    // tense + action 같은 그룹 → 급변 아님 → R4 결합
    expect(pages).toHaveLength(1)
    expect(pages[0]?.templateHint).toBe('1on1-talk')
  })
})

describe('결정론: 동일 입력 → 동일 출력', () => {
  it('3회 호출 결과 동일', () => {
    const scenes = [
      makeScene(0, { location: '학교', emotion: 'happy', cameraAngle: 'medium' }),
      makeScene(1, { location: '학교', emotion: 'happy', cameraAngle: 'medium' }),
      makeScene(2, { location: '집', emotion: 'tense', cameraAngle: 'closeup', lineCount: 4 }),
      makeScene(3, { location: '집', emotion: 'tense', cameraAngle: 'closeup', lineCount: 4 }),
    ]
    const analyzed = makeAnalyzed(scenes)
    const rec = makeRecommended([0, 1, 2, 3])
    const r1 = splitScenes(rec.scenes, analyzed)
    const r2 = splitScenes(rec.scenes, analyzed)
    const r3 = splitScenes(rec.scenes, analyzed)
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2))
    expect(JSON.stringify(r2)).toBe(JSON.stringify(r3))
  })
})
