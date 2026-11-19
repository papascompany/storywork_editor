'use client'

/**
 * lib/use-modal-focus.ts — 직접 구현한 모달의 포커스 관리 (WCAG 2.1.2 · 2.4.3)
 *
 * Radix Dialog 는 포커스 트랩·복귀를 자체 제공하지만, 직접 만든 모달(명령 팔레트·단축키 도움말·
 * 저장 로그인 게이트·탈퇴·신고)은 닫힌 뒤 포커스가 <body> 로 떨어져 키보드 사용자가 위치를 잃었다.
 *
 * - 열릴 때 직전 포커스 요소를 기억 → 닫히거나 언마운트되면 그 요소로 복귀(문서에서 빠졌으면 생략)
 * - 열린 동안 Tab / Shift+Tab 을 컨테이너 안에서 순환
 * - onEscape 를 주면 Esc 로 닫기 (자체 Esc 처리가 없는 모달용)
 *
 * 초기 포커스는 각 모달이 정한다(검색창·주요 버튼 등). 이 훅은 관여하지 않는다.
 */
import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** 컨테이너 안에서 Tab 으로 닿을 수 있는 요소 (숨김·inert 제외) */
export function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest('[inert]') && !el.hasAttribute('hidden') && el.tabIndex !== -1,
  )
}

export function useModalFocus(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  options: { onEscape?: () => void } = {},
): void {
  const onEscapeRef = useRef(options.onEscape)
  onEscapeRef.current = options.onEscape

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscapeRef.current) {
        e.preventDefault()
        onEscapeRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const container = containerRef.current
      if (!container) return
      const items = getFocusable(container)
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) {
        e.preventDefault()
        return
      }
      const active = document.activeElement
      const inside = active instanceof Node && container.contains(active)
      if (e.shiftKey && (!inside || active === first)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previous && previous !== document.body && previous.isConnected) {
        previous.focus({ preventScroll: true })
      }
    }
  }, [open, containerRef])
}
