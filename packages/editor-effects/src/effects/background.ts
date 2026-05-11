// ─────────────────────────────────────────────
// effects/background.ts — 배경 박스 효과 5종
//
// 텍스트 오브젝트에 backgroundColor 속성을 설정하거나
// padding/borderRadius 로 배경 박스를 표현한다.
// fabric Textbox 는 backgroundColor, padding 을 지원한다.
// ─────────────────────────────────────────────

import type { EffectTarget, WordEffect, WordEffectOptions } from '../effect-types.js'

// ─── 스냅샷 저장 키 ────────────────────────────────────────────────────────────

const BG_SNAP_KEY = '_effectBgSnapshot'

interface BgSnapshot {
  backgroundColor: string | null
  padding: number
  stroke: string | null
  strokeWidth: number
}

function saveBgSnapshot(target: EffectTarget, snap: BgSnapshot): void {
  if (!target.data) target.data = {}
  if (!target.data.meta) target.data.meta = {}
  target.data.meta[BG_SNAP_KEY] = snap
}

function loadBgSnapshot(target: EffectTarget): BgSnapshot | null {
  const stored = target.data?.meta?.[BG_SNAP_KEY]
  if (
    stored !== null &&
    stored !== undefined &&
    typeof stored === 'object' &&
    'backgroundColor' in stored
  ) {
    return stored as BgSnapshot
  }
  return null
}

function getCurrentBg(target: EffectTarget & Record<string, unknown>): BgSnapshot {
  return {
    backgroundColor: typeof target.backgroundColor === 'string' ? target.backgroundColor : null,
    padding: typeof target.padding === 'number' ? target.padding : 0,
    stroke: typeof target.stroke === 'string' ? target.stroke : null,
    strokeWidth: typeof target.strokeWidth === 'number' ? target.strokeWidth : 0,
  }
}

function applyBg(
  target: EffectTarget,
  props: {
    backgroundColor: string
    padding: number
    stroke?: string
    strokeWidth?: number
  },
): void {
  const t = target as EffectTarget & Record<string, unknown>
  saveBgSnapshot(target, getCurrentBg(t))
  target.set({
    backgroundColor: props.backgroundColor,
    padding: props.padding,
    stroke: props.stroke ?? null,
    strokeWidth: props.strokeWidth ?? 0,
    paintFirst: 'fill',
  })
  if (target.dirty !== undefined) target.dirty = true
}

function clearBg(target: EffectTarget): void {
  const snap = loadBgSnapshot(target)
  if (snap) {
    target.set({
      backgroundColor: snap.backgroundColor ?? '',
      padding: snap.padding,
      stroke: snap.stroke,
      strokeWidth: snap.strokeWidth,
    })
  } else {
    target.set({ backgroundColor: '', padding: 0, stroke: null, strokeWidth: 0 })
  }
  if (target.dirty !== undefined) target.dirty = true
}

// ─── 효과 정의 ────────────────────────────────────────────────────────────────

export const bgStickyYellow: WordEffect = {
  id: 'bg-sticky-yellow',
  category: 'background',
  name: '노란 메모지',
  description: '포스트잇 스타일의 노란 배경 박스',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, _opts?: WordEffectOptions): Promise<void> {
    applyBg(target, {
      backgroundColor: 'rgba(255,236,153,0.95)',
      padding: 10,
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    clearBg(target)
  },
}

export const bgBannerRed: WordEffect = {
  id: 'bg-banner-red',
  category: 'background',
  name: '빨간 배너',
  description: '강렬한 빨간 배너 스타일 배경',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    applyBg(target, {
      backgroundColor: opts?.color ?? 'rgba(200,30,30,0.92)',
      padding: 8,
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    clearBg(target)
  },
}

export const bgQuoteGray: WordEffect = {
  id: 'bg-quote-gray',
  category: 'background',
  name: '인용 박스',
  description: '회색 배경의 인용문 스타일 박스',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, _opts?: WordEffectOptions): Promise<void> {
    applyBg(target, {
      backgroundColor: 'rgba(240,240,240,0.95)',
      padding: 12,
      stroke: '#cccccc',
      strokeWidth: 2,
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    clearBg(target)
  },
}

export const bgTagBlue: WordEffect = {
  id: 'bg-tag-blue',
  category: 'background',
  name: '파란 태그',
  description: '해시태그 스타일의 파란 배경 박스',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    applyBg(target, {
      backgroundColor: opts?.color ?? 'rgba(30,100,220,0.9)',
      padding: 6,
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    clearBg(target)
  },
}

export const bgRoundedPink: WordEffect = {
  id: 'bg-rounded-pink',
  category: 'background',
  name: '둥근 분홍 박스',
  description: '귀여운 분홍빛 둥근 배경 박스',
  appliesTo: ['text', 'textbox', 'itext'],
  async apply(target: EffectTarget, opts?: WordEffectOptions): Promise<void> {
    applyBg(target, {
      backgroundColor: opts?.color ?? 'rgba(255,182,193,0.9)',
      padding: 10,
    })
  },
  async unapply(target: EffectTarget): Promise<void> {
    clearBg(target)
  },
}

// ─── 내보내기 ─────────────────────────────────────────────────────────────────

export const backgroundEffects: Record<string, WordEffect> = {
  bgStickyYellow,
  bgBannerRed,
  bgQuoteGray,
  bgTagBlue,
  bgRoundedPink,
}
