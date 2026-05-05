import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ColorPicker, DEFAULT_PALETTE } from '../src/components/ColorPicker.js'

// ── ColorPicker 단위 테스트 ───────────────────────────────────────────────────

describe('ColorPicker', () => {
  it('12색 팔레트 버튼이 렌더된다', () => {
    render(<ColorPicker />)
    const buttons = screen.getAllByRole('radio')
    expect(buttons).toHaveLength(DEFAULT_PALETTE.length)
    expect(DEFAULT_PALETTE).toHaveLength(12)
  })

  it('각 버튼에 aria-label 이 있다', () => {
    render(<ColorPicker />)
    const buttons = screen.getAllByRole('radio')
    for (const btn of buttons) {
      expect(btn.getAttribute('aria-label')).toBeTruthy()
    }
  })

  it('선택된 색은 aria-checked=true', () => {
    render(<ColorPicker value="#ffffff" />)
    const whiteBtn = screen.getByRole('radio', { name: '흰색' })
    expect(whiteBtn).toHaveAttribute('aria-checked', 'true')
  })

  it('선택되지 않은 색은 aria-checked=false', () => {
    render(<ColorPicker value="#ffffff" />)
    const blackBtn = screen.getByRole('radio', { name: '검정' })
    expect(blackBtn).toHaveAttribute('aria-checked', 'false')
  })

  it('팔레트 클릭 시 onChange 호출', () => {
    const onChange = vi.fn()
    render(<ColorPicker onChange={onChange} />)
    const blackBtn = screen.getByRole('radio', { name: '검정' })
    fireEvent.click(blackBtn)
    expect(onChange).toHaveBeenCalledWith('#111827')
  })

  it('"사용자 정의" 버튼이 렌더된다 (allowCustom=true 기본)', () => {
    render(<ColorPicker />)
    expect(screen.getByText('사용자 정의')).toBeInTheDocument()
  })

  it('allowCustom=false 이면 "사용자 정의" 버튼 없음', () => {
    render(<ColorPicker allowCustom={false} />)
    expect(screen.queryByText('사용자 정의')).not.toBeInTheDocument()
  })

  it('사용자 정의 클릭 → hex 입력 표시', () => {
    render(<ColorPicker />)
    const customBtn = screen.getByText('사용자 정의')
    fireEvent.click(customBtn)
    expect(screen.getByRole('textbox', { name: 'hex 색상 코드 입력' })).toBeInTheDocument()
  })

  it('hex 입력 후 Enter → onChange 호출', () => {
    const onChange = vi.fn()
    render(<ColorPicker onChange={onChange} />)
    fireEvent.click(screen.getByText('사용자 정의'))
    const input = screen.getByRole('textbox', { name: 'hex 색상 코드 입력' })
    fireEvent.change(input, { target: { value: '#ff0000' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('#ff0000')
  })

  it('잘못된 hex 입력 시 onChange 미호출', () => {
    const onChange = vi.fn()
    render(<ColorPicker onChange={onChange} />)
    fireEvent.click(screen.getByText('사용자 정의'))
    const input = screen.getByRole('textbox', { name: 'hex 색상 코드 입력' })
    fireEvent.change(input, { target: { value: 'invalid' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('role=radiogroup 이 있다', () => {
    render(<ColorPicker />)
    expect(screen.getByRole('radiogroup', { name: '색상 팔레트' })).toBeInTheDocument()
  })
})
