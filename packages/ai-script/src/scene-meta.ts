/**
 * scene-meta.ts — 장면 메타 영속화·재사용 (CONTI-01)
 *
 * Scene 테이블에는 emotion/view 컬럼만 있다. 마이그레이션 없이(휴먼 게이트 회피)
 * 장면별 전체 메타를 `SceneDoc.meta.sceneMeta` (기존 Json 컬럼)에 배열로 저장한다.
 *
 *  - toPersistedSceneMetas  분석 결과 → 저장용 배열 (빈 메타 장면은 생략)
 *  - readPersistedSceneMetas SceneDoc.meta(Json) → index→SceneMeta (형식이 깨진 항목은 버림)
 *  - applySceneMetaHints    콘티 미리보기에서 받은 메타를 재분석 결과에 덮어씀
 *                           — 확정 단계에서 LLM 을 다시 부르지 않게(비용 2배·결과 불일치 방지)
 */

import { z } from 'zod'

import type { AnalyzedScene, SceneMeta } from './types.js'

/** 외부 입력(클라이언트 힌트·DB Json) 검증용 — 문자열 길이 상한으로 저장 폭주 차단 */
export const SceneMetaSchema = z.object({
  location: z.string().max(100).optional(),
  timeOfDay: z.enum(['morning', 'noon', 'evening', 'night']).optional(),
  cameraAngle: z.enum(['closeup', 'medium', 'wide', 'bird-eye', 'low-angle']).optional(),
  pacing: z.enum(['fast', 'normal', 'slow']).optional(),
  mood: z.string().max(40).optional(),
  emotion: z.string().max(40).optional(),
  view: z.enum(['front', 'side', 'back', 'three-quarter']).optional(),
  props: z.array(z.string().max(60)).max(10).optional(),
  pageBreak: z.boolean().optional(),
})

export const PersistedSceneMetaSchema = SceneMetaSchema.extend({
  index: z.number().int().min(0),
})

export type PersistedSceneMeta = z.infer<typeof PersistedSceneMetaSchema>

function compactMeta(meta: SceneMeta): SceneMeta {
  const out: SceneMeta = {}
  for (const [k, v] of Object.entries(meta) as Array<[keyof SceneMeta, unknown]>) {
    if (v === undefined || v === null) continue
    if (Array.isArray(v) && v.length === 0) continue
    ;(out as Record<string, unknown>)[k] = v
  }
  return out
}

export function toPersistedSceneMetas(scenes: AnalyzedScene[]): PersistedSceneMeta[] {
  const out: PersistedSceneMeta[] = []
  for (const scene of scenes) {
    const meta = compactMeta(scene.meta)
    if (Object.keys(meta).length === 0) continue
    out.push({ index: scene.index, ...meta })
  }
  return out
}

export function readPersistedSceneMetas(docMeta: unknown): Map<number, SceneMeta> {
  const map = new Map<number, SceneMeta>()
  if (typeof docMeta !== 'object' || docMeta === null) return map
  const list = (docMeta as Record<string, unknown>)['sceneMeta']
  if (!Array.isArray(list)) return map
  for (const item of list) {
    const parsed = PersistedSceneMetaSchema.safeParse(item)
    if (!parsed.success) continue
    const { index, ...meta } = parsed.data
    map.set(index, meta)
  }
  return map
}

/**
 * 힌트(index 기준)를 장면 메타에 덮어쓴다. 힌트 index 가 하나라도 장면에 없으면
 * 대본이 달라진 것으로 보고 적용하지 않는다(applied=false).
 */
export function applySceneMetaHints(
  scenes: AnalyzedScene[],
  hints: PersistedSceneMeta[],
): { scenes: AnalyzedScene[]; applied: boolean } {
  if (hints.length === 0) return { scenes, applied: false }
  const indices = new Set(scenes.map((s) => s.index))
  if (!hints.every((h) => indices.has(h.index))) return { scenes, applied: false }
  const byIndex = new Map(hints.map(({ index, ...meta }) => [index, compactMeta(meta)]))
  return {
    scenes: scenes.map((s) => {
      const hint = byIndex.get(s.index)
      return hint ? { ...s, meta: { ...s.meta, ...hint } } : s
    }),
    applied: true,
  }
}
