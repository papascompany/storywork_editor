import { nanoid } from 'nanoid'

import type { ObjectData, ObjectKind } from '../types.js'

/**
 * ObjectData 생성 헬퍼.
 * id 는 자동으로 nanoid 로 생성.
 */
export function createObjectData(
  overrides: Pick<ObjectData, 'kind'> & Partial<Omit<ObjectData, 'kind'>>,
): ObjectData {
  return {
    id: nanoid(),
    kind: overrides.kind,
    resourceId: overrides.resourceId,
    slotId: overrides.slotId,
    locked: overrides.locked,
    meta: overrides.meta,
  }
}

/**
 * fabric 객체에서 ObjectData 추출.
 * data 가 없거나 id/kind 가 없으면 undefined 반환.
 */
export function extractObjectData(fabricObj: { data?: unknown }): ObjectData | undefined {
  const data = fabricObj.data
  if (!data || typeof data !== 'object') return undefined
  const d = data as Record<string, unknown>
  if (typeof d['id'] !== 'string' || typeof d['kind'] !== 'string') return undefined
  return {
    id: d['id'],
    kind: d['kind'] as ObjectKind,
    resourceId: typeof d['resourceId'] === 'string' ? d['resourceId'] : undefined,
    slotId: typeof d['slotId'] === 'string' ? d['slotId'] : undefined,
    locked: typeof d['locked'] === 'boolean' ? d['locked'] : undefined,
    meta:
      d['meta'] && typeof d['meta'] === 'object'
        ? (d['meta'] as Record<string, unknown>)
        : undefined,
  }
}

/**
 * ObjectKind → LayerKind (shared-schema v1) 변환 테이블
 */
export const kindToLayerKind: Record<ObjectKind, string> = {
  pose: 'pose',
  background: 'bg',
  'mise-en-scene': 'bg',
  prop: 'prop',
  'speech-bubble': 'bubble',
  'word-fx': 'fx',
  decoration: 'decoration',
  text: 'text',
  group: 'group',
}

/**
 * LayerKind (shared-schema v1) → ObjectKind 변환 테이블
 */
export const layerKindToKind: Record<string, ObjectKind> = {
  pose: 'pose',
  bg: 'background',
  prop: 'prop',
  bubble: 'speech-bubble',
  fx: 'word-fx',
  decoration: 'decoration',
  text: 'text',
  group: 'group',
}
