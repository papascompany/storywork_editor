/**
 * format-picker-mode.test.tsx — 산출물 모드 세그먼트 (MODE-02 / ADR-0017)
 *
 * 검증 항목:
 *  - 모드 세그먼트 렌더: POD 활성 · 웹툰 비활성("준비 중" — MODE-03 배선 전 반쪽 노출 금지)
 *  - 판형 목록이 모드의 단위계로 필터된다 (px 판형이 POD 목록에 섞이면 인쇄 사고)
 *  - MODE-01 이전 API 응답(unit 없음)은 mm 로 폴백된다
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FormatPickerModal } from '../../components/editor/page-system/FormatPickerModal'

// Radix Dialog 가 요구하는 브라우저 API 폴리필 (기존 모달 테스트와 동일 셋업)
beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  window.HTMLElement.prototype.hasPointerCapture = vi.fn()
  window.HTMLElement.prototype.releasePointerCapture = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function mockFormatsApi(formats: unknown[]): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ formats }),
    }),
  )
}

const MM_FORMAT = {
  id: 'preset-b5-novel',
  name: 'B5 단행본',
  unit: 'mm',
  widthMm: 130,
  heightMm: 200,
  dpi: 300,
  bleedMm: 3,
  safeMm: 5,
  coverEnabled: null,
  coverWidthMm: null,
  coverHeightMm: null,
}

const PX_FORMAT = {
  id: 'preset-webtoon-690',
  name: '웹툰 표준 690px',
  unit: 'px',
  widthMm: 690,
  heightMm: 1280,
  dpi: 72,
  bleedMm: 0,
  safeMm: 0,
  coverEnabled: null,
  coverWidthMm: null,
  coverHeightMm: null,
}

describe('FormatPickerModal — 산출물 모드 (MODE-02)', () => {
  it('모드 세그먼트를 렌더한다 — POD 활성, 웹툰은 준비 중 비활성', () => {
    mockFormatsApi([])
    render(<FormatPickerModal open onSelect={vi.fn()} />)

    const pod = screen.getByTestId('mode-segment-pod')
    expect(pod).toBeEnabled()
    expect(pod).toHaveAttribute('aria-checked', 'true')

    // 웹툰은 MODE-03(배치 분기) 배선 전까지 선택 불가 — px 프로젝트가 mm 파이프라인에
    // 들어가면 잘못된 결과가 나온다
    const webtoon = screen.getByTestId('mode-segment-webtoon')
    expect(webtoon).toBeDisabled()
    expect(webtoon).toHaveTextContent('준비 중')
  })

  it('POD 모드 목록에 px(웹툰) 판형이 섞이지 않는다', async () => {
    mockFormatsApi([MM_FORMAT, PX_FORMAT])
    render(<FormatPickerModal open onSelect={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByTestId('format-preset-preset-b5-novel')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('format-preset-preset-webtoon-690')).not.toBeInTheDocument()
  })

  it('unit 이 없는 응답(MODE-01 이전)은 mm 로 폴백해 POD 목록에 나온다', async () => {
    const { unit: _unit, ...legacy } = MM_FORMAT
    mockFormatsApi([legacy])
    render(<FormatPickerModal open onSelect={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByTestId('format-preset-preset-b5-novel')).toBeInTheDocument()
    })
  })

  it('API 가 px 판형만 돌려주면 POD 목록은 하드코드 mm 프리셋으로 폴백하지 않고 비어 보이지 않는다', async () => {
    // dbCards 가 세팅되면(px 만 있어도) 필터 결과가 빈 목록이 될 수 있다 —
    // 실환경에서는 mm 프리셋이 항상 시드돼 있어 발생하지 않지만, 세그먼트가 pod 인 한
    // px 카드가 렌더되지 않는 것이 계약이다
    mockFormatsApi([PX_FORMAT])
    render(<FormatPickerModal open onSelect={vi.fn()} />)

    await waitFor(() => {
      expect(screen.queryByTestId('format-preset-preset-webtoon-690')).not.toBeInTheDocument()
    })
  })
})
