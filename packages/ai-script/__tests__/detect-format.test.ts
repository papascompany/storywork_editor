import { describe, expect, it } from 'vitest'

import { detectFormat } from '../src/parsers/detect-format.js'

describe('detectFormat()', () => {
  it('빈 문자열은 novel 로 처리한다', () => {
    expect(detectFormat('')).toBe('novel')
  })

  it('스크린플레이 — 화자: 패턴 20%+ 이면 screenplay', () => {
    const text = `
철수: 안녕하세요.
영희: 반갑습니다.
철수: 오늘 날씨 좋네요.
영희: 정말요?
나레이션: 두 사람은 공원을 걷기 시작했다.
`.trim()
    expect(detectFormat(text)).toBe('screenplay')
  })

  it('스크린플레이 — INT. 씬 헤더 있으면 screenplay', () => {
    const text = `INT. 거실 - 낮

남자가 의자에 앉아 있다.`
    expect(detectFormat(text)).toBe('screenplay')
  })

  it('다이어리 — 날짜 헤더 있으면 diary', () => {
    const text = `2026년 6월 3일

오늘은 정말 힘든 하루였다. 나는 아침부터 피곤했다.`
    expect(detectFormat(text)).toBe('diary')
  })

  it('에세이 — 1인칭 많고 대화 없으면 essay', () => {
    const text = `나는 오늘 새벽 일찍 일어났다. 나의 마음은 복잡했다.
나에게는 이 모든 것이 낯설었다. 내가 왜 이곳에 왔는지 의문이 들었다.
나는 오랫동안 생각했다. 나의 삶은 무엇인가.`
    expect(detectFormat(text)).toBe('essay')
  })

  it('소설 — 기본 fallback', () => {
    const text = `어느 날 아침, 그레고르 잠자는 불안한 꿈에서 깨어났다.
긴 여행에서 돌아온 것 같은 기분이었다.`
    expect(detectFormat(text)).toBe('novel')
  })

  it('라이트노벨 — 짧은 행 + 대화 있으면 light-novel', () => {
    const text = `"잠깐만요."
그녀가 말했다.
"당신이 용사군요."
"그렇습니다."
나는 고개를 끄덕였다.`
    expect(detectFormat(text)).toBe('light-novel')
  })
})
