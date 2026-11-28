/**
 * scene-meta.test.ts — CONTI-01 장면 메타 영속화·힌트 적용
 */

import { describe, expect, it } from 'vitest'

import {
  applySceneMetaHints,
  readPersistedSceneMetas,
  toPersistedSceneMetas,
} from '../src/scene-meta.js'
import type { AnalyzedScene } from '../src/types.js'

function scene(index: number, meta: AnalyzedScene['meta']): AnalyzedScene {
  return {
    index,
    slug: `scene-${index}`,
    summary: `장면 ${index}`,
    meta,
    lines: [],
    characters: [],
    confidence: 0.5,
  }
}

describe('toPersistedSceneMetas', () => {
  it('빈 메타 장면은 생략하고 undefined·빈 배열 필드는 버린다', () => {
    const out = toPersistedSceneMetas([
      scene(0, { cameraAngle: 'wide', props: [], mood: undefined }),
      scene(1, {}),
      scene(2, { view: 'side', props: ['우산'] }),
    ])
    expect(out).toEqual([
      { index: 0, cameraAngle: 'wide' },
      { index: 2, view: 'side', props: ['우산'] },
    ])
  })
})

describe('readPersistedSceneMetas', () => {
  it('SceneDoc.meta.sceneMeta 를 index 맵으로 읽고 형식이 깨진 항목은 버린다', () => {
    const map = readPersistedSceneMetas({
      format: 'novel',
      sceneMeta: [
        { index: 0, cameraAngle: 'closeup' },
        { index: 1, cameraAngle: 'zoom' },
        { index: -1, view: 'front' },
        'garbage',
      ],
    })
    expect([...map.entries()]).toEqual([[0, { cameraAngle: 'closeup' }]])
  })

  it('CONTI-01 이전 SceneDoc(sceneMeta 없음)·비객체는 빈 맵', () => {
    expect(readPersistedSceneMetas({ format: 'novel' }).size).toBe(0)
    expect(readPersistedSceneMetas(null).size).toBe(0)
    expect(readPersistedSceneMetas('x').size).toBe(0)
  })
})

describe('applySceneMetaHints', () => {
  const scenes = [scene(0, { emotion: 'sad', view: 'front' }), scene(1, { emotion: 'happy' })]

  it('index 가 맞으면 힌트로 덮어쓰고 기존 필드는 유지', () => {
    const { scenes: out, applied } = applySceneMetaHints(scenes, [
      { index: 0, cameraAngle: 'closeup', view: 'side' },
    ])
    expect(applied).toBe(true)
    expect(out[0]?.meta).toEqual({ emotion: 'sad', view: 'side', cameraAngle: 'closeup' })
    expect(out[1]?.meta).toEqual({ emotion: 'happy' })
  })

  it('장면에 없는 index 가 하나라도 있으면 적용하지 않는다', () => {
    const { scenes: out, applied } = applySceneMetaHints(scenes, [
      { index: 0, cameraAngle: 'wide' },
      { index: 5, cameraAngle: 'wide' },
    ])
    expect(applied).toBe(false)
    expect(out).toBe(scenes)
  })

  it('힌트가 없으면 미적용', () => {
    expect(applySceneMetaHints(scenes, []).applied).toBe(false)
  })
})
