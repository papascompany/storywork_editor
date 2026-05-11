// ─────────────────────────────────────────────
// effects/transform.ts — 변형 효과 5종
//
// skewX/Y, scaleX, angle 조합으로 변형 표현.
// 원본 transform 스냅샷을 data.meta 에 저장해 unapply 시 복원.
// ─────────────────────────────────────────────

import type { EffectTarget, WordEffect, WordEffectOptions } from '../effect-types.js'

// ─── 스냅샷 저장 키 ────────────────────────────────────────────────────────────

const TRANSFORM_SNAP_KEY = '_effectTransformSnapshot'

// ─── 스냅샷 타입 ──────────────────────────────────────────────────────────────

interface TransformSnapshot {
  skewX: number
  skewY: number
  scaleX: number
  scaleY: number
  angle: number
}

function saveSnapshot(target: EffectTarget, snap: TransformSnapshot): void {
  if (!target.data) target.data = {}
  if (!target.data.meta) target.data.meta = {}
  target.data.meta[TRANSFORM_SNAP_KEY] = snap
}

function loadSnapshot(target: EffectTarget): TransformSnapshot | null {
  const stored = target.data?.meta?.[TRANSFORM_SNAP_KEY]
  if (stored !== null && stored !== undefined && typeof stored === 'object' && 'skewX' in stored) {
    return stored as TransformSnapshot
  }
  return null
}

function getCurrentTransform(target: EffectTarget & Record<string, unknown>): TransformSnapshot {
  return {
    skewX: typeof target.skewX === 'number' ? target.skewX : 0,
    skewY: typeof target.skewY === 'number' ? target.skewY : 0,
    scaleX: typeof target.scaleX === 'number' ? target.scaleX : 1,
    scaleY: typeof target.scaleY === 'number' ? target.scaleY : 1,
    angle: typeof target.angle === 'number' ? target.angle : 0,
  }
}

// ─── 효과 정의 ────────────────────────────────────────────────────────────────

export const transformArcUp: WordEffect = {
  id: 'transform-arc-up',
  category: 'transform',
  name: '위로 곡선',
  description: '텍스트를 위로 휘는 아치형으로 변형',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const t = target as EffectTarget & Record<string, unknown>
    saveSnapshot(target, getCurrentTransform(t))
    const intensity = opts?.intensity ?? 0.5
    const skew = intensity * -15
    target.set({ skewX: skew })
    if (target.dirty !== undefined) target.dirty = true
  },
  async unapply(target: EffectTarget): Promise<void> {
    const snap = loadSnapshot(target)
    if (snap) {
      target.set({
        skewX: snap.skewX,
        skewY: snap.skewY,
        scaleX: snap.scaleX,
        scaleY: snap.scaleY,
        angle: snap.angle,
      })
    } else {
      target.set({ skewX: 0 })
    }
    if (target.dirty !== undefined) target.dirty = true
  },
}

export const transformArcDown: WordEffect = {
  id: 'transform-arc-down',
  category: 'transform',
  name: '아래로 곡선',
  description: '텍스트를 아래로 휘는 변형',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const t = target as EffectTarget & Record<string, unknown>
    saveSnapshot(target, getCurrentTransform(t))
    const intensity = opts?.intensity ?? 0.5
    const skew = intensity * 15
    target.set({ skewX: skew })
    if (target.dirty !== undefined) target.dirty = true
  },
  async unapply(target: EffectTarget): Promise<void> {
    const snap = loadSnapshot(target)
    if (snap) {
      target.set({
        skewX: snap.skewX,
        skewY: snap.skewY,
        scaleX: snap.scaleX,
        scaleY: snap.scaleY,
        angle: snap.angle,
      })
    } else {
      target.set({ skewX: 0 })
    }
    if (target.dirty !== undefined) target.dirty = true
  },
}

export const transformWavy: WordEffect = {
  id: 'transform-wavy',
  category: 'transform',
  name: '물결 변형',
  description: '물결치는 듯한 기울기 변형',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const t = target as EffectTarget & Record<string, unknown>
    saveSnapshot(target, getCurrentTransform(t))
    const intensity = opts?.intensity ?? 0.5
    target.set({
      skewX: intensity * 10,
      skewY: intensity * -5,
    })
    if (target.dirty !== undefined) target.dirty = true
  },
  async unapply(target: EffectTarget): Promise<void> {
    const snap = loadSnapshot(target)
    if (snap) {
      target.set({
        skewX: snap.skewX,
        skewY: snap.skewY,
        scaleX: snap.scaleX,
        scaleY: snap.scaleY,
        angle: snap.angle,
      })
    } else {
      target.set({ skewX: 0, skewY: 0 })
    }
    if (target.dirty !== undefined) target.dirty = true
  },
}

export const transform3dTilt: WordEffect = {
  id: 'transform-3d-tilt',
  category: 'transform',
  name: '3D 기울기',
  description: '원근 효과를 모방한 3D 기울기 변형',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const t = target as EffectTarget & Record<string, unknown>
    saveSnapshot(target, getCurrentTransform(t))
    const intensity = opts?.intensity ?? 0.5
    target.set({
      skewX: intensity * 20,
      scaleY: 1 - intensity * 0.2,
    })
    if (target.dirty !== undefined) target.dirty = true
  },
  async unapply(target: EffectTarget): Promise<void> {
    const snap = loadSnapshot(target)
    if (snap) {
      target.set({
        skewX: snap.skewX,
        skewY: snap.skewY,
        scaleX: snap.scaleX,
        scaleY: snap.scaleY,
        angle: snap.angle,
      })
    } else {
      target.set({ skewX: 0, scaleY: 1 })
    }
    if (target.dirty !== undefined) target.dirty = true
  },
}

export const transformPerspective: WordEffect = {
  id: 'transform-perspective',
  category: 'transform',
  name: '원근 변형',
  description: '원근법을 이용한 깊이감 있는 변형',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const t = target as EffectTarget & Record<string, unknown>
    saveSnapshot(target, getCurrentTransform(t))
    const intensity = opts?.intensity ?? 0.5
    target.set({
      skewY: intensity * 10,
      scaleX: 1 + intensity * 0.15,
    })
    if (target.dirty !== undefined) target.dirty = true
  },
  async unapply(target: EffectTarget): Promise<void> {
    const snap = loadSnapshot(target)
    if (snap) {
      target.set({
        skewX: snap.skewX,
        skewY: snap.skewY,
        scaleX: snap.scaleX,
        scaleY: snap.scaleY,
        angle: snap.angle,
      })
    } else {
      target.set({ skewY: 0, scaleX: 1 })
    }
    if (target.dirty !== undefined) target.dirty = true
  },
}

// ─── 내보내기 ─────────────────────────────────────────────────────────────────

export const transformEffects: Record<string, WordEffect> = {
  transformArcUp,
  transformArcDown,
  transformWavy,
  transform3dTilt,
  transformPerspective,
}
