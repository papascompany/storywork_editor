import { describe, expect, it } from 'vitest'

import { parseSceneHeading, parseScreenplay } from '../src/parsers/parse-screenplay.js'

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

  it('지문([...]) 은 대사가 아니라 direction 으로 분리된다 (SCRIPT-KO-04)', () => {
    // 종전에는 지문을 통째로 버렸다. 이제는 보존하되 말풍선이 아닌 캡션 대상으로 표시한다.
    const text = `[철수가 들어온다]
철수: 안녕하세요.`
    const scenes = parseScreenplay(text)
    const lines = scenes[0]?.lines ?? []
    const direction = lines.find((l) => l.text.startsWith('['))
    expect(direction?.kind).toBe('direction')
    expect(direction?.speaker).toBeUndefined()
    expect(lines.filter((l) => l.kind === 'dialogue')).toHaveLength(1)
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

// ─────────────────────────────────────────────
// 씬 헤딩 흡수 (SCRIPT-KO-04)
// ─────────────────────────────────────────────

describe('parseSceneHeading()', () => {
  it('장소 / 시간대를 분리한다', () => {
    expect(parseSceneHeading('대학병원 응급실 입구 / 밤')).toEqual({
      location: '대학병원 응급실 입구',
      timeOfDay: 'night',
    })
  })

  it('새벽은 어두운 시간대라 night 로 접는다 (배경 톤 기준)', () => {
    expect(parseSceneHeading('학교 정문 / 새벽').timeOfDay).toBe('night')
  })

  it('시간 표기가 없으면 장소만 남는다', () => {
    expect(parseSceneHeading('교무실')).toEqual({ location: '교무실' })
  })

  it('영문 헤딩의 대시 구분도 처리한다', () => {
    expect(parseSceneHeading('HOSPITAL ROOM - NIGHT')).toEqual({
      location: 'HOSPITAL ROOM',
      timeOfDay: 'night',
    })
  })

  it('긴 꼬리는 시간대로 오인하지 않는다', () => {
    // "한밤중 골목길" 은 장소다 — 짧은 시간 표기만 시간대로 인정한다
    expect(parseSceneHeading('한밤중 골목길').timeOfDay).toBeUndefined()
  })
})

describe('parseScreenplay() — 씬 헤딩 (SCRIPT-KO-04)', () => {
  const SAMPLE = `S#1. 대학병원 응급실 입구 / 밤

사이렌이 젖은 아스팔트를 긁는다.

서준: 바이탈 불러주세요.
미소: 혈압 팔십에 사십.


S#2. 병원 옥상 / 새벽

하윤: 아까는 미안.`

  it('S#N 형식 헤딩으로 장면을 나눈다 (종전 정규식이 놓치던 형식)', () => {
    const scenes = parseScreenplay(SAMPLE)
    expect(scenes.length).toBe(2)
  })

  it('헤딩은 라인이 아니라 장면 속성으로 흡수된다', () => {
    const scenes = parseScreenplay(SAMPLE)
    const allText = scenes.flatMap((s) => s.lines).map((l) => l.text)
    expect(allText.some((t) => t.startsWith('S#'))).toBe(false)
    expect(scenes[0]?.meta.location).toBe('대학병원 응급실 입구')
    expect(scenes[0]?.meta.timeOfDay).toBe('night')
    expect(scenes[1]?.meta.location).toBe('병원 옥상')
  })

  it('화자 없는 서술은 narration, 화자 행은 dialogue', () => {
    const scenes = parseScreenplay(SAMPLE)
    const first = scenes[0]?.lines ?? []
    expect(first[0]?.kind).toBe('narration')
    expect(first[0]?.text).toBe('사이렌이 젖은 아스팔트를 긁는다.')
    expect(first[1]?.kind).toBe('dialogue')
    expect(first[1]?.speaker).toBe('서준')
  })

  it('"장면이 바뀌었다" 같은 서술문은 헤딩으로 오인하지 않는다', () => {
    const scenes = parseScreenplay(`장면이 바뀌었다
철수: 그러네.`)
    const texts = (scenes[0]?.lines ?? []).map((l) => l.text)
    expect(texts).toContain('장면이 바뀌었다')
  })
})
