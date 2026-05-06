/**
 * filename-tagger.test.ts
 * M2-03a — 파일명 키워드 1차 태깅 단위 테스트
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { clearDictCache, loadDictionary, tagFromFilename } from '../src/filename-tagger.js'

// ─────────────────────────────────────────────
// 사전 경로 설정
// ─────────────────────────────────────────────

const thisDir = path.dirname(fileURLToPath(import.meta.url))
const DICT_PATH = path.resolve(thisDir, '../data/filename-action-dict.ko.json')

beforeEach(() => {
  clearDictCache()
  process.env['FILENAME_DICT_PATH'] = DICT_PATH
})

afterEach(() => {
  delete process.env['FILENAME_DICT_PATH']
  clearDictCache()
})

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

function tag(filename: string, subfolder?: string) {
  const dict = loadDictionary(DICT_PATH)
  return tagFromFilename(filename, subfolder, dict)
}

// ─────────────────────────────────────────────
// 테스트
// ─────────────────────────────────────────────

describe('tagFromFilename — 서기/standing', () => {
  it('01_서기_01.png → action=standing, view=front', () => {
    const r = tag('01_서기_01.png')
    expect(r.action).toBe('standing')
    expect(r.matched).toBe(true)
    expect(r.confidence).toBeGreaterThanOrEqual(0.7)
    // _01 suffix → front 힌트
    expect(r.view).toBe('front')
  })

  it('stand_20_1.png → action=standing', () => {
    const r = tag('stand_20_1.png')
    expect(r.action).toBe('standing')
    expect(r.matched).toBe(true)
  })

  it('stand-42.png → action=standing', () => {
    const r = tag('stand-42.png')
    expect(r.action).toBe('standing')
  })
})

describe('tagFromFilename — 앉기/sitting', () => {
  it('01_앉기_1.png → action=sitting', () => {
    const r = tag('01_앉기_1.png')
    expect(r.action).toBe('sitting')
    expect(r.matched).toBe(true)
  })

  it('sit_16_2.png → action=sitting', () => {
    const r = tag('sit_16_2.png')
    expect(r.action).toBe('sitting')
  })

  it('03_팔걸이의자앉기_1.png → action=chair-sit', () => {
    const r = tag('03_팔걸이의자앉기_1.png')
    expect(r.action).toBe('chair-sit')
    expect(r.matched).toBe(true)
  })

  it('07_무릎꿇고앉기_1.png → action=kneeling', () => {
    const r = tag('07_무릎꿇고앉기_1.png')
    expect(r.action).toBe('kneeling')
  })

  it('07_쪼그르고앉기_1.png → action=squatting', () => {
    const r = tag('07_쪼그르고앉기_1.png')
    expect(r.action).toBe('squatting')
  })

  it('05_다리꼬아앉기_1.png → action=cross-legged', () => {
    const r = tag('05_다리꼬아앉기_1.png')
    expect(r.action).toBe('cross-legged')
  })

  it('09_양반다리팔짱_1.png → action=cross-legged (양반다리 우선)', () => {
    const r = tag('09_양반다리팔짱_1.png')
    expect(r.action).toBe('cross-legged')
  })
})

describe('tagFromFilename — 눕기/lying', () => {
  it('LIE_06_1.png → action=lying', () => {
    const r = tag('LIE_06_1.png')
    expect(r.action).toBe('lying')
    expect(r.matched).toBe(true)
  })

  it('lie_15_1.png → action=lying', () => {
    const r = tag('lie_15_1.png')
    expect(r.action).toBe('lying')
  })

  it('Lie-25.png → action=lying', () => {
    const r = tag('Lie-25.png')
    expect(r.action).toBe('lying')
  })

  it('14_바디필로우안고옆으로누운_1.png → action=lying', () => {
    const r = tag('14_바디필로우안고옆으로누운_1.png')
    expect(r.action).toBe('lying')
  })
})

describe('tagFromFilename — 걷기/walking', () => {
  it('walk_01_1.png → action=walking', () => {
    const r = tag('walk_01_1.png')
    expect(r.action).toBe('walking')
    expect(r.matched).toBe(true)
  })

  it('walk-19.png → action=walking', () => {
    const r = tag('walk-19.png')
    expect(r.action).toBe('walking')
  })
})

describe('tagFromFilename — 달리기/running', () => {
  it('run 01_1.png → action=running', () => {
    const r = tag('run 01_1.png')
    expect(r.action).toBe('running')
    expect(r.matched).toBe(true)
  })
})

describe('tagFromFilename — 점프/jumping', () => {
  it('jump-01_1.png → action=jumping', () => {
    const r = tag('jump-01_1.png')
    expect(r.action).toBe('jumping')
    expect(r.matched).toBe(true)
  })
})

describe('tagFromFilename — Fight 계열', () => {
  it('Fight-bow_03_1.png → action=archery', () => {
    const r = tag('Fight-bow_03_1.png')
    expect(r.action).toBe('archery')
    expect(r.matched).toBe(true)
    expect(r.mood).toBe('focused')
  })

  it('Fight-gun_09_1.png → action=weapon-gun', () => {
    const r = tag('Fight-gun_09_1.png')
    expect(r.action).toBe('weapon-gun')
    expect(r.matched).toBe(true)
  })

  it('Fight-sword_01_1.png → action=weapon-sword', () => {
    const r = tag('Fight-sword_01_1.png')
    expect(r.action).toBe('weapon-sword')
    expect(r.matched).toBe(true)
  })

  it('Fight-ax(도끼)_01_1.png → action=weapon-axe', () => {
    const r = tag('Fight-ax(도끼)_01_1.png')
    expect(r.action).toBe('weapon-axe')
    expect(r.matched).toBe(true)
  })

  it('Fight-spear_stick 01.png → action=weapon-spear', () => {
    const r = tag('Fight-spear_stick 01.png')
    expect(r.action).toBe('weapon-spear')
    expect(r.matched).toBe(true)
  })

  it('Fight_01.png → action=fighting', () => {
    const r = tag('Fight_01.png')
    expect(r.action).toBe('fighting')
    expect(r.matched).toBe(true)
  })

  it('fight-02.png (소문자) → action=fighting', () => {
    const r = tag('fight-02.png')
    expect(r.action).toBe('fighting')
  })
})

describe('tagFromFilename — Love/사랑', () => {
  it('Love-04_2.png → action=affection, bodyType=multi, styleVariants=[2]', () => {
    const r = tag('Love-04_2.png')
    expect(r.action).toBe('affection')
    expect(r.bodyType).toBe('multi')
    expect(r.mood).toBe('romantic')
    expect(r.styleVariants).toContain('2')
    expect(r.matched).toBe(true)
  })

  it('Love_01.png → action=affection', () => {
    const r = tag('Love_01.png')
    expect(r.action).toBe('affection')
  })
})

describe('tagFromFilename — 뷰 힌트', () => {
  it('01_서기_02.png → view=side (_02 힌트)', () => {
    const r = tag('01_서기_02.png')
    expect(r.view).toBe('side')
  })

  it('01_서기_03.png → view=back (_03 힌트)', () => {
    const r = tag('01_서기_03.png')
    expect(r.view).toBe('back')
  })

  it('12_비스듬히 팔은 정면_1.png → action=leaning, view=front (정면 키워드)', () => {
    const r = tag('12_비스듬히 팔은 정면_1.png')
    expect(r.action).toBe('leaning')
    expect(r.view).toBe('front')
    expect(r.matched).toBe(true)
  })

  it('얼굴표정_01.png → action=facial-expression, view=front', () => {
    const r = tag('얼굴표정_01.png')
    expect(r.action).toBe('facial-expression')
    expect(r.view).toBe('front')
  })
})

describe('tagFromFilename — 서브폴더 태그', () => {
  it('animal-29.png (subfolder=동물) → bodyType=beast', () => {
    const dict = loadDictionary(DICT_PATH)
    const r = tagFromFilename('animal-29.png', '동물', dict)
    expect(r.bodyType).toBe('beast')
    expect(r.matched).toBe(true)
  })

  it('Love_03.png (subfolder=사랑) → bodyType=multi, action=affection', () => {
    const dict = loadDictionary(DICT_PATH)
    const r = tagFromFilename('Love_03.png', '사랑', dict)
    expect(r.bodyType).toBe('multi')
    expect(r.action).toBe('affection')
  })
})

describe('tagFromFilename — 스포츠', () => {
  it('야구-01.png → action=sport-baseball', () => {
    const r = tag('야구-01.png')
    expect(r.action).toBe('sport-baseball')
    expect(r.matched).toBe(true)
  })

  it('탁구-01.png → action=sport-tabletennis', () => {
    const r = tag('탁구-01.png')
    expect(r.action).toBe('sport-tabletennis')
  })

  it('태권도-01.png → action=sport-taekwondo', () => {
    const r = tag('태권도-01.png')
    expect(r.action).toBe('sport-taekwondo')
  })

  it('테니스-01.png → action=sport-tennis', () => {
    const r = tag('테니스-01.png')
    expect(r.action).toBe('sport-tennis')
  })

  it('골프-01.png → action=sport-golf', () => {
    const r = tag('골프-01.png')
    expect(r.action).toBe('sport-golf')
  })
})

describe('tagFromFilename — 기타 액션', () => {
  it('다수_01.png → bodyType=group', () => {
    const r = tag('다수_01.png')
    expect(r.bodyType).toBe('group')
    expect(r.matched).toBe(true)
  })

  it('hand-01.png → action=hand-gesture', () => {
    const r = tag('hand-01.png')
    expect(r.action).toBe('hand-gesture')
    expect(r.matched).toBe(true)
  })

  it('magic-01.png → action=magic', () => {
    const r = tag('magic-01.png')
    expect(r.action).toBe('magic')
    expect(r.matched).toBe(true)
  })

  it('Cook.png → action=cooking', () => {
    const r = tag('Cook.png')
    expect(r.action).toBe('cooking')
    expect(r.matched).toBe(true)
  })

  it('16_꽈당_1.png → action=falling', () => {
    const r = tag('16_꽈당_1.png')
    expect(r.action).toBe('falling')
    expect(r.matched).toBe(true)
  })

  it('16_서기_통화_1.png → action=phone (통화 키워드)', () => {
    const r = tag('16_서기_통화_1.png')
    expect(r.action).toBe('phone')
    expect(r.matched).toBe(true)
  })

  it('14_서기_악수_1.png → action=handshake', () => {
    const r = tag('14_서기_악수_1.png')
    expect(r.action).toBe('handshake')
    expect(r.matched).toBe(true)
  })
})

describe('tagFromFilename — 스타일 변형 추출', () => {
  it('Fight-bow_03_1.png → styleVariants=[1]', () => {
    const r = tag('Fight-bow_03_1.png')
    expect(r.styleVariants).toEqual(['1'])
  })

  it('Love-04_2.png → styleVariants=[2]', () => {
    const r = tag('Love-04_2.png')
    expect(r.styleVariants).toEqual(['2'])
  })

  it('01_서기_01.png → styleVariants=[] (두 자릿수 suffix 는 무시)', () => {
    const r = tag('01_서기_01.png')
    // _01 은 두 자리이므로 styleVariants 에 해당 없음
    expect(r.styleVariants).toEqual([])
  })
})

describe('tagFromFilename — 매칭 없는 케이스', () => {
  it('unknown-file.png → matched=false, confidence=0', () => {
    const r = tag('unknown-file.png')
    expect(r.matched).toBe(false)
    expect(r.confidence).toBe(0)
    expect(r.action).toBeUndefined()
    expect(r.bodyType).toBeUndefined()
    expect(r.view).toBeUndefined()
  })

  it('빈 파일명 → matched=false', () => {
    const r = tag('.png')
    expect(r.matched).toBe(false)
  })
})

describe('loadDictionary', () => {
  it('사전 로드 성공 — v=1, rules 배열 존재', () => {
    const dict = loadDictionary(DICT_PATH)
    expect(dict.v).toBe(1)
    expect(Array.isArray(dict.rules)).toBe(true)
    expect(dict.rules.length).toBeGreaterThan(30)
    expect(dict.subfolderTags).toBeDefined()
    expect(dict.viewHints).toBeDefined()
  })

  it('존재하지 않는 경로 → 에러 throw', () => {
    expect(() => loadDictionary('/nonexistent/path/dict.json')).toThrow()
  })
})
