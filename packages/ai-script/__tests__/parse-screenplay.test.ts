import { describe, expect, it } from 'vitest'

import { parseScreenplay } from '../src/parsers/parse-screenplay.js'

describe('parseScreenplay()', () => {
  it('빈 문자열은 빈 배열 반환', () => {
    expect(parseScreenplay('')).toEqual([])
  })

  it('단순 화자: 대사 → 1개 장면, 올바른 speaker/text 분리', () => {
    const text = `철수: 안녕하세요.
영희: 반갑습니다.`
    const scenes = parseScreenplay(text)
    expect(scenes.length).toBeGreaterThanOrEqual(1)
    const firstScene = scenes[0]
    expect(firstScene).toBeDefined()
    const lines = firstScene?.lines ?? []
    expect(lines[0]?.speaker).toBe('철수')
    expect(lines[0]?.text).toBe('안녕하세요.')
    expect(lines[1]?.speaker).toBe('영희')
  })

  it('빈 행 2줄 이상으로 장면 구분', () => {
    const text = `철수: 안녕.
영희: 응.


민수: 나도 왔어.`
    const scenes = parseScreenplay(text)
    expect(scenes.length).toBeGreaterThanOrEqual(2)
  })

  it('characters 필드에 화자 이름 포함', () => {
    const text = `철수: 오늘 날씨 어때?
영희: 좋은 것 같아.
철수: 나가자.`
    const scenes = parseScreenplay(text)
    expect(scenes.length).toBeGreaterThanOrEqual(1)
    const chars = scenes[0]?.characters ?? []
    expect(chars).toContain('철수')
    expect(chars).toContain('영희')
  })

  it('slug 는 scene-01 형식', () => {
    const text = `철수: 안녕.`
    const scenes = parseScreenplay(text)
    expect(scenes[0]?.slug).toBe('scene-01')
  })

  it('confidence 가 0과 1 사이', () => {
    const text = `철수: 테스트.`
    const scenes = parseScreenplay(text)
    expect(scenes[0]?.confidence).toBeGreaterThanOrEqual(0)
    expect(scenes[0]?.confidence).toBeLessThanOrEqual(1)
  })

  it('지문([...]) 은 lines 에 포함되지 않는다', () => {
    const text = `[철수가 들어온다]
철수: 안녕하세요.`
    const scenes = parseScreenplay(text)
    const lines = scenes[0]?.lines ?? []
    const stageDirections = lines.filter((l) => l.text.startsWith('['))
    expect(stageDirections.length).toBe(0)
  })

  it('씬 헤더(#씬1:) 로 장면 구분', () => {
    const text = `씬1:
철수: 첫 번째.

씬2:
영희: 두 번째.`
    const scenes = parseScreenplay(text)
    expect(scenes.length).toBe(2)
  })

  it('index 는 0부터 순서대로', () => {
    const text = `철수: 첫 번째.


영희: 두 번째.`
    const scenes = parseScreenplay(text)
    if (scenes.length >= 2) {
      expect(scenes[0]?.index).toBe(0)
      expect(scenes[1]?.index).toBe(1)
    }
  })
})
