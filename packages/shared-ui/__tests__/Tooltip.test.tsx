import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import * as React from 'react'
import { describe, expect, it } from 'vitest'

import { Tooltip } from '../src/components/Tooltip.js'

expect.extend(toHaveNoViolations)

describe('Tooltip', () => {
  it('trigger 자식이 렌더됩니다', () => {
    render(
      <Tooltip content="툴팁 내용">
        <button type="button">trigger</button>
      </Tooltip>,
    )
    expect(screen.getByRole('button', { name: 'trigger' })).toBeInTheDocument()
  })

  it('호버 시 툴팁 내용이 표시됩니다', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })

    render(
      <Tooltip content="실행 취소 (고유)">
        <button type="button">Undo</button>
      </Tooltip>,
    )

    const trigger = screen.getByRole('button', { name: 'Undo' })
    await user.hover(trigger)

    // Radix Tooltip 은 포탈을 통해 렌더. findAllByText 로 하나 이상 있는지 확인
    const elements = await screen.findAllByText('실행 취소 (고유)', {}, { timeout: 2000 })
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })

  it('shortcut 이 있으면 kbd 요소가 렌더됩니다', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })

    render(
      <Tooltip content="다시 실행" shortcut="Cmd+Shift+Z">
        <button type="button">Redo</button>
      </Tooltip>,
    )

    const trigger = screen.getByRole('button', { name: 'Redo' })
    await user.hover(trigger)

    const kbds = await screen.findAllByText('Cmd+Shift+Z', {}, { timeout: 2000 })
    // kbd 요소가 하나 이상 있어야 함
    const kbdEl = kbds.find((el) => el.tagName === 'KBD')
    expect(kbdEl).toBeDefined()
  })

  it('axe a11y 위반이 없습니다 (닫힌 상태)', async () => {
    const { container } = render(
      <Tooltip content="다운로드" shortcut="Cmd+S">
        <button type="button" aria-label="다운로드">
          DL
        </button>
      </Tooltip>,
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
