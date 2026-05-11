// ─────────────────────────────────────────────
// effects/pattern.ts — 패턴 채움 효과 5종
//
// SVG dataURL 로 패턴 소스를 생성한 뒤
// fabric.Pattern 으로 fill 에 적용한다.
//
// 모바일 성능: isMobileDevice() 판단 시 정적 단색으로 fallback.
// ─────────────────────────────────────────────

import type { EffectTarget, WordEffect, WordEffectOptions } from '../effect-types.js'

// ─── 모바일 판단 ──────────────────────────────────────────────────────────────

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
}

// ─── SVG 패턴 소스 생성 ───────────────────────────────────────────────────────

function makeSvgDataUrl(svgContent: string, w: number, h: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${svgContent}</svg>`
  const encoded = encodeURIComponent(svg)
  return `data:image/svg+xml;charset=utf-8,${encoded}`
}

// ─── 패턴 적용 헬퍼 ──────────────────────────────────────────────────────────

async function applyPattern(
  target: EffectTarget,
  patternSource: string,
  w: number,
  h: number,
  fallbackColor: string,
): Promise<void> {
  if (isMobileDevice()) {
    // 모바일: 정적 단색 fallback
    target.set({ fill: fallbackColor, objectCaching: true })
    if (target.dirty !== undefined) target.dirty = true
    return
  }

  const { Pattern } = await import('fabric')

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    if (typeof Image === 'undefined') {
      // 헤드리스 환경 → fallback
      reject(new Error('Image not available'))
      return
    }
    const image = new Image(w, h)
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('pattern image load failed'))
    image.src = patternSource
  }).catch(() => null)

  if (!img) {
    target.set({ fill: fallbackColor, objectCaching: true })
    if (target.dirty !== undefined) target.dirty = true
    return
  }

  const pattern = new Pattern({ source: img, repeat: 'repeat' })
  target.set({ fill: pattern, objectCaching: true })
  if (target.dirty !== undefined) target.dirty = true
}

async function clearPattern(target: EffectTarget): Promise<void> {
  target.set({ fill: '#000000', objectCaching: true })
  if (target.dirty !== undefined) target.dirty = true
}

// ─── 효과 정의 ────────────────────────────────────────────────────────────────

export const patternDots: WordEffect = {
  id: 'pattern-dots',
  category: 'pattern',
  name: '점 패턴',
  description: '규칙적인 점 패턴으로 텍스트 채우기',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const color = opts?.color ?? '#333333'
    const bg = 'transparent'
    const svgContent = `<rect width="8" height="8" fill="${bg}"/><circle cx="4" cy="4" r="1.5" fill="${color}"/>`
    const src = makeSvgDataUrl(svgContent, 8, 8)
    await applyPattern(target, src, 8, 8, color)
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearPattern(target)
  },
}

export const patternStripes: WordEffect = {
  id: 'pattern-stripes',
  category: 'pattern',
  name: '줄무늬 패턴',
  description: '대각선 줄무늬 패턴으로 텍스트 채우기',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const color = opts?.color ?? '#333333'
    const svgContent = `<rect width="8" height="8" fill="transparent"/><line x1="0" y1="8" x2="8" y2="0" stroke="${color}" stroke-width="1.5"/>`
    const src = makeSvgDataUrl(svgContent, 8, 8)
    await applyPattern(target, src, 8, 8, color)
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearPattern(target)
  },
}

export const patternGrid: WordEffect = {
  id: 'pattern-grid',
  category: 'pattern',
  name: '격자 패턴',
  description: '바둑판 격자 패턴으로 텍스트 채우기',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const color = opts?.color ?? '#333333'
    const svgContent =
      `<rect width="10" height="10" fill="transparent"/>` +
      `<line x1="0" y1="5" x2="10" y2="5" stroke="${color}" stroke-width="0.8"/>` +
      `<line x1="5" y1="0" x2="5" y2="10" stroke="${color}" stroke-width="0.8"/>`
    const src = makeSvgDataUrl(svgContent, 10, 10)
    await applyPattern(target, src, 10, 10, color)
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearPattern(target)
  },
}

export const patternHatch: WordEffect = {
  id: 'pattern-hatch',
  category: 'pattern',
  name: '해치 패턴',
  description: '크로스 해칭 패턴으로 텍스트 채우기',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const color = opts?.color ?? '#333333'
    const svgContent =
      `<rect width="10" height="10" fill="transparent"/>` +
      `<line x1="0" y1="10" x2="10" y2="0" stroke="${color}" stroke-width="1"/>` +
      `<line x1="0" y1="0" x2="10" y2="10" stroke="${color}" stroke-width="1"/>`
    const src = makeSvgDataUrl(svgContent, 10, 10)
    await applyPattern(target, src, 10, 10, color)
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearPattern(target)
  },
}

export const patternHex: WordEffect = {
  id: 'pattern-hex',
  category: 'pattern',
  name: '육각형 패턴',
  description: '벌집 모양 육각형 패턴으로 텍스트 채우기',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    const color = opts?.color ?? '#333333'
    // 단순화된 육각형 패턴 (SVG polygon)
    const svgContent =
      `<rect width="20" height="20" fill="transparent"/>` +
      `<polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5" ` +
      `fill="none" stroke="${color}" stroke-width="1"/>`
    const src = makeSvgDataUrl(svgContent, 20, 20)
    await applyPattern(target, src, 20, 20, color)
  },
  async unapply(target: EffectTarget): Promise<void> {
    await clearPattern(target)
  },
}

// ─── 내보내기 ─────────────────────────────────────────────────────────────────

export const patternEffects: Record<string, WordEffect> = {
  patternDots,
  patternStripes,
  patternGrid,
  patternHatch,
  patternHex,
}
