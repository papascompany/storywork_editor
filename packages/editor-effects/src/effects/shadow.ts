// ─────────────────────────────────────────────
// effects/shadow.ts — 그림자 효과 8종
//
// fabric Shadow 객체 활용.
// fabric 은 apply() 내부에서 dynamic import (헤드리스 환경 대응).
// ─────────────────────────────────────────────

import type { EffectTarget, WordEffect, WordEffectOptions } from '../effect-types.js'

// ─── 공통 헬퍼 ────────────────────────────────────────────────────────────────

async function setShadow(
  target: EffectTarget,
  opts: {
    color: string
    blur: number
    offsetX: number
    offsetY: number
  },
): Promise<void> {
  const { Shadow } = await import('fabric')
  target.set({
    shadow: new Shadow({
      color: opts.color,
      blur: opts.blur,
      offsetX: opts.offsetX,
      offsetY: opts.offsetY,
    }),
  })
  if (target.dirty !== undefined) target.dirty = true
}

async function clearShadow(target: EffectTarget): Promise<void> {
  target.set({ shadow: null })
  if (target.dirty !== undefined) target.dirty = true
}

// ─── 효과 정의 ────────────────────────────────────────────────────────────────

export const shadowDropSoft: WordEffect = {
  id: 'shadow-drop-soft',
  category: 'shadow',
  name: '부드러운 그림자',
  description: '자연스러운 부드러운 드롭 그림자',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const intensity = opts?.intensity ?? 0.5
    const blur = 8 + intensity * 8
    await setShadow(target, {
      color: opts?.color ?? 'rgba(0,0,0,0.4)',
      blur,
      offsetX: 4,
      offsetY: 4,
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearShadow(target)
  },
}

export const shadowDropHard: WordEffect = {
  id: 'shadow-drop-hard',
  category: 'shadow',
  name: '선명한 그림자',
  description: '블러 없는 선명한 드롭 그림자',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    await setShadow(target, {
      color: opts?.color ?? 'rgba(0,0,0,0.8)',
      blur: 0,
      offsetX: opts?.size ?? 4,
      offsetY: opts?.size ?? 4,
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearShadow(target)
  },
}

export const shadowLong: WordEffect = {
  id: 'shadow-long',
  category: 'shadow',
  name: '긴 그림자',
  description: '인쇄 포스터 스타일의 길게 늘어진 그림자',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    await setShadow(target, {
      color: opts?.color ?? 'rgba(0,0,0,0.3)',
      blur: 0,
      offsetX: opts?.size ?? 12,
      offsetY: opts?.size ?? 12,
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearShadow(target)
  },
}

export const shadow3d: WordEffect = {
  id: 'shadow-3d',
  category: 'shadow',
  name: '3D 그림자',
  description: '입체감 있는 3D 스타일 그림자',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    await setShadow(target, {
      color: opts?.color ?? 'rgba(50,50,50,0.6)',
      blur: 2,
      offsetX: 6,
      offsetY: 6,
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearShadow(target)
  },
}

export const shadowGlowSoft: WordEffect = {
  id: 'shadow-glow-soft',
  category: 'shadow',
  name: '발광 그림자',
  description: '부드럽게 빛나는 그림자 효과',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    await setShadow(target, {
      color: opts?.color ?? 'rgba(100,149,237,0.6)',
      blur: 16,
      offsetX: 0,
      offsetY: 0,
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearShadow(target)
  },
}

export const shadowInner: WordEffect = {
  id: 'shadow-inner',
  category: 'shadow',
  name: '내부 그림자',
  description: '텍스트 내부로 파인 그림자 효과',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    // fabric 에서 inner shadow 는 음수 offset 트릭으로 근사
    await setShadow(target, {
      color: opts?.color ?? 'rgba(0,0,0,0.5)',
      blur: 4,
      offsetX: -2,
      offsetY: -2,
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearShadow(target)
  },
}

export const shadowDouble: WordEffect = {
  id: 'shadow-double',
  category: 'shadow',
  name: '이중 그림자',
  description: '두 겹의 그림자로 깊이감 연출',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    // fabric 은 단일 Shadow 만 지원하므로 가장 외부 그림자로 표현
    await setShadow(target, {
      color: opts?.color ?? 'rgba(0,0,0,0.35)',
      blur: 6,
      offsetX: 3,
      offsetY: 3,
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearShadow(target)
  },
}

export const shadowBlur: WordEffect = {
  id: 'shadow-blur',
  category: 'shadow',
  name: '블러 그림자',
  description: '강하게 흐려진 그림자 효과',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const blur = opts?.size ?? 20
    await setShadow(target, {
      color: opts?.color ?? 'rgba(0,0,0,0.5)',
      blur,
      offsetX: 2,
      offsetY: 2,
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearShadow(target)
  },
}

// ─── 내보내기 ─────────────────────────────────────────────────────────────────

export const shadowEffects: Record<string, WordEffect> = {
  shadowDropSoft,
  shadowDropHard,
  shadowLong,
  shadow3d,
  shadowGlowSoft,
  shadowInner,
  shadowDouble,
  shadowBlur,
}
