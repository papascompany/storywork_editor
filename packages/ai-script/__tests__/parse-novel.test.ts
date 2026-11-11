import { describe, expect, it } from 'vitest'

import { NARRATION_LINE_MAX_CHARS, parseNovel, splitNarration } from '../src/parsers/parse-novel.js'

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

// ─────────────────────────────────────────────
// 긴 서술 단락 — 잘라 버리지 않고 문장 경계에서 나눈다
// ─────────────────────────────────────────────

describe('splitNarration — 긴 서술 단락 보존', () => {
  const sentence = (n: number) =>
    `비 내리던 오후의 기억은 여전히 선명했고 그는 창밖을 오래 바라보았다 ${n}.`
  const long = Array.from({ length: 12 }, (_, i) => sentence(i + 1)).join(' ')
  const squash = (s: string) => s.replace(/\s+/g, '')

  it('상한 이하 단락은 그대로 한 줄이다 (종전 동작과 동일)', () => {
    expect(splitNarration('짧은 서술이다.')).toEqual(['짧은 서술이다.'])
    expect(splitNarration('   ')).toEqual([])
  })

  it('상한을 넘는 단락은 글자를 하나도 잃지 않고 상한 이하 덩어리로 나뉜다', () => {
    expect(long.length).toBeGreaterThan(NARRATION_LINE_MAX_CHARS)
    const parts = splitNarration(long)
    expect(parts.length).toBeGreaterThan(1)
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(NARRATION_LINE_MAX_CHARS)
    expect(squash(parts.join(''))).toBe(squash(long))
  })

  it('문장 중간에서 자르지 않는다 — 각 덩어리는 문장 끝에서 끝난다', () => {
    for (const p of splitNarration(long)) expect(p).toMatch(/\.$/)
  })

  it('문장 하나가 상한보다 길면 공백에서, 공백이 없으면 글자 수로 나눈다', () => {
    const words = Array.from({ length: 80 }, () => '긴문장').join(' ')
    const byWord = splitNarration(words, 50)
    for (const p of byWord) expect(p.length).toBeLessThanOrEqual(50)
    expect(squash(byWord.join(''))).toBe(squash(words))

    const noSpace = '가'.repeat(130)
    expect(splitNarration(noSpace, 50)).toEqual(['가'.repeat(50), '가'.repeat(50), '가'.repeat(30)])
  })

  it('parseNovel — 대사 없는 긴 단락이 여러 서술 행으로 전부 보존된다', () => {
    const scenes = parseNovel(`${long}\n\n"이제 가자." 민수가 말했다.`, 99)
    const narration = scenes.flatMap((s) => s.lines).filter((l) => l.kind === 'narration')
    expect(narration.length).toBeGreaterThan(1)
    expect(squash(narration.map((l) => l.text).join(''))).toBe(squash(long))
    // 행 index 는 장면 안에서 연속이다
    const all = scenes[0]?.lines ?? []
    expect(all.map((l) => l.index)).toEqual(all.map((_, i) => i))
  })
})
