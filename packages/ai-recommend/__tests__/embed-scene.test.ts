/**
 * embed-scene.test.ts — 장면 메타 → 임베딩 텍스트 변환 + mock 임베딩 테스트 (M4-02)
 */

import type { SceneMeta } from '@storywork/ai-script'
import { describe, expect, it } from 'vitest'

import { embedSceneMetaSync, sceneMetaToText } from '../src/embedding/embed-scene.js'

describe('sceneMetaToText', () => {
  it('빈 메타 → 기본 폴백 텍스트', () => {
    const text = sceneMetaToText({})
    expect(text).toBe('standing neutral pose')
  })

  it('emotion 포함', () => {
    const meta: SceneMeta = { emotion: 'happy' }
    const text = sceneMetaToText(meta)
    expect(text).toContain('happy')
  })

  it('mood 포함', () => {
    const meta: SceneMeta = { mood: 'romantic' }
    const text = sceneMetaToText(meta)
    expect(text).toContain('romantic')
  })

  it('cameraAngle → 확장 텍스트로 변환', () => {
    const closeup = sceneMetaToText({ cameraAngle: 'closeup' })
    expect(closeup).toContain('closeup face expression')

    const wide = sceneMetaToText({ cameraAngle: 'wide' })
    expect(wide).toContain('wide shot full body')
  })

  it('복합 메타 → 공백으로 연결', () => {
    const meta: SceneMeta = {
      emotion: 'sad',
      mood: 'dark',
      location: '야외',
      timeOfDay: 'night',
    }
    const text = sceneMetaToText(meta)
    expect(text).toContain('sad')
    expect(text).toContain('dark')
    expect(text).toContain('야외')
    expect(text).toContain('night')
  })

  it('pacing=fast → dynamic action movement', () => {
    const text = sceneMetaToText({ pacing: 'fast' })
    expect(text).toContain('dynamic action movement')
  })

  it('pacing=slow → still quiet pose', () => {
    const text = sceneMetaToText({ pacing: 'slow' })
    expect(text).toContain('still quiet pose')
  })

  it('props 최대 3개 포함', () => {
    const meta: SceneMeta = { props: ['sword', 'shield', 'helmet', 'bow'] }
    const text = sceneMetaToText(meta)
    expect(text).toContain('sword')
    expect(text).toContain('shield')
    expect(text).toContain('helmet')
    // 4번째 prop 은 제외 (slice 0..3)
    // bow 가 없어야 함
    expect(text).not.toContain('bow')
  })

  it('additionalKeywords 추가', () => {
    const text = sceneMetaToText({ emotion: 'happy' }, ['fighting', 'jumping'])
    expect(text).toContain('fighting')
    expect(text).toContain('jumping')
  })
})

describe('embedSceneMetaSync — mock 임베딩', () => {
  it('결과가 pgvector 리터럴 형식', () => {
    const vec = embedSceneMetaSync({ emotion: 'happy' })
    expect(vec).toMatch(/^\[[-\d.,]+\]$/)
  })

  it('결정론 — 동일 메타 → 동일 벡터', () => {
    const meta: SceneMeta = { emotion: 'sad', mood: 'dark' }
    const v1 = embedSceneMetaSync(meta)
    const v2 = embedSceneMetaSync(meta)
    expect(v1).toBe(v2)
  })

  it('다른 메타 → 다른 벡터', () => {
    const v1 = embedSceneMetaSync({ emotion: 'happy' })
    const v2 = embedSceneMetaSync({ emotion: 'sad' })
    expect(v1).not.toBe(v2)
  })

  it('벡터 차원 1024', () => {
    const vec = embedSceneMetaSync({ emotion: 'happy' })
    // "[x,x,...,x]" 파싱
    const nums = vec.slice(1, -1).split(',')
    expect(nums).toHaveLength(1024)
  })
})
