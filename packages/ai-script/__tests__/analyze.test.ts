import { describe, expect, it } from 'vitest'

import { analyze } from '../src/analyze.js'

// LLM 비활성화 환경에서 룰-only 테스트
describe('analyze() — rule-only mode', () => {
  it('기본 옵션으로 분석 결과를 반환한다', async () => {
    const result = await analyze('철수: 안녕하세요.\n영희: 반갑습니다.', {
      llmEnabled: false,
    })
    expect(result).toBeDefined()
    expect(result.format).toBeDefined()
    expect(Array.isArray(result.scenes)).toBe(true)
    expect(Array.isArray(result.characters)).toBe(true)
  })

  it('seed 가 결과에 포함된다', async () => {
    const result = await analyze('테스트.', { seed: 42, llmEnabled: false })
    expect(result.seed).toBe(42)
  })

  it('modelVersion 은 rule-only 이다', async () => {
    const result = await analyze('테스트.', { llmEnabled: false })
    expect(result.modelVersion).toBe('rule-only')
  })

  it('동일 입력 + seed 는 동일 결과 (결정론)', async () => {
    const text = `철수: 오늘 날씨 어때?\n영희: 좋은 것 같아.`
    const r1 = await analyze(text, { seed: 0, llmEnabled: false })
    const r2 = await analyze(text, { seed: 0, llmEnabled: false })
    expect(r1.scenes.length).toBe(r2.scenes.length)
    expect(r1.characters.length).toBe(r2.characters.length)
    expect(r1.format).toBe(r2.format)
  })

  it('screenplay 형식 명시 시 screenplay 감지', async () => {
    const text = `철수: 안녕.\n영희: 응.`
    const result = await analyze(text, { format: 'screenplay', llmEnabled: false })
    expect(result.format).toBe('screenplay')
  })

  it('format=auto 시 형식 자동 감지', async () => {
    const text = `철수: 안녕하세요.\n영희: 반갑습니다.\n철수: 오늘 뭐 해요?`
    const result = await analyze(text, { format: 'auto', llmEnabled: false })
    expect(['screenplay', 'novel', 'light-novel', 'essay', 'diary']).toContain(result.format)
  })

  it('빈 대본도 에러 없이 처리', async () => {
    const result = await analyze('', { llmEnabled: false })
    expect(result.scenes).toEqual([])
  })

  it('characters 는 멘션 수 기준 내림차순', async () => {
    const text = [
      '철수: 안녕.',
      '영희: 응.',
      '철수: 잘 지냈어?',
      '영희: 응, 잘 지냈어.',
      '철수: 다행이다.',
    ].join('\n')
    const result = await analyze(text, { format: 'screenplay', llmEnabled: false })
    if (result.characters.length >= 2) {
      const first = result.characters[0]
      const second = result.characters[1]
      if (first && second) {
        expect(first.mentionCount).toBeGreaterThanOrEqual(second.mentionCount)
      }
    }
  })

  it('alternatives 는 undefined 또는 배열', async () => {
    const result = await analyze('테스트.', { llmEnabled: false, maxAlternatives: 0 })
    expect(result.alternatives === undefined || Array.isArray(result.alternatives)).toBe(true)
  })

  it('소설 형식 — 단락 기반 장면 분리', async () => {
    const text = [
      '철수는 집에서 나왔다. 하늘이 맑았다.',
      '',
      '한편, 영희는 학교에 있었다. 수업이 지루했다.',
    ].join('\n')
    const result = await analyze(text, { format: 'novel', llmEnabled: false })
    expect(result.scenes.length).toBeGreaterThanOrEqual(1)
  })

  it('scenes 는 index 순서대로 정렬', async () => {
    const text = `철수: 1.\n\n\n영희: 2.\n\n\n민수: 3.`
    const result = await analyze(text, { format: 'screenplay', llmEnabled: false })
    for (let i = 0; i < result.scenes.length - 1; i++) {
      const cur = result.scenes[i]
      const next = result.scenes[i + 1]
      if (cur && next) {
        expect(cur.index).toBeLessThan(next.index)
      }
    }
  })
})
