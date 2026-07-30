/**
 * conti-sheet.test.ts — 콘티 시트 합성기 (CONTI-02)
 *
 * 검증 항목:
 *  - 시트 분할: 8컷/시트 (8컷 → 1시트, 9컷 → 2시트, 0컷 → 0시트)
 *  - Schema v1 형태 (v:1, format, layers) + _aiMeta.templateId 'conti-2x4'
 *  - 결정론: 같은 입력 + 같은 seed → deep equal / seed 변경 → id 변경
 *  - 경계: 모든 레이어가 safe 영역(margin) 안에 위치
 *  - pdf-engine 계약: kind ∈ {bubble, text, pose}, fabric.left/top/width/height 존재
 *  - 포즈 썸네일: poseThumbUrl 있을 때만 pose 레이어 생성
 *  - wrapTextMm: 래핑 + maxLines 말줄임
 */

import { describe, it, expect } from 'vitest'

import {
  composeContiSheets,
  cameraAngleToShotLabel,
  wrapTextMm,
  CONTI_GRID,
} from '../src/conti-sheet.js'
import type { ContiCut } from '../src/conti-sheet.js'
import type { LayoutFormat } from '../src/types.js'

const B5: LayoutFormat = {
  id: 'b5',
  widthMm: 130,
  heightMm: 200,
  dpi: 300,
  bleedMm: 3,
  safeMm: 5,
}

function makeCut(n: number, overrides: Partial<ContiCut> = {}): ContiCut {
  return {
    cutNo: n,
    sceneIndex: n - 1,
    summary: `장면 ${n} 지문입니다`,
    lines: [
      { speaker: '민준', text: `${n}번째 대사` },
      { speaker: null, text: '내레이션 문장' },
    ],
    pageNo: n,
    ...overrides,
  }
}

describe('composeContiSheets — 시트 분할', () => {
  it('0컷 → 0시트', () => {
    expect(composeContiSheets([], { format: B5 })).toEqual([])
  })

  it('8컷 → 1시트, 9컷 → 2시트 (perSheet=8)', () => {
    expect(CONTI_GRID.perSheet).toBe(8)
    const cuts8 = Array.from({ length: 8 }, (_, i) => makeCut(i + 1))
    const cuts9 = Array.from({ length: 9 }, (_, i) => makeCut(i + 1))
    expect(composeContiSheets(cuts8, { format: B5 })).toHaveLength(1)

    const sheets = composeContiSheets(cuts9, { format: B5 })
    expect(sheets).toHaveLength(2)
    expect(sheets[1]?._aiMeta?.sceneIndices).toEqual([8])
  })
})

