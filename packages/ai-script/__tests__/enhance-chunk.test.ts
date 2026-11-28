/**
 * enhance-chunk.test.ts — CONTI-01 LLM 보강: 컨텍스트 확대 · view 병합 · 묶음 병렬/부분 실패
 *
 * generateObject 를 mock 해 실제 LLM 호출 없이 검증한다. 캐시는 끈다(STORYWORK_LLM_CACHE=0).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AnalyzeResult, AnalyzedScene } from '../src/types.js'

const generateObject = vi.fn()
vi.mock('ai', () => ({ generateObject: (...args: unknown[]) => generateObject(...args) }))

function makeScene(index: number, text = `장면 ${index} 대사`): AnalyzedScene {
  return {
    index,
    slug: `scene-${index}`,
    summary: `요약 ${index}`,
    meta: {},
    lines: [{ index: 0, speaker: '철수', text }],
    characters: ['철수'],
    confidence: 0.5,
  }
}

function makeBase(sceneCount: number): AnalyzeResult {
  return {
    format: 'novel',
    scenes: Array.from({ length: sceneCount }, (_, i) => makeScene(i)),
    characters: [{ name: '철수', mentionCount: sceneCount }],
    seed: 0,
    modelVersion: 'rule-only',
  }
}

/** 요청 메시지에 담긴 장면 index 를 읽어 cameraAngle/view 를 채운 응답을 돌려준다 */
function respondFromRequest(args: { messages: Array<{ content: Array<{ text: string }> }> }) {
  const payload = JSON.parse(args.messages[0]?.content[0]?.text ?? '{}') as {
    scenes: Array<{ index: number }>
  }
  return Promise.resolve({
    object: {
      scenes: payload.scenes.map((s) => ({
        index: s.index,
        cameraAngle: s.index % 2 === 0 ? 'closeup' : 'wide',
        view: 'side',
      })),
      characters: [{ name: '철수', suggestedBodyType: 'M' }],
      confidence: 0.8,
    },
  })
}

const savedEnv = { ...process.env }

beforeEach(() => {
  generateObject.mockReset()
  process.env['STORYWORK_LLM_CACHE'] = '0'
  process.env['ANTHROPIC_API_KEY'] = 'test-key'
})

afterEach(() => {
  process.env = { ...savedEnv }
})

describe('sceneContext / buildUserMessage', () => {
  it('장면 원문을 화자와 함께 담고 상한에서 자른다', async () => {
    const { sceneContext, buildUserMessage } = await import('../src/llm/enhance.js')
    const long = makeScene(0, '가'.repeat(1000))
    const ctx = sceneContext(long, 50)
    expect(ctx.startsWith('철수: 가')).toBe(true)
    expect(ctx.length).toBe(51) // 50자 + 말줄임표

    const msg = JSON.parse(buildUserMessage('대본', [makeScene(3)], [], 10)) as {
      totalScenes: number
      scenes: Array<{ index: number; text: string; speakers: string[] }>
    }
    expect(msg.totalScenes).toBe(10)
    expect(msg.scenes[0]).toMatchObject({ index: 3, text: '철수: 장면 3 대사', speakers: ['철수'] })
  })
})

describe('enhanceWithLLM — 묶음 병렬', () => {
  it('45장면 → 20개 단위 3회 호출, cameraAngle·view 가 모든 장면에 병합', async () => {
    generateObject.mockImplementation(respondFromRequest)
    const { enhanceWithLLM } = await import('../src/llm/enhance.js')
    const result = await enhanceWithLLM('대본', makeBase(45), { seed: 0 })

    expect(generateObject).toHaveBeenCalledTimes(3)
    expect(result.scenes.every((s) => s.meta.view === 'side')).toBe(true)
    expect(result.scenes[0]?.meta.cameraAngle).toBe('closeup')
    expect(result.scenes[1]?.meta.cameraAngle).toBe('wide')
    expect(result.characters[0]?.suggestedBodyType).toBe('M')
    expect(result.modelVersion).toBe('claude-sonnet-4-6')
  })

  it('일부 묶음 실패 → 성공한 묶음만 병합, 실패 장면은 룰 메타 유지', async () => {
    let call = 0
    generateObject.mockImplementation((args: Parameters<typeof respondFromRequest>[0]) => {
      call++
      return call === 2 ? Promise.reject(new Error('timeout')) : respondFromRequest(args)
    })
    const { enhanceWithLLM } = await import('../src/llm/enhance.js')
    const result = await enhanceWithLLM('대본', makeBase(45), { seed: 0 })

    const enhanced = result.scenes.filter((s) => s.meta.view === 'side').length
    expect(enhanced).toBe(25) // 3묶음(20·20·5) 중 하나(20) 실패
    expect(result.modelVersion).toBe('claude-sonnet-4-6')
  })

  it('전 묶음 실패 → throw (analyze.ts 가 rule-only 로 폴백)', async () => {
    generateObject.mockRejectedValue(new Error('down'))
    const { enhanceWithLLM } = await import('../src/llm/enhance.js')
    await expect(enhanceWithLLM('대본', makeBase(5), { seed: 0 })).rejects.toThrow('down')
  })
})
