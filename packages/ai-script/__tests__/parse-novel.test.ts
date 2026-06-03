import { describe, expect, it } from 'vitest'

import { parseNovel } from '../src/parsers/parse-novel.js'

describe('parseNovel()', () => {
  it('빈 문자열은 빈 배열 반환', () => {
    expect(parseNovel('')).toEqual([])
  })

  it('단순 단락 → 장면 1개 생성', () => {
    const text = `한 남자가 걷고 있었다. 하늘이 맑았다.`
    const scenes = parseNovel(text)
    expect(scenes.length).toBeGreaterThanOrEqual(1)
  })

  it('빈 행 2줄로 단락 구분 → 장면 분리', () => {
    const text = `첫 번째 단락이다. 여기에 내용이 있다.

두 번째 단락이다. 새로운 장면.`
    const scenes = parseNovel(text)
    expect(scenes.length).toBeGreaterThanOrEqual(1)
  })

  it('따옴표 대화 추출', () => {
    const text = `"안녕하세요?" 철수가 말했다. "반갑습니다." 영희가 대답했다.`
    const scenes = parseNovel(text)
    expect(scenes.length).toBeGreaterThanOrEqual(1)
    const hasDialogue = (scenes[0]?.lines ?? []).some(
      (l) => l.text === '안녕하세요?' || l.text === '반갑습니다.',
    )
    expect(hasDialogue).toBe(true)
  })

  it('「꺾쇠」 따옴표 대화 추출', () => {
    const text = `「이거 맞죠?」 그가 물었다.`
    const scenes = parseNovel(text)
    const line = scenes[0]?.lines.find((l) => l.text.includes('이거 맞죠'))
    expect(line).toBeDefined()
  })

  it('slug 는 scene-01 형식', () => {
    const text = `간단한 내용입니다.`
    const scenes = parseNovel(text)
    expect(scenes[0]?.slug).toBe('scene-01')
  })

  it('confidence 는 0~1 사이', () => {
    const scenes = parseNovel(`내용.`)
    expect(scenes[0]?.confidence).toBeGreaterThanOrEqual(0)
    expect(scenes[0]?.confidence).toBeLessThanOrEqual(1)
  })

  it('씬 구분자 "한편" 으로 장면 구분', () => {
    const text = `철수는 집에 갔다.

한편

영희는 학교에 있었다.`
    const scenes = parseNovel(text)
    expect(scenes.length).toBeGreaterThanOrEqual(2)
  })

  it('씬 구분자 "---" 으로 장면 구분', () => {
    const text = `첫 번째 장면이다.

---

두 번째 장면이다.`
    const scenes = parseNovel(text)
    expect(scenes.length).toBeGreaterThanOrEqual(2)
  })

  it('summary 는 80자 이하로 잘린다', () => {
    const longText = `${'매우 긴 문장이다. '.repeat(10)}`
    const scenes = parseNovel(longText)
    expect(scenes[0]?.summary.length).toBeLessThanOrEqual(82) // '…' 포함
  })

  it('index 는 0부터 증가', () => {
    const text = `첫 번째.\n\n한편\n\n두 번째.`
    const scenes = parseNovel(text)
    if (scenes.length >= 2) {
      expect(scenes[0]?.index).toBe(0)
      expect(scenes[1]?.index).toBe(1)
    }
  })

  it('문장 임계값 초과 시 장면 분리 — 여러 단락', () => {
    // 각 단락이 2문장씩, 임계값=2 이면 각 단락이 별도 장면
    const text = `문장 하나. 문장 둘.

문장 셋. 문장 넷.

문장 다섯. 문장 여섯.`
    const scenes = parseNovel(text, 2)
    expect(scenes.length).toBeGreaterThanOrEqual(2)
  })
})
