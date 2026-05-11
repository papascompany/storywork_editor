// ─────────────────────────────────────────────
// effects/outline.ts — 외곽선 효과 6종
//
// fabric stroke + strokeWidth + paintFirst 활용.
// paintFirst:'stroke' → 텍스트 fill 이 stroke 위에 표시됨.
// ─────────────────────────────────────────────

import type { EffectTarget, WordEffect, WordEffectOptions } from '../effect-types.js'

// ─── 공통 헬퍼 ────────────────────────────────────────────────────────────────

function applyStroke(
  target: EffectTarget,
  opts: {
    stroke: string
    strokeWidth: number
    strokeLineCap?: string
    strokeLineJoin?: string
    strokeDashArray?: number[] | null
    paintFirst?: string
  },
): void {
  target.set({
    stroke: opts.stroke,
    strokeWidth: opts.strokeWidth,
    strokeLineCap: opts.strokeLineCap ?? 'round',
    strokeLineJoin: opts.strokeLineJoin ?? 'round',
    strokeDashArray: opts.strokeDashArray ?? null,
    paintFirst: opts.paintFirst ?? 'stroke',
  })
  if (target.dirty !== undefined) target.dirty = true
}

function clearStroke(target: EffectTarget): void {
  target.set({
    stroke: null,
    strokeWidth: 0,
    strokeDashArray: null,
    paintFirst: 'fill',
  })
  if (target.dirty !== undefined) target.dirty = true
}

// ─── 효과 정의 ────────────────────────────────────────────────────────────────

export const outlineSingleThin: WordEffect = {
  id: 'outline-single-thin',
  category: 'outline',
  name: '얇은 외곽선',
  description: '텍스트 주위에 얇고 선명한 외곽선',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const width = opts?.size ?? 1.5
    applyStroke(target, {
      stroke: opts?.color ?? '#000000',
      strokeWidth: width,
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    clearStroke(target)
  },
}

export const outlineSingleBold: WordEffect = {
  id: 'outline-single-bold',
  category: 'outline',
  name: '굵은 외곽선',
  description: '만화/코믹 스타일의 굵은 외곽선',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const width = opts?.size ?? 4
    applyStroke(target, {
      stroke: opts?.color ?? '#000000',
      strokeWidth: width,
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    clearStroke(target)
  },
}

export const outlineDouble: WordEffect = {
  id: 'outline-double',
  category: 'outline',
  name: '이중 외곽선',
  description: '두 겹 외곽선 — 인쇄 제목에 적합',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    // fabric 단일 stroke → 두꺼운 외곽선으로 근사
    const width = opts?.size ?? 6
    applyStroke(target, {
      stroke: opts?.color ?? '#1a1a1a',
      strokeWidth: width,
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    clearStroke(target)
  },
}

export const outlineGlow: WordEffect = {
  id: 'outline-glow',
  category: 'outline',
  name: '발광 외곽선',
  description: '빛나는 외곽선 — 네온 스타일',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const width = opts?.size ?? 3
    applyStroke(target, {
      stroke: opts?.color ?? 'rgba(0,200,255,0.9)',
      strokeWidth: width,
    })
    // 발광 효과를 위해 shadow 도 추가
    const { Shadow } = await import('fabric')
    target.set({
      shadow: new Shadow({
        color: opts?.color ?? 'rgba(0,200,255,0.7)',
        blur: 12,
        offsetX: 0,
        offsetY: 0,
      }),
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    clearStroke(target)
    target.set({ shadow: null })
    if (target.dirty !== undefined) target.dirty = true
  },
}

export const outlineDashed: WordEffect = {
  id: 'outline-dashed',
  category: 'outline',
  name: '점선 외곽선',
  description: '점선 스타일의 독특한 외곽선',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const width = opts?.size ?? 2
    applyStroke(target, {
      stroke: opts?.color ?? '#333333',
      strokeWidth: width,
      strokeDashArray: [6, 4],
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    clearStroke(target)
  },
}

export const outlineRough: WordEffect = {
  id: 'outline-rough',
  category: 'outline',
  name: '거친 외곽선',
  description: '손으로 그린 것 같은 거친 외곽선',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const width = opts?.size ?? 3
    applyStroke(target, {
      stroke: opts?.color ?? '#2d2d2d',
      strokeWidth: width,
      strokeLineCap: 'square',
      strokeLineJoin: 'miter',
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    clearStroke(target)
  },
}

// ─── 내보내기 ─────────────────────────────────────────────────────────────────

export const outlineEffects: Record<string, WordEffect> = {
  outlineSingleThin,
  outlineSingleBold,
  outlineDouble,
  outlineGlow,
  outlineDashed,
  outlineRough,
}
