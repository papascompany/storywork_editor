/**
 * modal-focus.test.tsx — 직접 구현한 모달의 포커스 관리 (WCAG 2.4.3 · 2.1.2)
 *
 * 1. 닫히면 연 버튼으로 포커스 복귀
 * 2. 열린 동안 Tab / Shift+Tab 이 모달 안에서 순환
 * 3. 모달 밖에 포커스가 있으면 Tab 이 모달 첫 요소로
 * 4. onEscape → Esc 로 닫힘 + 복귀 (ReportButton)
 * 5. 연 요소가 문서에서 빠졌으면 복귀 생략(에러 없음)
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import React, { useRef, useState } from 'react'
import { describe, expect, it } from 'vitest'

import { KeyboardShortcutsModal } from '../components/editor/KeyboardShortcutsModal'
import { ReportButton } from '../components/showcase/ReportButton'
import { useModalFocus } from '../lib/use-modal-focus'

function ShortcutsHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        도움말 열기
      </button>
      <KeyboardShortcutsModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function MiniModal({ withOutside = false }: { withOutside?: boolean }) {
  const [open, setOpen] = useState(true)
  const ref = useRef<HTMLDivElement>(null)
  useModalFocus(open, ref, { onEscape: () => setOpen(false) })
  return (
    <>
      {withOutside && <button type="button">바깥</button>}
      {open && (
        <div ref={ref} role="dialog" aria-modal="true">
          <button type="button">첫째</button>
          <button type="button" disabled>
            비활성
          </button>
          <input aria-label="가운데" />
          <button type="button">마지막</button>
        </div>
      )}
    </>
  )
}

const tab = (shift = false) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Tab', shiftKey: shift })

describe('useModalFocus', () => {
  it('1. 닫히면 연 버튼으로 포커스가 돌아온다', () => {
    render(<ShortcutsHarness />)
    const trigger = screen.getByRole('button', { name: '도움말 열기' })
    trigger.focus()
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    screen.getByRole('textbox').focus()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(trigger)
  })

  it('2. Tab / Shift+Tab 이 모달 안에서 순환한다 (비활성 요소 제외)', () => {
    render(<MiniModal />)
    const first = screen.getByRole('button', { name: '첫째' })
    const last = screen.getByRole('button', { name: '마지막' })

    last.focus()
    tab()
    expect(document.activeElement).toBe(first)

    tab(true)
    expect(document.activeElement).toBe(last)
  })

  it('3. 포커스가 모달 밖이면 Tab 이 모달 첫 요소로 들어간다', () => {
    render(<MiniModal withOutside />)
    screen.getByRole('button', { name: '바깥' }).focus()
    tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '첫째' }))
  })

  it('4. ReportButton — Esc 로 닫히고 신고 버튼으로 복귀', () => {
    render(<ReportButton targetType="showcase" targetId="s1" isAuthenticated />)
    const trigger = screen.getByRole('button', { name: /신고/ })
    trigger.focus()
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: '신고하기' })).toBeInTheDocument()

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(trigger)
  })

  it('5. 연 요소가 사라졌으면 복귀하지 않는다', () => {
    function Gone() {
      const [open, setOpen] = useState(false)
      const [showTrigger, setShowTrigger] = useState(true)
      const ref = useRef<HTMLDivElement>(null)
      useModalFocus(open, ref)
      return (
        <>
          {showTrigger && (
            <button type="button" onClick={() => setOpen(true)}>
              열기
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setShowTrigger(false)
              setOpen(false)
            }}
          >
            닫기
          </button>
          {open && <div ref={ref} />}
        </>
      )
    }
    render(<Gone />)
    const opener = screen.getByRole('button', { name: '열기' })
    opener.focus()
    fireEvent.click(opener)
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('button', { name: '열기' })).not.toBeInTheDocument()
    expect(document.activeElement).not.toBe(opener)
  })
})
