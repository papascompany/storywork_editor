import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it } from 'vitest'

import { Slider } from '../src/components/Slider.js'

// ── Slider 단위 테스트 ────────────────────────────────────────────────────────

describe('Slider', () => {
  it('라벨이 렌더된다', () => {
    render(<Slider label="투명도" value={50} />)
    expect(screen.getByText('투명도')).toBeInTheDocument()
  })

  it('현재 값이 표시된다', () => {
    render(<Slider label="투명도" value={75} unit="%" />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('aria-label 이 있다', () => {
    render(<Slider label="투명도" value={50} />)
    const slider = screen.getByRole('slider')
    expect(slider).toBeInTheDocument()
  })

  it('disabled 상태에서 data-disabled 속성 설정', () => {
    render(<Slider label="투명도" value={50} disabled />)
    // Radix Slider Thumb 은 span 이므로 data-disabled 속성으로 확인
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('data-disabled', '')
  })

  it('라벨 없이도 렌더 가능', () => {
    render(<Slider value={30} aria-label="슬라이더" />)
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  it('min/max 속성 반영', () => {
    render(<Slider label="테스트" value={5} min={0} max={10} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuemin', '0')
    expect(slider).toHaveAttribute('aria-valuemax', '10')
  })

  it('현재 값이 aria-valuenow 에 반영', () => {
    render(<Slider label="테스트" value={42} min={0} max={100} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuenow', '42')
  })

  it('unit 없을 때도 정상 렌더', () => {
    render(<Slider label="각도" value={45} />)
    expect(screen.getByText('45')).toBeInTheDocument()
  })
})
