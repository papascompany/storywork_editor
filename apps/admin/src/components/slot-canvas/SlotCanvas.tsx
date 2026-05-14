'use client'

/**
 * SlotCanvas — 슬롯 정의 편집기
 *
 * SVG 기반 캔버스. fabric.js 금지 — 단순 좌표 데이터만.
 * - 빈 영역 드래그 → 새 슬롯 그리기
 * - 슬롯 클릭 → 선택
 * - 선택된 슬롯 드래그 → 이동
 * - 선택된 슬롯 모서리 핸들 8개 → 리사이즈
 * - Delete/Backspace 키 → 슬롯 삭제
 * - Esc → 선택 해제
 */

import * as React from 'react'

import type { Slot, SlotKind } from '../../lib/schemas/template'
import { SLOT_KIND_COLORS } from '../../lib/schemas/template'

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface FormatSpec {
  widthMm: number
  heightMm: number
  bleedMm: number
  safeMm: number
}

export interface SlotCanvasProps {
  format: FormatSpec
  slots: Slot[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChange: (next: Slot[]) => void
  showGrid?: boolean
  readonly?: boolean
  className?: string
}

// ─── 상수 ────────────────────────────────────────────────────────────────────

const HANDLE_SIZE = 8
const MIN_SLOT_SIZE = 0.02 // 최소 2%

type HandleDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const HANDLE_DIRS: HandleDir[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

// ─── 핸들 위치 계산 ───────────────────────────────────────────────────────────

function getHandlePositions(
  slot: Slot,
  canvasW: number,
  canvasH: number,
): Record<HandleDir, { cx: number; cy: number }> {
  const x = slot.x * canvasW
  const y = slot.y * canvasH
  const w = slot.w * canvasW
  const h = slot.h * canvasH
  return {
    nw: { cx: x, cy: y },
    n: { cx: x + w / 2, cy: y },
    ne: { cx: x + w, cy: y },
    e: { cx: x + w, cy: y + h / 2 },
    se: { cx: x + w, cy: y + h },
    s: { cx: x + w / 2, cy: y + h },
    sw: { cx: x, cy: y + h },
    w: { cx: x, cy: y + h / 2 },
  }
}

// ─── 커서 ────────────────────────────────────────────────────────────────────

const HANDLE_CURSORS: Record<HandleDir, string> = {
  nw: 'nw-resize',
  n: 'n-resize',
  ne: 'ne-resize',
  e: 'e-resize',
  se: 'se-resize',
  s: 's-resize',
  sw: 'sw-resize',
  w: 'w-resize',
}

// ─── SlotCanvas ───────────────────────────────────────────────────────────────

export function SlotCanvas({
  format,
  slots,
  selectedId,
  onSelect,
  onChange,
  showGrid = false,
  readonly = false,
  className,
}: SlotCanvasProps) {
  const svgRef = React.useRef<SVGSVGElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // 캔버스 픽셀 크기 (비율 유지하면서 컨테이너에 맞춤)
  const [canvasSize, setCanvasSize] = React.useState({ w: 400, h: 600 })

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect()
      const containerW = rect.width
      const containerH = rect.height || 600
      const aspectRatio = format.widthMm / format.heightMm
      let w = containerW
      let h = w / aspectRatio
      if (h > containerH) {
        h = containerH
        w = h * aspectRatio
      }
      setCanvasSize({ w: Math.floor(w), h: Math.floor(h) })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [format.widthMm, format.heightMm])

  const { w: canvasW, h: canvasH } = canvasSize

  // 정규화 좌표 ↔ 픽셀 변환
  const toPixel = React.useCallback(
    (nx: number, ny: number) => ({ px: nx * canvasW, py: ny * canvasH }),
    [canvasW, canvasH],
  )
  const toNorm = React.useCallback(
    (px: number, py: number) => ({ nx: px / canvasW, ny: py / canvasH }),
    [canvasW, canvasH],
  )

  // ── 드래그 상태 ──────────────────────────────────────────────────────────────
  type DragMode =
    | { type: 'none' }
    | { type: 'drawing'; startNx: number; startNy: number }
    | { type: 'moving'; slotId: string; startNx: number; startNy: number; origSlot: Slot }
    | {
        type: 'resizing'
        slotId: string
        dir: HandleDir
        origSlot: Slot
        startNx: number
        startNy: number
      }

  const dragRef = React.useRef<DragMode>({ type: 'none' })
  const [drawing, setDrawing] = React.useState<{
    x: number
    y: number
    w: number
    h: number
  } | null>(null)

  // ── SVG 좌표 변환 ────────────────────────────────────────────────────────────
  const getSvgPoint = React.useCallback(
    (e: React.MouseEvent | React.TouchEvent): { px: number; py: number } => {
      const svg = svgRef.current
      if (!svg) return { px: 0, py: 0 }
      const rect = svg.getBoundingClientRect()
      const clientX = 'touches' in e ? (e.touches[0]?.clientX ?? 0) : e.clientX
      const clientY = 'touches' in e ? (e.touches[0]?.clientY ?? 0) : e.clientY
      return {
        px: clientX - rect.left,
        py: clientY - rect.top,
      }
    },
    [],
  )

  // ── 새 슬롯 ID 생성 ──────────────────────────────────────────────────────────
  const newSlotId = React.useCallback(() => {
    return `slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  }, [])

  // ── SVG 포인터 다운 ──────────────────────────────────────────────────────────
  const handleSvgPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (readonly) return
      // 슬롯/핸들 위에서 클릭이면 무시 (각자 처리)
      if ((e.target as SVGElement).closest('[data-slot-id]')) return
      if ((e.target as SVGElement).closest('[data-handle]')) return

      e.currentTarget.setPointerCapture(e.pointerId)
      onSelect(null)
      const { px, py } = getSvgPoint(e)
      const { nx, ny } = toNorm(px, py)
      dragRef.current = { type: 'drawing', startNx: nx, startNy: ny }
      setDrawing({ x: px, y: py, w: 0, h: 0 })
    },
    [readonly, getSvgPoint, toNorm, onSelect],
  )

  // ── 슬롯 포인터 다운 ─────────────────────────────────────────────────────────
  const handleSlotPointerDown = React.useCallback(
    (e: React.PointerEvent, slot: Slot) => {
      if (readonly) return
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      onSelect(slot.id)
      const { px, py } = getSvgPoint(e)
      const { nx, ny } = toNorm(px, py)
      dragRef.current = {
        type: 'moving',
        slotId: slot.id,
        startNx: nx,
        startNy: ny,
        origSlot: { ...slot },
      }
    },
    [readonly, getSvgPoint, toNorm, onSelect],
  )

  // ── 핸들 포인터 다운 ─────────────────────────────────────────────────────────
  const handleResizePointerDown = React.useCallback(
    (e: React.PointerEvent, slot: Slot, dir: HandleDir) => {
      if (readonly) return
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      const { px, py } = getSvgPoint(e)
      const { nx, ny } = toNorm(px, py)
      dragRef.current = {
        type: 'resizing',
        slotId: slot.id,
        dir,
        origSlot: { ...slot },
        startNx: nx,
        startNy: ny,
      }
    },
    [readonly, getSvgPoint, toNorm],
  )

  // ── 포인터 이동 ──────────────────────────────────────────────────────────────
  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (readonly) return
      const drag = dragRef.current
      if (drag.type === 'none') return

      const { px, py } = getSvgPoint(e)
      const { nx, ny } = toNorm(px, py)

      if (drag.type === 'drawing') {
        const x = Math.min(drag.startNx, nx)
        const y = Math.min(drag.startNy, ny)
        const w = Math.abs(nx - drag.startNx)
        const h = Math.abs(ny - drag.startNy)
        setDrawing({
          x: toPixel(x, y).px,
          y: toPixel(x, y).py,
          w: w * canvasW,
          h: h * canvasH,
        })
      } else if (drag.type === 'moving') {
        const dx = nx - drag.startNx
        const dy = ny - drag.startNy
        const orig = drag.origSlot
        const newX = Math.max(0, Math.min(1 - orig.w, orig.x + dx))
        const newY = Math.max(0, Math.min(1 - orig.h, orig.y + dy))
        onChange(slots.map((s) => (s.id === drag.slotId ? { ...s, x: newX, y: newY } : s)))
      } else if (drag.type === 'resizing') {
        const dx = nx - drag.startNx
        const dy = ny - drag.startNy
        const orig = drag.origSlot
        let { x, y, w, h } = orig
        const dir = drag.dir

        if (dir.includes('w')) {
          x = orig.x + dx
          w = orig.w - dx
        }
        if (dir.includes('e')) {
          w = orig.w + dx
        }
        if (dir.includes('n')) {
          y = orig.y + dy
          h = orig.h - dy
        }
        if (dir.includes('s')) {
          h = orig.h + dy
        }

        // 최소 크기 보장
        if (w < MIN_SLOT_SIZE) {
          if (dir.includes('w')) x = orig.x + orig.w - MIN_SLOT_SIZE
          w = MIN_SLOT_SIZE
        }
        if (h < MIN_SLOT_SIZE) {
          if (dir.includes('n')) y = orig.y + orig.h - MIN_SLOT_SIZE
          h = MIN_SLOT_SIZE
        }

        // 캔버스 범위 클램프
        x = Math.max(0, x)
        y = Math.max(0, y)
        if (x + w > 1) w = 1 - x
        if (y + h > 1) h = 1 - y

        onChange(slots.map((s) => (s.id === drag.slotId ? { ...s, x, y, w, h } : s)))
      }
    },
    [readonly, getSvgPoint, toNorm, toPixel, canvasW, canvasH, slots, onChange],
  )

  // ── 포인터 업 ────────────────────────────────────────────────────────────────
  const handlePointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (readonly) return
      const drag = dragRef.current

      if (drag.type === 'drawing') {
        const { px, py } = getSvgPoint(e)
        const { nx, ny } = toNorm(px, py)
        const x = Math.max(0, Math.min(drag.startNx, nx))
        const y = Math.max(0, Math.min(drag.startNy, ny))
        const w = Math.abs(nx - drag.startNx)
        const h = Math.abs(ny - drag.startNy)

        if (w >= MIN_SLOT_SIZE && h >= MIN_SLOT_SIZE) {
          const newSlot: Slot = {
            id: newSlotId(),
            kind: 'pose',
            x: Math.max(0, Math.min(1 - w, x)),
            y: Math.max(0, Math.min(1 - h, y)),
            w: Math.min(1, w),
            h: Math.min(1, h),
            rotation: 0,
            preferredTags: [],
            locked: false,
          }
          const nextSlots = [...slots, newSlot]
          onChange(nextSlots)
          onSelect(newSlot.id)
        }
        setDrawing(null)
      }

      dragRef.current = { type: 'none' }
    },
    [readonly, getSvgPoint, toNorm, slots, onChange, onSelect, newSlotId],
  )

  // ── 키보드 이벤트 ────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (readonly) return

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        onChange(slots.filter((s) => s.id !== selectedId))
        onSelect(null)
      } else if (e.key === 'Escape') {
        onSelect(null)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [readonly, selectedId, slots, onChange, onSelect])

  // ── 그리드 선 ────────────────────────────────────────────────────────────────
  const gridLines = React.useMemo(() => {
    if (!showGrid) return null
    const lines: React.ReactNode[] = []
    const step = 0.1
    for (let i = 1; i < 10; i++) {
      lines.push(
        <line
          key={`v${i}`}
          x1={i * step * canvasW}
          y1={0}
          x2={i * step * canvasW}
          y2={canvasH}
          stroke="var(--mkt-hairline)"
          strokeWidth={0.5}
          strokeDasharray="4 4"
        />,
        <line
          key={`h${i}`}
          x1={0}
          y1={i * step * canvasH}
          x2={canvasW}
          y2={i * step * canvasH}
          stroke="var(--mkt-hairline)"
          strokeWidth={0.5}
          strokeDasharray="4 4"
        />,
      )
    }
    return lines
  }, [showGrid, canvasW, canvasH])

  // ── bleed / safe 가이드 ──────────────────────────────────────────────────────
  const bleedNx = format.bleedMm / format.widthMm
  const bleedNy = format.bleedMm / format.heightMm
  const safeNx = format.safeMm / format.widthMm
  const safeNy = format.safeMm / format.heightMm

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden flex items-center justify-center ${className ?? ''}`}
      style={{ minHeight: 300, backgroundColor: 'var(--mkt-surface-soft)' }}
    >
      <svg
        ref={svgRef}
        width={canvasW}
        height={canvasH}
        viewBox={`0 0 ${canvasW} ${canvasH}`}
        style={{
          touchAction: 'none',
          cursor: readonly ? 'default' : 'crosshair',
          display: 'block',
        }}
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        aria-label="슬롯 캔버스"
        role="application"
      >
        {/* 흰 배경 */}
        <rect x={0} y={0} width={canvasW} height={canvasH} fill="white" />

        {/* 그리드 */}
        {gridLines}

        {/* bleed 가이드 (붉은 점선) */}
        <rect
          x={bleedNx * canvasW}
          y={bleedNy * canvasH}
          width={(1 - bleedNx * 2) * canvasW}
          height={(1 - bleedNy * 2) * canvasH}
          fill="none"
          stroke="#ef4444"
          strokeWidth={1}
          strokeDasharray="6 3"
          opacity={0.5}
        />

        {/* safe 가이드 (회색 점선) */}
        <rect
          x={safeNx * canvasW}
          y={safeNy * canvasH}
          width={(1 - safeNx * 2) * canvasW}
          height={(1 - safeNy * 2) * canvasH}
          fill="none"
          stroke="#9ca3af"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.5}
        />

        {/* 슬롯들 */}
        {slots.map((slot) => {
          const isSelected = slot.id === selectedId
          const color = SLOT_KIND_COLORS[slot.kind as SlotKind] ?? '#6b7280'
          const px = slot.x * canvasW
          const py = slot.y * canvasH
          const pw = slot.w * canvasW
          const ph = slot.h * canvasH
          const handles = isSelected ? getHandlePositions(slot, canvasW, canvasH) : null

          return (
            <g key={slot.id} data-slot-id={slot.id}>
              {/* 슬롯 직사각형 */}
              <rect
                x={px}
                y={py}
                width={pw}
                height={ph}
                fill={color}
                fillOpacity={isSelected ? 0.25 : 0.15}
                stroke={color}
                strokeWidth={isSelected ? 2 : 1.5}
                strokeDasharray={slot.locked ? '6 3' : undefined}
                rx={2}
                style={{ cursor: readonly ? 'default' : 'move' }}
                onPointerDown={(e) => handleSlotPointerDown(e, slot)}
              />
              {/* kind 레이블 */}
              <text
                x={px + pw / 2}
                y={py + ph / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={Math.min(12, pw * 0.15, ph * 0.2)}
                fill={color}
                fillOpacity={0.8}
                pointerEvents="none"
                style={{ userSelect: 'none' }}
              >
                {slot.kind}
              </text>
              {/* hint 레이블 */}
              {slot.hint && ph > 30 && (
                <text
                  x={px + pw / 2}
                  y={py + ph / 2 + Math.min(12, pw * 0.15, ph * 0.2) + 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min(10, pw * 0.12)}
                  fill={color}
                  fillOpacity={0.6}
                  pointerEvents="none"
                  style={{ userSelect: 'none' }}
                >
                  {slot.hint}
                </text>
              )}

              {/* 리사이즈 핸들 (선택된 슬롯만) */}
              {isSelected &&
                handles &&
                !readonly &&
                HANDLE_DIRS.map((dir) => {
                  const pos = handles[dir]
                  return (
                    <rect
                      key={dir}
                      data-handle={dir}
                      x={pos.cx - HANDLE_SIZE / 2}
                      y={pos.cy - HANDLE_SIZE / 2}
                      width={HANDLE_SIZE}
                      height={HANDLE_SIZE}
                      fill="white"
                      stroke={color}
                      strokeWidth={1.5}
                      rx={1}
                      style={{ cursor: HANDLE_CURSORS[dir] }}
                      onPointerDown={(e) => handleResizePointerDown(e, slot, dir)}
                    />
                  )
                })}
            </g>
          )
        })}

        {/* 드래그 중 그리기 미리보기 */}
        {drawing && drawing.w > 0 && drawing.h > 0 && (
          <rect
            x={drawing.x}
            y={drawing.y}
            width={drawing.w}
            height={drawing.h}
            fill="#6366f1"
            fillOpacity={0.15}
            stroke="#6366f1"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            rx={2}
            pointerEvents="none"
          />
        )}

        {/* 외곽 테두리 */}
        <rect
          x={0}
          y={0}
          width={canvasW}
          height={canvasH}
          fill="none"
          stroke="var(--mkt-hairline)"
          strokeWidth={1}
        />
      </svg>
    </div>
  )
}

SlotCanvas.displayName = 'SlotCanvas'
