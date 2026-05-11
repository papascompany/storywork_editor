/**
 * format-picker-modal.test.tsx — FormatPickerModal 단위 테스트
 */

import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi } from 'vitest'

import { FormatPickerModal } from '../../components/editor/page-system/FormatPickerModal'

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

function renderModal(props?: Partial<React.ComponentProps<typeof FormatPickerModal>>) {
  const onSelect = vi.fn()
  const onClose = vi.fn()
  render(<FormatPickerModal open={true} onSelect={onSelect} onClose={onClose} {...props} />)
  return { onSelect, onClose }
}

// ── 테스트 ────────────────────────────────────────────────────────────────────

describe('FormatPickerModal — 기본 렌더링', () => {
  it('모달이 열리면 "어떤 판형으로 시작할까요?" 헤더가 보인다', () => {
    renderModal()
    expect(screen.getByText('어떤 판형으로 시작할까요?')).toBeInTheDocument()
  })

  it('4종 프리셋 카드가 모두 렌더링된다', () => {
    renderModal()
    expect(screen.getByTestId('format-preset-preset:b5-novel')).toBeInTheDocument()
    expect(screen.getByTestId('format-preset-preset:a5-artbook')).toBeInTheDocument()
    expect(screen.getByTestId('format-preset-preset:square')).toBeInTheDocument()
    expect(screen.getByTestId('format-preset-preset:mobile-story')).toBeInTheDocument()
  })

  it('"시작하기" 버튼은 초기에 비활성화 상태이다', () => {
    renderModal()
    const btn = screen.getByTestId('format-picker-confirm')
    expect(btn).toBeDisabled()
  })
})

describe('FormatPickerModal — 프리셋 선택', () => {
  it('프리셋 선택 시 "시작하기" 버튼이 활성화된다', () => {
    renderModal()
    const squareCard = screen.getByTestId('format-preset-preset:square')
    fireEvent.click(squareCard)
    const btn = screen.getByTestId('format-picker-confirm')
    expect(btn).not.toBeDisabled()
  })

  it('프리셋 선택 후 프로젝트 이름 입력 필드가 나타난다', () => {
    renderModal()
    const squareCard = screen.getByTestId('format-preset-preset:square')
    fireEvent.click(squareCard)
    expect(screen.getByTestId('project-title-input')).toBeInTheDocument()
  })

  it('"시작하기" 클릭 시 onSelect가 호출된다', () => {
    const { onSelect } = renderModal()
    const squareCard = screen.getByTestId('format-preset-preset:square')
    fireEvent.click(squareCard)
    fireEvent.click(screen.getByTestId('format-picker-confirm'))
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('선택된 format 정보가 onSelect에 전달된다 (정사각 150x150)', () => {
    const { onSelect } = renderModal()
    fireEvent.click(screen.getByTestId('format-preset-preset:square'))
    fireEvent.click(screen.getByTestId('format-picker-confirm'))
    const [format, formatId] = onSelect.mock.calls[0] as [
      { widthMm: number; heightMm: number },
      string,
      string,
    ]
    expect(format.widthMm).toBe(150)
    expect(format.heightMm).toBe(150)
    expect(formatId).toBe('preset:square')
  })

  it('커스텀 프로젝트 이름이 onSelect에 전달된다', () => {
    const { onSelect } = renderModal()
    fireEvent.click(screen.getByTestId('format-preset-preset:b5-novel'))
    const titleInput = screen.getByTestId('project-title-input')
    fireEvent.change(titleInput, { target: { value: '나만의 콘티' } })
    fireEvent.click(screen.getByTestId('format-picker-confirm'))
    const [, , title] = onSelect.mock.calls[0] as [unknown, unknown, string]
    expect(title).toBe('나만의 콘티')
  })

  it('이름 미입력 시 기본 제목("새 콘티 ...")이 사용된다', () => {
    const { onSelect } = renderModal()
    fireEvent.click(screen.getByTestId('format-preset-preset:square'))
    fireEvent.click(screen.getByTestId('format-picker-confirm'))
    const [, , title] = onSelect.mock.calls[0] as [unknown, unknown, string]
    expect(title).toMatch(/^새 콘티/)
  })

  it('Enter 키로도 확인이 된다', () => {
    const { onSelect } = renderModal()
    fireEvent.click(screen.getByTestId('format-preset-preset:square'))
    const titleInput = screen.getByTestId('project-title-input')
    fireEvent.keyDown(titleInput, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledOnce()
  })
})

describe('FormatPickerModal — open=false', () => {
  it('open=false 이면 모달이 보이지 않는다', () => {
    render(<FormatPickerModal open={false} onSelect={vi.fn()} />)
    expect(screen.queryByText('어떤 판형으로 시작할까요?')).not.toBeInTheDocument()
  })
})

describe('FormatPickerModal — B5 프리셋', () => {
  it('B5 선택 시 130x200 format이 전달된다', () => {
    const { onSelect } = renderModal()
    fireEvent.click(screen.getByTestId('format-preset-preset:b5-novel'))
    fireEvent.click(screen.getByTestId('format-picker-confirm'))
    const [format] = onSelect.mock.calls[0] as [{ widthMm: number; heightMm: number }, ...unknown[]]
    expect(format.widthMm).toBe(130)
    expect(format.heightMm).toBe(200)
  })
})
