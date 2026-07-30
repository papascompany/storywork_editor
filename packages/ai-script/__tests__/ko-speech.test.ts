/**
 * ko-speech.test.ts — 한국어 화자귀속 1층 룰 엔진 (SCRIPT-KO-01)
 *
 * 검증 항목:
 *  1. 발화동사 어간 매칭 — 활용형 커버 (했다/하며/한다/묻자/외치며/중얼거렸다…)
 *  2. 따옴표 delimiter 플러그인 — 곧은/굽은 큰따옴표·「」·『』·대시 대화
 *  3. 캐릭터 ID 레지스트리 — 애칭 '이'·호격·성+이름 병합, 인물성 게이트
 *  4. 귀속 규칙 — 후행/선행 발화동사, 행동 귀속, 대명사, 교대 보정
 *  5. 무생물 주어('간판이/불빛이') 오귀속 방지
 */

import { describe, expect, it } from 'vitest'

import {
  attributeParagraph,
  CharacterRegistry,
  createAttributionContext,
  extractDialogueQuotes,
  SPEECH_VERB_RE,
} from '../src/parsers/ko-speech.js'
import { parseNovel } from '../src/parsers/parse-novel.js'

// ─────────────────────────────────────────────
// 1. 발화동사 활용형
// ─────────────────────────────────────────────

describe('SPEECH_VERB_RE — 어간 매칭 활용형 커버', () => {
  const positives = [
    '말했다',
    '말하며',
    '말한다',
    '말할 것이다',
    '이야기했다',
    '얘기하며',
    '대답했다',
    '대꾸하며',
    '물었다',
    '물으며',
    '묻자',
    '되물었다',
    '외쳤다',
    '외치며',
    '소리쳤다',
    '소리치면서',
    '소리 질렀다',
    '고함쳤다',
    '속삭였다',
    '속삭이며',
    '중얼거렸다',
    '중얼거리며',
    '투덜거렸다',
    '덧붙였다',
    '내뱉었다',
    '쏘아붙였다',
    '털어놓았다',
    '혼잣말을 했다',
    '입을 열었다',
    '말을 이었다',
    '말을 꺼냈다',
  ]
  for (const form of positives) {
    it(`매칭: ${form}`, () => {
      expect(SPEECH_VERB_RE.test(form)).toBe(true)
    })
  }

  const negatives = ['걸었다', '들렸다', '흔들렸다', '비췄다', '놓였다', '열렸다']
  for (const form of negatives) {
    it(`비매칭: ${form}`, () => {
      expect(SPEECH_VERB_RE.test(form)).toBe(false)
    })
  }
})

// ─────────────────────────────────────────────
// 2. 따옴표 delimiter 플러그인
// ─────────────────────────────────────────────

describe('extractDialogueQuotes — 따옴표 규약', () => {
  it('곧은/굽은 큰따옴표 + 「」 + 『』 추출', () => {
    expect(extractDialogueQuotes('"직선따옴표"')[0]?.text).toBe('직선따옴표')
    expect(extractDialogueQuotes('“굽은따옴표”')[0]?.text).toBe('굽은따옴표')
    expect(extractDialogueQuotes('「꺾쇠」')[0]?.text).toBe('꺾쇠')
    expect(extractDialogueQuotes('『겹꺾쇠』')[0]?.text).toBe('겹꺾쇠')
  })

  it('대시 대화 행 추출 (인용 기호 없을 때)', () => {
    const quotes = extractDialogueQuotes('— 지금 갈게.')
    expect(quotes).toHaveLength(1)
    expect(quotes[0]?.text).toBe('지금 갈게.')
  })

  it('여러 인용의 위치(start/end)가 순서대로', () => {
    const para = '"첫째." 철수가 말했다. "둘째."'
    const quotes = extractDialogueQuotes(para)
    expect(quotes).toHaveLength(2)
    expect(quotes[0]?.start ?? Infinity).toBeLessThan(quotes[1]?.start ?? -Infinity)
  })
})

// ─────────────────────────────────────────────
// 3. 캐릭터 ID 레지스트리
// ─────────────────────────────────────────────

describe('CharacterRegistry — 별칭 병합 (BookNLP 패턴)', () => {
  it("애칭 '이' 병합: 민준이 → 민준", () => {
    const reg = new CharacterRegistry()
    expect(reg.mention('민준', true)).toBe('민준')
    expect(reg.mention('민준이')).toBe('민준')
  })

  it('성+이름 병합: 김민준 → 민준 (기지 canonical 접미 일치)', () => {
    const reg = new CharacterRegistry()
    reg.mention('민준', true)
    expect(reg.mention('김민준')).toBe('민준')
  })

  it('역방향 승격: 김민준 먼저 등장 후 민준 → canonical 민준으로 병합', () => {
    const reg = new CharacterRegistry()
    reg.mention('김민준', true)
    expect(reg.mention('민준')).toBe('민준')
    expect(reg.isPerson('김민준')).toBe(true)
  })

  it('호격은 기지 인물일 때만 병합: 민준아 → 민준', () => {
    const reg = new CharacterRegistry()
    reg.mention('민준', true)
    expect(reg.normalize('민준아')).toBe('민준')
    // 미지 3자 이름 '김수아'는 호격 strip 하지 않음
    const reg2 = new CharacterRegistry()
    expect(reg2.mention('김수아', true)).toBe('김수아')
  })

  it('인물성 게이트: 비인물 언급은 mostRecent 에 오르지 않음', () => {
    const reg = new CharacterRegistry()
    reg.mention('철수', true)
    reg.mention('간판', false)
    expect(reg.mostRecent()).toBe('철수')
  })
})

