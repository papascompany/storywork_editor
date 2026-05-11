// ─────────────────────────────────────────────
// effects/glow.ts — 글로우 효과 5종
//
// fabric Shadow 의 blur + offsetX/Y=0 트릭으로 글로우 구현.
// ─────────────────────────────────────────────

import type { EffectTarget, WordEffect, WordEffectOptions } from '../effect-types.js'

// ─── 공통 헬퍼 ────────────────────────────────────────────────────────────────

async function applyGlow(
  target: EffectTarget,
  opts: {
    color: string
    blur: number
    fill?: string
  },
): Promise<void> {
  const { Shadow } = await import('fabric')
  const props: Record<string, unknown> = {
    shadow: new Shadow({
      color: opts.color,
      blur: opts.blur,
      offsetX: 0,
      offsetY: 0,
    }),
  }
  if (opts.fill !== undefined) props.fill = opts.fill
  target.set(props)
  if (target.dirty !== undefined) target.dirty = true
}

async function clearGlow(target: EffectTarget): Promise<void> {
  target.set({ shadow: null })
  if (target.dirty !== undefined) target.dirty = true
}

// ─── 효과 정의 ────────────────────────────────────────────────────────────────

export const glowNeonBlue: WordEffect = {
  id: 'glow-neon-blue',
  category: 'glow',
  name: '네온 파랑',
  description: '파란색 네온 사인 스타일 발광',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const blur = opts?.size ?? 18
    await applyGlow(target, {
      color: opts?.color ?? 'rgba(0,180,255,0.9)',
      blur,
      fill: opts?.color ?? '#00b4ff',
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearGlow(target)
  },
}

export const glowNeonPink: WordEffect = {
  id: 'glow-neon-pink',
  category: 'glow',
  name: '네온 핑크',
  description: '핑크 네온 사인 스타일 발광',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const blur = opts?.size ?? 18
    await applyGlow(target, {
      color: opts?.color ?? 'rgba(255,0,128,0.9)',
      blur,
      fill: opts?.color ?? '#ff0080',
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearGlow(target)
  },
}

export const glowSoftWhite: WordEffect = {
  id: 'glow-soft-white',
  category: 'glow',
  name: '부드러운 흰빛',
  description: '부드럽게 빛나는 흰색 발광',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const blur = opts?.size ?? 14
    await applyGlow(target, {
      color: opts?.color ?? 'rgba(255,255,255,0.85)',
      blur,
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearGlow(target)
  },
}

export const glowPulse: WordEffect = {
  id: 'glow-pulse',
  category: 'glow',
  name: '펄스 글로우',
  description: '에너지 넘치는 밝은 황금 발광',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const blur = opts?.size ?? 22
    await applyGlow(target, {
      color: opts?.color ?? 'rgba(255,220,0,0.9)',
      blur,
      fill: opts?.color ?? '#ffdc00',
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearGlow(target)
  },
}

export const glowRainbow: WordEffect = {
  id: 'glow-rainbow',
  category: 'glow',
  name: '레인보우 글로우',
  description: '다채로운 색상의 무지개 발광 효과',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    // fabric 단일 shadow → 보라색으로 근사 (무지개 중간색)
    const blur = opts?.size ?? 20
    await applyGlow(target, {
      color: opts?.color ?? 'rgba(160,0,255,0.8)',
      blur,
      fill: opts?.color ?? '#a000ff',
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearGlow(target)
  },
}

// ─── 내보내기 ─────────────────────────────────────────────────────────────────

export const glowEffects: Record<string, WordEffect> = {
  glowNeonBlue,
  glowNeonPink,
  glowSoftWhite,
  glowPulse,
  glowRainbow,
}
