// ─────────────────────────────────────────────
// effects/metallic.ts — 금속 효과 5종
//
// Gradient + Shadow 조합 — 3색 그라디언트 + 그림자로 금속 질감 구현.
// ─────────────────────────────────────────────

import type { EffectTarget, WordEffect, WordEffectOptions } from '../effect-types.js'

// ─── 공통 헬퍼 ────────────────────────────────────────────────────────────────

type ColorStop = { offset: number; color: string }

async function applyMetallic(
  target: EffectTarget,
  colorStops: ColorStop[],
  shadowColor: string,
): Promise<void> {
  const { Gradient, Shadow } = await import('fabric')
  const gradient = new Gradient({
    type: 'linear',
    coords: { x1: 0, y1: 0, x2: 0, y2: 60 },
    colorStops,
  })
  target.set({
    fill: gradient,
    shadow: new Shadow({ color: shadowColor, blur: 4, offsetX: 2, offsetY: 2 }),
    objectCaching: true,
  })
  if (target.dirty !== undefined) target.dirty = true
}

async function clearMetallic(target: EffectTarget): Promise<void> {
  target.set({ fill: '#000000', shadow: null, objectCaching: true })
  if (target.dirty !== undefined) target.dirty = true
}

// ─── 효과 정의 ────────────────────────────────────────────────────────────────

export const metalGold: WordEffect = {
  id: 'metal-gold',
  category: 'metallic',
  name: '황금',
  description: '광택 있는 금색 금속 텍스트',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, _opts?: WordEffectOptions): Promise<void> {
    await applyMetallic(
      target,
      [
        { offset: 0, color: '#f5d020' },
        { offset: 0.3, color: '#f5a623' },
        { offset: 0.6, color: '#c8860f' },
        { offset: 1, color: '#f5d020' },
      ],
      'rgba(120,80,0,0.5)',
    )
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearMetallic(target)
  },
}

export const metalSilver: WordEffect = {
  id: 'metal-silver',
  category: 'metallic',
  name: '은색',
  description: '광택 있는 은색 금속 텍스트',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, _opts?: WordEffectOptions): Promise<void> {
    await applyMetallic(
      target,
      [
        { offset: 0, color: '#e8e8e8' },
        { offset: 0.3, color: '#b0b0b0' },
        { offset: 0.6, color: '#888888' },
        { offset: 1, color: '#e8e8e8' },
      ],
      'rgba(0,0,0,0.35)',
    )
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearMetallic(target)
  },
}

export const metalCopper: WordEffect = {
  id: 'metal-copper',
  category: 'metallic',
  name: '구리',
  description: '따뜻한 구리 금속 질감',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, _opts?: WordEffectOptions): Promise<void> {
    await applyMetallic(
      target,
      [
        { offset: 0, color: '#e07020' },
        { offset: 0.35, color: '#a04010' },
        { offset: 0.65, color: '#803000' },
        { offset: 1, color: '#e07020' },
      ],
      'rgba(80,30,0,0.5)',
    )
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearMetallic(target)
  },
}

export const metalChrome: WordEffect = {
  id: 'metal-chrome',
  category: 'metallic',
  name: '크롬',
  description: '반짝이는 크롬 금속 효과',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, _opts?: WordEffectOptions): Promise<void> {
    await applyMetallic(
      target,
      [
        { offset: 0, color: '#ffffff' },
        { offset: 0.2, color: '#cccccc' },
        { offset: 0.4, color: '#888888' },
        { offset: 0.6, color: '#cccccc' },
        { offset: 0.8, color: '#888888' },
        { offset: 1, color: '#ffffff' },
      ],
      'rgba(0,0,0,0.4)',
    )
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearMetallic(target)
  },
}

export const metalRoseGold: WordEffect = {
  id: 'metal-rose-gold',
  category: 'metallic',
  name: '로즈골드',
  description: '세련된 핑크빛 로즈 골드 효과',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, _opts?: WordEffectOptions): Promise<void> {
    await applyMetallic(
      target,
      [
        { offset: 0, color: '#f9c4c4' },
        { offset: 0.3, color: '#d4847a' },
        { offset: 0.6, color: '#b56060' },
        { offset: 1, color: '#f9c4c4' },
      ],
      'rgba(120,40,40,0.4)',
    )
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearMetallic(target)
  },
}

// ─── 내보내기 ─────────────────────────────────────────────────────────────────

export const metallicEffects: Record<string, WordEffect> = {
  metalGold,
  metalSilver,
  metalCopper,
  metalChrome,
  metalRoseGold,
}