// ─────────────────────────────────────────────
// 4. 귀속 규칙 (attributeParagraph)
// ─────────────────────────────────────────────

describe('attributeParagraph — 귀속 우선순위', () => {
  it('후행 발화동사: "…" 철수가 말했다', () => {
    const ctx = createAttributionContext()
    const [q] = attributeParagraph('"안녕?" 철수가 말했다.', ctx)
    expect(q?.speaker).toBe('철수')
  })

  it('라고 인용: "…"라고 영희가 속삭였다', () => {
    const ctx = createAttributionContext()
    const [q] = attributeParagraph('"이리 와"라고 영희가 속삭였다.', ctx)
    expect(q?.speaker).toBe('영희')
  })

  it('선행 발화동사: 철수가 물었다. "…"', () => {
    const ctx = createAttributionContext()
    const [q] = attributeParagraph('철수가 물었다. "몇 시야?"', ctx)
    expect(q?.speaker).toBe('철수')
  })

  it('선행 행동 귀속: 영희가 고개를 들었다. "…"', () => {
    const ctx = createAttributionContext()
    const [q] = attributeParagraph('영희가 고개를 들었다. "왔구나."', ctx)
    expect(q?.speaker).toBe('영희')
  })

  it('멀티 인용 중간 귀속: "응." 철수가 대답했다. "잘 지냈어." → 둘 다 철수', () => {
    const ctx = createAttributionContext()
    const quotes = attributeParagraph('"응." 철수가 대답했다. "잘 지냈어."', ctx)
    expect(quotes.map((q) => q.speaker)).toEqual(['철수', '철수'])
  })

  it('대명사 해소: 최근 인물 언급 → 그가 혼잣말을 했다', () => {
    const ctx = createAttributionContext()
    attributeParagraph('민수가 공원 벤치에 앉아 있었다. 가로등 불빛이 그의 얼굴을 비췄다.', ctx)
    const [q] = attributeParagraph('"다들 잘 지내?" 그가 혼잣말을 했다.', ctx)
    expect(q?.speaker).toBe('민수')
  })

  it('무생물 주어는 화자가 되지 않음: 간판이 흔들렸다', () => {
    const ctx = createAttributionContext()
    attributeParagraph('낡은 간판이 흔들렸다.', ctx)
    const [q] = attributeParagraph('"바람이 세네." 누군가 말했다.', ctx)
    expect(q?.speaker).not.toBe('간판')
  })

  it('교대 보정: A-B 확립 후 무단서 인용 전용 단락 → 상대 화자', () => {
    const ctx = createAttributionContext()
    attributeParagraph('"먼저 가." 철수가 말했다.', ctx)
    attributeParagraph('"싫어." 영희가 대답했다.', ctx)
    const [q] = attributeParagraph('"그럼 같이 가."', ctx)
    expect(q?.speaker).toBe('철수')
  })

  it('교대 보정은 서사 섞인 단락에는 적용하지 않음', () => {
    const ctx = createAttributionContext()
    attributeParagraph('"먼저 가." 철수가 말했다.', ctx)
    attributeParagraph('"싫어." 영희가 대답했다.', ctx)
    const [q] = attributeParagraph('"그럼 같이 가." 바람이 세게 불었다.', ctx)
    expect(q?.speaker).toBeUndefined()
  })
})

// ─────────────────────────────────────────────
// 5. parseNovel 통합 — 골든 패턴 종합 정확도
// ─────────────────────────────────────────────

describe('parseNovel — 화자귀속 종합 (골든 novel 패턴)', () => {
  it('01-short 패턴: 후행 귀속 + 행동 귀속', () => {
    const text = `철수는 천천히 문을 열었다.

한편, 영희는 창가에서 책을 읽고 있었다.

"안녕?" 철수가 말했다.

영희가 고개를 들었다. "왔구나."`
    const scenes = parseNovel(text)
    const lines = scenes.flatMap((s) => s.lines)
    expect(lines.find((l) => l.text === '안녕?')?.speaker).toBe('철수')
    expect(lines.find((l) => l.text === '왔구나.')?.speaker).toBe('영희')
  })

  it('씬 구분자 단락("그날 저녁, 민수가…")의 언급도 대명사 해소에 쓰임', () => {
    const text = `"늦었어." 영희가 말했다.

그날 저녁, 민수가 공원 벤치에 앉아 있었다. 가로등 불빛이 그의 얼굴을 비췄다.

"다들 잘 지내?" 그가 혼잣말을 했다.`
    const scenes = parseNovel(text)
    const lines = scenes.flatMap((s) => s.lines)
    expect(lines.find((l) => l.text === '다들 잘 지내?')?.speaker).toBe('민수')
  })

  it('캐릭터는 canonical ID 로 집계 (민준이/김민준 → 민준)', () => {
    const text = `민준이 창밖을 바라보았다.

"비 온다." 민준이가 말했다.

"우산 챙겨."라고 김민준이 덧붙였다.`
    const scenes = parseNovel(text)
    const chars = new Set(scenes.flatMap((s) => s.characters))
    expect(chars.has('민준')).toBe(true)
    expect(chars.has('민준이')).toBe(false)
    expect(chars.has('김민준')).toBe(false)
  })
})
