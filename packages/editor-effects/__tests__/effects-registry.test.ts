import { describe, expect, it } from 'vitest'

import {
  EFFECT_CATEGORIES,
  EFFECTS_REGISTRY,
  getEffectById,
  getEffectsByCategory,
  searchEffects,
} from '../src/index.js'

describe('EFFECTS_REGISTRY', () => {
  it('45개 이상의 효과가 등록되어 있다', () => {
    expect(EFFECTS_REGISTRY.length).toBeGreaterThanOrEqual(45)
  })

  it('모든 효과가 id / category / name / appliesTo 를 가진다', () => {
    for (const effect of EFFECTS_REGISTRY) {
      expect(effect.id, `${effect.id} 의 id`).toBeTruthy()
      expect(effect.category, `${effect.id} 의 category`).toBeTruthy()
      expect(effect.name, `${effect.id} 의 name`).toBeTruthy()
      expect(effect.appliesTo.length, `${effect.id} 의 appliesTo`).toBeGreaterThan(0)
    }
  })

  it('모든 효과 id 가 고유하다', () => {
    const ids = EFFECTS_REGISTRY.map((e) => e.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('모든 효과 category 가 EFFECT_CATEGORIES 에 포함된다', () => {
    const validCats = new Set<string>(EFFECT_CATEGORIES)
    for (const effect of EFFECTS_REGISTRY) {
      expect(validCats.has(effect.category), `${effect.id} 의 category: ${effect.category}`).toBe(
        true,
      )
    }
  })

  it('apply 와 unapply 가 함수다', () => {
    for (const effect of EFFECTS_REGISTRY) {
      expect(typeof effect.apply, `${effect.id}.apply`).toBe('function')
      expect(typeof effect.unapply, `${effect.id}.unapply`).toBe('function')
    }
  })
})

describe('getEffectById', () => {
  it('존재하는 id 로 효과를 찾는다', () => {
    const effect = getEffectById('shadow-drop-soft')
    expect(effect).toBeDefined()
    expect(effect?.id).toBe('shadow-drop-soft')
  })

  it('존재하지 않는 id 에는 undefined 를 반환한다', () => {
    expect(getEffectById('no-such-effect')).toBeUndefined()
  })

  it('outline-single-thin 을 찾는다', () => {
    expect(getEffectById('outline-single-thin')).toBeDefined()
  })

  it('glow-neon-blue 를 찾는다', () => {
    expect(getEffectById('glow-neon-blue')).toBeDefined()
  })

  it('metal-gold 를 찾는다', () => {
    expect(getEffectById('metal-gold')).toBeDefined()
  })
})

describe('getEffectsByCategory', () => {
  it('shadow 카테고리에 8개 효과가 있다', () => {
    const effects = getEffectsByCategory('shadow')
    expect(effects.length).toBe(8)
  })

  it('outline 카테고리에 6개 효과가 있다', () => {
    const effects = getEffectsByCategory('outline')
    expect(effects.length).toBe(6)
  })

  it('glow 카테고리에 5개 효과가 있다', () => {
    const effects = getEffectsByCategory('glow')
    expect(effects.length).toBe(5)
  })

  it('gradient 카테고리에 6개 효과가 있다', () => {
    const effects = getEffectsByCategory('gradient')
    expect(effects.length).toBe(6)
  })

  it('metallic 카테고리에 5개 효과가 있다', () => {
    const effects = getEffectsByCategory('metallic')
    expect(effects.length).toBe(5)
  })

  it('transform 카테고리에 5개 효과가 있다', () => {
    const effects = getEffectsByCategory('transform')
    expect(effects.length).toBe(5)
  })

  it('background 카테고리에 5개 효과가 있다', () => {
    const effects = getEffectsByCategory('background')
    expect(effects.length).toBe(5)
  })

  it('pattern 카테고리에 5개 효과가 있다', () => {
    const effects = getEffectsByCategory('pattern')
    expect(effects.length).toBe(5)
  })

  it('모든 반환 효과의 category 가 요청 category 와 일치한다', () => {
    for (const cat of EFFECT_CATEGORIES) {
      const effects = getEffectsByCategory(cat)
      for (const e of effects) {
        expect(e.category).toBe(cat)
      }
    }
  })
})

describe('searchEffects', () => {
  it('빈 쿼리는 전체 효과를 반환한다', () => {
    expect(searchEffects('').length).toBe(EFFECTS_REGISTRY.length)
  })

  it('한국어 이름으로 검색한다', () => {
    const results = searchEffects('그림자')
    expect(results.length).toBeGreaterThan(0)
    for (const e of results) {
      const match =
        e.name.includes('그림자') ||
        e.category.includes('그림자') ||
        (e.description?.includes('그림자') ?? false)
      expect(match, `${e.id} should match 그림자`).toBe(true)
    }
  })

  it('카테고리 이름으로 검색한다', () => {
    const results = searchEffects('shadow')
    expect(results.length).toBeGreaterThan(0)
  })

  it('매칭 없으면 빈 배열 반환', () => {
    expect(searchEffects('zzz-no-match-xyz').length).toBe(0)
  })
})
