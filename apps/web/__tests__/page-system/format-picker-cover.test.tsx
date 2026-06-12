/**
 * FormatPickerModal — DB 판형 + 표지 소비 (FOLLOWUP-COVER-02)
 *
 * GET /api/formats mock → isActive 판형 카드 렌더, 표지 배지, onSelect cover 인자 검증.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FormatPickerModal } from '@/components/editor/page-system/FormatPickerModal'

const DB_FORMATS = [
  {
    id: 'preset-b5-novel',
    name: 'B5 단행본',
    widthMm: 130,
    heightMm: 200,
    dpi: 300,
    bleedMm: 3,
    safeMm: 5,
    coverEnabled: true,
    coverWidthMm: 266,
    coverHeightMm: 206,
  },
  {
    id: 'preset-square',
    name: '정사각 1:1',
    widthMm: 150,
    heightMm: 150,
    dpi: 300,
    bleedMm: 3,
    safeMm: 5,
    coverEnabled: false,
    coverWidthMm: null,
    coverHeightMm: null,
  },
]

describe('FormatPickerModal — DB 판형 + 표지', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ formats: DB_FORMATS }),
      }),
    )
  })

  it('DB 판형 목록을 fetch 해 카드로 렌더한다 (isActive 만 — 서버 필터)', async () => {
    render(<FormatPickerModal open onSelect={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByTestId('format-preset-preset-b5-novel')).toBeDefined()
    })
    expect(screen.getByTestId('format-preset-preset-square')).toBeDefined()
    expect(global.fetch).toHaveBeenCalledWith('/api/formats')
  })

  it('coverEnabled 판형에만 "표지 포함" 배지가 렌더된다', async () => {
    render(<FormatPickerModal open onSelect={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByTestId('format-cover-badge-preset-b5-novel')).toBeDefined()
    })
    expect(screen.queryByTestId('format-cover-badge-preset-square')).toBeNull()
  })

  it('표지 판형 선택 → onSelect 의 cover 인자에 유효 치수 전달', async () => {
    const onSelect = vi.fn()
    render(<FormatPickerModal open onSelect={onSelect} />)
    await waitFor(() => {
      expect(screen.getByTestId('format-preset-preset-b5-novel')).toBeDefined()
    })

    fireEvent.click(screen.getByTestId('format-preset-preset-b5-novel'))
    fireEvent.click(screen.getByTestId('format-picker-confirm'))

    expect(onSelect).toHaveBeenCalledOnce()
    const call = onSelect.mock.calls[0] as unknown[]
    expect(call[1]).toBe('preset-b5-novel')
    expect(call[3]).toEqual({ widthMm: 266, heightMm: 206 })
  })

  it('표지 미사용 판형 → cover=null', async () => {
    const onSelect = vi.fn()
    render(<FormatPickerModal open onSelect={onSelect} />)
    await waitFor(() => {
      expect(screen.getByTestId('format-preset-preset-square')).toBeDefined()
    })

    fireEvent.click(screen.getByTestId('format-preset-preset-square'))
    fireEvent.click(screen.getByTestId('format-picker-confirm'))

    const call = onSelect.mock.calls[0] as unknown[]
    expect(call[3]).toBeNull()
  })

  it('fetch 실패 → 하드코드 프리셋 폴백 (배지 없음)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    render(<FormatPickerModal open onSelect={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByTestId('format-preset-preset:b5-novel')).toBeDefined()
    })
    expect(screen.queryByTestId(/format-cover-badge/)).toBeNull()
  })
})