describe('composeContiSheets — Schema v1 + pdf-engine 계약', () => {
  const sheets = composeContiSheets(
    [makeCut(1, { poseThumbUrl: 'https://example.com/pose-1.png' }), makeCut(2)],
    { format: B5, seed: 42, title: '테스트 작품' },
  )
  const sheet = sheets[0]

  it('v:1 + format + _aiMeta(templateId conti-2x4, seed)', () => {
    expect(sheet?.v).toBe(1)
    expect(sheet?.format).toEqual({ id: 'b5', widthMm: 130, heightMm: 200, dpi: 300 })
    expect(sheet?._aiMeta?.templateId).toBe('conti-2x4')
    expect(sheet?._aiMeta?.seed).toBe(42)
    expect(sheet?._aiMeta?.sceneIndices).toEqual([0, 1])
  })

  it('레이어 kind 는 pdf-engine 지원 집합(bubble/text/pose)만 사용', () => {
    const kinds = new Set(sheet?.layers.map((l) => l.kind))
    expect([...kinds].sort()).toEqual(['bubble', 'pose', 'text'])
  })

  it('모든 레이어가 mm 좌표(left/top/width/height)를 갖고 safe 영역 안에 위치', () => {
    const margin = B5.safeMm + CONTI_GRID.marginPadMm
    for (const layer of sheet?.layers ?? []) {
      const left = layer.fabric['left'] as number
      const top = layer.fabric['top'] as number
      const width = layer.fabric['width'] as number
      const height = layer.fabric['height'] as number
      expect(typeof left).toBe('number')
      expect(typeof top).toBe('number')
      expect(left).toBeGreaterThanOrEqual(margin - 1e-6)
      expect(top).toBeGreaterThanOrEqual(margin - 1e-6)
      expect(left + width).toBeLessThanOrEqual(B5.widthMm - margin + 1e-6)
      expect(top + height).toBeLessThanOrEqual(B5.heightMm - margin + 1e-6)
    }
  })

  it('컷 프레임은 8개 미만 컷이어도 컷 수만큼만 생성', () => {
    const frames = sheet?.layers.filter((l) => l.kind === 'bubble') ?? []
    expect(frames).toHaveLength(2)
  })

  it('포즈 레이어는 poseThumbUrl 있는 컷에만 생성되고 src 를 갖는다', () => {
    const poses = sheet?.layers.filter((l) => l.kind === 'pose') ?? []
    expect(poses).toHaveLength(1)
    expect(poses[0]?.fabric['src']).toBe('https://example.com/pose-1.png')
    expect(poses[0]?.data.meta?.['fileUrl']).toBe('https://example.com/pose-1.png')
  })

  it('헤더에 제목 + 시트 번호 표기', () => {
    const header = sheet?.layers.find((l) => l.id.endsWith('-header'))
    expect(header?.fabric['text']).toBe('테스트 작품 — 콘티 1/1')
  })

  it('라벨에 컷 번호·페이지 번호, shotLabel 은 있을 때만', () => {
    const label1 = sheet?.layers.find((l) => l.id.endsWith('-c1-label'))
    expect(label1?.fabric['text']).toBe('#1 · p.1')

    const withShot = composeContiSheets([makeCut(1, { shotLabel: 'CU' })], { format: B5 })
    const label = withShot[0]?.layers.find((l) => l.id.endsWith('-c1-label'))
    expect(label?.fabric['text']).toBe('#1 · CU · p.1')
  })
})

describe('composeContiSheets — 결정론 (ADR-0007)', () => {
  const cuts = Array.from({ length: 9 }, (_, i) => makeCut(i + 1))

  it('같은 입력 + 같은 seed → deep equal', () => {
    const a = composeContiSheets(cuts, { format: B5, seed: 7 })
    const b = composeContiSheets(cuts, { format: B5, seed: 7 })
    expect(a).toEqual(b)
  })

  it('seed 변경 → 레이어 id 변경 (내용 좌표는 동일)', () => {
    const a = composeContiSheets(cuts, { format: B5, seed: 1 })
    const b = composeContiSheets(cuts, { format: B5, seed: 2 })
    expect(a[0]?.layers[0]?.id).not.toBe(b[0]?.layers[0]?.id)
    expect(a[0]?.layers.map((l) => l.fabric['left'])).toEqual(
      b[0]?.layers.map((l) => l.fabric['left']),
    )
  })
})

describe('wrapTextMm', () => {
  it('폭 안에 들어가면 1줄 그대로', () => {
    expect(wrapTextMm('짧은 글', 6, 100, 3)).toEqual(['짧은 글'])
  })

  it('긴 텍스트는 여러 줄로 래핑', () => {
    const lines = wrapTextMm('가나다라마바사아자차카타파하', 6, 10, 10)
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.join('')).toBe('가나다라마바사아자차카타파하')
  })

  it('maxLines 초과분은 마지막 줄 말줄임(…)', () => {
    const lines = wrapTextMm('가나다라마바사아자차카타파하가나다라마바사', 6, 10, 2)
    expect(lines).toHaveLength(2)
    expect(lines[1]?.endsWith('…')).toBe(true)
  })

  it('maxLines 0 → 빈 배열', () => {
    expect(wrapTextMm('아무거나', 6, 10, 0)).toEqual([])
  })
})

describe('cameraAngleToShotLabel (CONTI-01 훅)', () => {
  it('cameraAngle 5값 매핑 + 미지정 undefined', () => {
    expect(cameraAngleToShotLabel('closeup')).toBe('CU')
    expect(cameraAngleToShotLabel('medium')).toBe('MS')
    expect(cameraAngleToShotLabel('wide')).toBe('WS')
    expect(cameraAngleToShotLabel('bird-eye')).toBe('BEV')
    expect(cameraAngleToShotLabel('low-angle')).toBe('LA')
    expect(cameraAngleToShotLabel(undefined)).toBeUndefined()
    expect(cameraAngleToShotLabel('unknown')).toBeUndefined()
  })
})
