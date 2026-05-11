// ─────────────────────────────────────────────
// text-input-mode.ts — 텍스트 인라인 편집 진입/종료
//
// 더블클릭 → enterEditing()
// Esc → exitEditing()
//
// fabric v6 IText/Textbox 모두 호환.
// bound 핸들러 패턴 (FOLLOWUP-16) 준수.
// ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricCanvas = any

type CleanupFn = () => void

/**
 * fabric Canvas 에 텍스트 더블클릭 → enterEditing 핸들러를 등록한다.
 * @returns cleanup 함수 (dispose 시 호출)
 */
export function attachTextInputMode(fabricCanvas: FabricCanvas): CleanupFn {
  let _disposed = false

  // ─── bound handler: 더블클릭 ──────────────────────────────────────

  const onDblClick = (e: { target?: unknown }): void => {
    if (_disposed) return
    const target = e.target as { enterEditing?: () => void } | null
    if (!target || typeof target.enterEditing !== 'function') return
    target.enterEditing()

    fabricCanvas.requestRenderAll()
  }

  // ─── bound handler: Esc 종료 ──────────────────────────────────────

  const onKeyDown = (e: KeyboardEvent): void => {
    if (_disposed) return
    if (e.key !== 'Escape') return

    const active = fabricCanvas.getActiveObject() as {
      isEditing?: boolean
      exitEditing?: () => void
    } | null
    if (!active) return
    if (active.isEditing && typeof active.exitEditing === 'function') {
      active.exitEditing()

      fabricCanvas.requestRenderAll()
    }
  }

  // ─── 등록 ────────────────────────────────────────────────────────

  fabricCanvas.on('mouse:dblclick', onDblClick)

  // Esc 는 DOM 이벤트 (canvas element 에서 수신)

  const canvasEl: HTMLElement | null = fabricCanvas.getElement?.() as HTMLElement | null
  if (canvasEl) {
    canvasEl.addEventListener('keydown', onKeyDown)
  }

  return () => {
    _disposed = true

    fabricCanvas.off('mouse:dblclick', onDblClick)
    if (canvasEl) {
      canvasEl.removeEventListener('keydown', onKeyDown)
    }
  }
}
