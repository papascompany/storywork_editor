import { describe, expect, it } from 'vitest'

import {
  brand,
  accent,
  spacing,
  radius,
  duration,
  breakpoints,
  editorTokens,
  elevation,
  zIndex,
} from '../src/tokens/index.js'

describe('디자인 토큰', () => {
  it('brand 컬러 스케일이 50~950 을 가집니다', () => {
    expect(brand[50]).toBeDefined()
    expect(brand[500]).toBe('#6366f1')
    expect(brand[950]).toBeDefined()
  })

  it('accent 컬러 스케일이 정의됩니다', () => {
    expect(accent[500]).toBe('#06b6d4')
  })

  it('spacing[11] 이 44px (2.75rem) 입니다', () => {
    expect(spacing[11]).toBe('2.75rem')
  })

  it('radius.md 가 8px (0.5rem) 입니다', () => {
    expect(radius.md).toBe('0.5rem')
  })

  it('duration.normal 이 200ms 입니다', () => {
    expect(duration.normal).toBe('200ms')
  })

  it('브레이크포인트가 정의됩니다', () => {
    expect(breakpoints.sm).toBe('640px')
    expect(breakpoints.md).toBe('768px')
    expect(breakpoints.lg).toBe('1024px')
    expect(breakpoints.xl).toBe('1280px')
    expect(breakpoints['2xl']).toBe('1536px')
  })

  it('editorTokens 가 CSS 변수 참조를 가집니다', () => {
    expect(editorTokens.workspace).toBe('var(--editor-workspace)')
    expect(editorTokens.panel).toBe('var(--editor-panel)')
    expect(editorTokens.accent).toBe('var(--editor-accent)')
  })

  it('elevation 이 5단계를 가집니다', () => {
    expect(elevation.e0).toBe('none')
    expect(elevation.e1).toContain('rgba')
    expect(elevation.e5).toContain('rgba')
  })

  it('zIndex 계층이 오름차순입니다', () => {
    expect(zIndex.base).toBe(0)
    expect(zIndex.canvas).toBeGreaterThan(zIndex.base)
    expect(zIndex.panel).toBeGreaterThan(zIndex.canvas)
    expect(zIndex.modal).toBeGreaterThan(zIndex.panel)
    expect(zIndex.toast).toBeGreaterThan(zIndex.modal)
    expect(zIndex.loadingOverlay).toBeGreaterThan(zIndex.toast)
    expect(zIndex.tooltip).toBeGreaterThan(zIndex.loadingOverlay)
  })
})
