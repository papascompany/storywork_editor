/**
 * __tests__/adapter.test.ts
 *
 * fabricLayersToCommands() 단위 테스트
 * - 빈 layers → 빈 commands
 * - bg 레이어 → RectCommand
 * - pose/prop 레이어 → ImageCommand
 * - text 레이어 → TextCommand
 * - bubble 레이어 → BubbleCommand
 * - url 없는 pose → SkipCommand + warning
 * - center origin → top-left 좌표 변환
 */

import type { LayerJson } from '@storywork/schema/editor'
import { describe, it, expect } from 'vitest'

import { fabricLayersToCommands } from '../src/adapter/fabric-to-pdf.js'

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function makeLayer(overrides: Partial<LayerJson> & Pick<LayerJson, 'kind'>): LayerJson {
  return {
    id: 'test-layer-1',
    data: {},
    fabric: {
      left: 10,
      top: 20,
      width: 100,
      height: 50,
      scaleX: 1,
      scaleY: 1,
      originX: 'left',
      originY: 'top',
      opacity: 1,
      angle: 0,
    },
    ...overrides,
  }
}

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('fabricLayersToCommands', () => {
  it('빈 layers → 빈 commands + warnings', () => {
    const { commands, warnings } = fabricLayersToCommands([])
    expect(commands).toHaveLength(0)
    expect(warnings).toHaveLength(0)
  })

  it('bg 레이어 → RectCommand', () => {
    const layer = makeLayer({
      kind: 'bg',
      fabric: {
        left: 0,
        top: 0,
        width: 130,
        height: 200,
        scaleX: 1,
        scaleY: 1,
        originX: 'left',
        originY: 'top',
        opacity: 1,
        angle: 0,
        fill: '#f5f0e8',
      },
    })
    const { commands, warnings } = fabricLayersToCommands([layer])
    expect(warnings).toHaveLength(0)
    expect(commands).toHaveLength(1)
    const cmd = commands[0]
    expect(cmd).toBeDefined()
    expect(cmd?.kind).toBe('rect')
    if (cmd?.kind === 'rect') {
      expect(cmd.x).toBe(0)
      expect(cmd.y).toBe(0)
      expect(cmd.width).toBe(130)
      expect(cmd.height).toBe(200)
      expect(cmd.fill.r).toBe(0xf5)
      expect(cmd.fill.g).toBe(0xf0)
      expect(cmd.fill.b).toBe(0xe8)
    }
  })

  it('pose 레이어 (url 있음) → ImageCommand', () => {
    const layer = makeLayer({
      kind: 'pose',
      data: {
        meta: {
          fileUrl: 'https://cdn.example.com/poses/pose-001.png',
        },
      },
      fabric: {
        left: 20,
        top: 30,
        width: 80,
        height: 120,
        scaleX: 1,
        scaleY: 1,
        originX: 'left',
        originY: 'top',
        opacity: 0.9,
        angle: 15,
      },
    })
    const { commands, warnings } = fabricLayersToCommands([layer])
    expect(warnings).toHaveLength(0)
    const cmd = commands[0]
    expect(cmd?.kind).toBe('image')
    if (cmd?.kind === 'image') {
      expect(cmd.url).toBe('https://cdn.example.com/poses/pose-001.png')
      expect(cmd.opacity).toBeCloseTo(0.9)
      expect(cmd.rotation).toBe(15)
      expect(cmd.needsRaster).toBe(false)
    }
  })

  it('pose 레이어 (url 없음) → SkipCommand + warning', () => {
    const layer = makeLayer({
      kind: 'pose',
      data: {},
      fabric: {
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        scaleX: 1,
        scaleY: 1,
        originX: 'left',
        originY: 'top',
        opacity: 1,
        angle: 0,
      },
    })
    const { commands, warnings } = fabricLayersToCommands([layer])
    expect(commands[0]?.kind).toBe('skip')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('no url')
  })

  it('text 레이어 → TextCommand', () => {
    const layer = makeLayer({
      kind: 'text',
      fabric: {
        left: 5,
        top: 10,
        width: 60,
        height: 20,
        scaleX: 1,
        scaleY: 1,
        originX: 'left',
        originY: 'top',
        opacity: 1,
        angle: 0,
        text: '안녕하세요',
        fontSize: 18,
        fill: '#333333',
        fontFamily: 'Pretendard',
      },
    })
    const { commands, warnings } = fabricLayersToCommands([layer])
    expect(warnings).toHaveLength(0)
    const cmd = commands[0]
    expect(cmd?.kind).toBe('text')
    if (cmd?.kind === 'text') {
      expect(cmd.text).toBe('안녕하세요')
      expect(cmd.fontSize).toBe(18)
      expect(cmd.color).toBe('#333333')
    }
  })

  it('bubble 레이어 → BubbleCommand', () => {
    const layer = makeLayer({
      kind: 'bubble',
      data: {
        meta: {
          bubbleType: 'oval',
          tailAngle: 270,
        },
      },
      fabric: {
        left: 10,
        top: 10,
        width: 80,
        height: 40,
        scaleX: 1,
        scaleY: 1,
        originX: 'left',
        originY: 'top',
        opacity: 1,
        angle: 0,
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 2,
      },
    })
    const { commands } = fabricLayersToCommands([layer])
    const cmd = commands[0]
    expect(cmd?.kind).toBe('bubble')
    if (cmd?.kind === 'bubble') {
      expect(cmd.bubbleType).toBe('oval')
      expect(cmd.tailAngle).toBe(270)
      expect(cmd.strokeWidth).toBe(2)
    }
  })

  it('center origin 레이어 → top-left 좌표 변환', () => {
    // center=(65,100), size=(130,200) → top-left=(0,0)
    const layer = makeLayer({
      kind: 'bg',
      fabric: {
        left: 65,
        top: 100,
        width: 130,
        height: 200,
        scaleX: 1,
        scaleY: 1,
        originX: 'center',
        originY: 'center',
        opacity: 1,
        angle: 0,
        fill: '#ffffff',
      },
    })
    const { commands } = fabricLayersToCommands([layer])
    const cmd = commands[0]
    if (cmd?.kind === 'rect') {
      expect(cmd.x).toBe(0)
      expect(cmd.y).toBe(0)
    }
  })

  it('scaleX/scaleY 적용 → scaledWidth/Height', () => {
    const layer = makeLayer({
      kind: 'bg',
      fabric: {
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        scaleX: 1.3,
        scaleY: 2.0,
        originX: 'left',
        originY: 'top',
        opacity: 1,
        angle: 0,
        fill: '#000000',
      },
    })
    const { commands } = fabricLayersToCommands([layer])
    const cmd = commands[0]
    if (cmd?.kind === 'rect') {
      expect(cmd.width).toBeCloseTo(130)
      expect(cmd.height).toBeCloseTo(200)
    }
  })
})
