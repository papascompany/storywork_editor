// ─────────────────────────────────────────────
// effects/gradient.ts — 그라디언트 효과 6종
//
// fabric.Gradient (linear) 활용.
// objectCaching: true 로 성능 최적화.
// ─────────────────────────────────────────────

import type { EffectTarget, WordEffect, WordEffectOptions } from '../effect-types.js'

// ─── 공통 헬퍼 ────────────────────────────────────────────────────────────────

type ColorStop = { offset: number; color: string }

async function applyLinearGradient(
  target: EffectTarget,
  colorStops: ColorStop[],
  opts?: { width?: number },
): Promise<void> {
  const { Gradient } = await import('fabric')
  const w = opts?.width ?? 200
  const gradient = new Gradient({
    type: 'linear',
    coords: { x1: 0, y1: 0, x2: w, y2: 0 },
    colorStops,
  })
  target.set({ fill: gradient, objectCaching: true })
  if (target.dirty !== undefined) target.dirty = true
}

async function clearGradient(target: EffectTarget): Promise<void> {
  target.set({ fill: '#000000', objectCaching: true })
  if (target.dirty !== undefined) target.dirty = true
}

// ─── 효과 정의 ────────────────────────────────────────────────────────────────

export const gradientWarm: WordEffect = {
  id: 'gradient-warm',
  category: 'gradient',
  name: '따뜻한 그라디언트',
  description: '주황~빨강 따뜻한 계열 그라디언트',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, _opts?: WordEffectOptions): Promise<void> {
    await applyLinearGradient(target, [
      { offset: 0, color: '#ff6b35' },
      { offset: 1, color: '#c62828' },
    ])
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearGradient(target)
  },
}

export const gradientCool: WordEffect = {
  id: 'gradient-cool',
  category: 'gradient',
  name: '시원한 그라디언트',
  description: '파랑~청록 시원한 계열 그라디언트',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, _opts?: WordEffectOptions): Promise<void> {
    await applyLinearGradient(target, [
      { offset: 0, color: '#00b4d8' },
      { offset: 1, color: '#0077b6' },
    ])
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearGradient(target)
  },
}

export const gradientRainbow: WordEffect = {
  id: 'gradient-rainbow',
  category: 'gradient',
  name: '무지개 그라디언트',
  description: '스펙트럼 전체를 아우르는 화려한 그라디언트',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, _opts?: WordEffectOptions): Promise<void> {
    await applyLinearGradient(target, [
      { offset: 0, color: '#ff0000' },
      { offset: 0.17, color: '#ff8c00' },
      { offset: 0.33, color: '#ffee00' },
      { offset: 0.5, color: '#00c800' },
      { offset: 0.67, color: '#0000ff' },
      { offset: 0.83, color: '#4b0082' },
      { offset: 1, color: '#8b00ff' },
    ])
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearGradient(target)
  },
}

export const gradientSunset: WordEffect = {
  id: 'gradient-sunset',
  category: 'gradient',
  name: '석양 그라디언트',
  description: '노랑~분홍~보라 석양 색감',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, _opts?: WordEffectOptions): Promise<void> {
    await applyLinearGradient(target, [
      { offset: 0, color: '#f6d365' },
      { offset: 0.5, color: '#f093fb' },
      { offset: 1, color: '#c471f5' },
    ])
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearGradient(target)
  },
}

export const gradientOcean: WordEffect = {
  id: 'gradient-ocean',
  category: 'gradient',
  name: '오션 그라디언트',
  description: '깊은 바다 느낌의 청록~남색 그라디언트',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, _opts?: WordEffectOptions): Promise<void> {
    await applyLinearGradient(target, [
      { offset: 0, color: '#43e97b' },
      { offset: 1, color: '#38f9d7' },
    ])
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearGradient(target)
  },
}

export const gradientMonochrome: WordEffect = {
  id: 'gradient-monochrome',
  category: 'gradient',
  name: '모노크롬 그라디언트',
  description: '흰색~검정 세련된 모노크롬 그라디언트',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, _opts?: WordEffectOptions): Promise<void> {
    await applyLinearGradient(target, [
      { offset: 0, color: '#ffffff' },
      { offset: 1, color: '#333333' },
    ])
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearGradient(target)
  },
}

// ─── 내보내기 ─────────────────────────────────────────────────────────────────

export const gradientEffects: Record<string, WordEffect> = {
  gradientWarm,
  gradientCool,
  gradientRainbow,
  gradientSunset,
  gradientOcean,
  gradientMonochrome,
}
