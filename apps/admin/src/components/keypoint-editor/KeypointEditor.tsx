'use client'

/**
 * KeypointEditor — SVG 오버레이로 키포인트를 드래그/키보드 편집
 *
 * - SVG viewBox 0~1 (정규화 좌표 그대로)
 * - 드래그: pointer events (mouse + touch)
 * - 키보드: 방향키 1px씩, Shift+방향키 10px씩 (1000px 기준)
 * - 우클릭 → 키포인트 삭제
 * - 빈 자리 더블클릭 → 새 키포인트 추가 모달
 * - inferred=true 인 경우 점선 원으로 표시
 */

import { Button, cn } from '@storywork/ui'
import Image from 'next/image'
import * as React from 'react'

import { KP_NAMES, type KPName, type Keypoint } from '../../lib/schemas/resource'

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface KeypointEditorProps {
  imageUrl: string
  width: number
  height: number
  keypoints: Keypoint[]
  onChange: (next: Keypoint[]) => void
  readonly?: boolean
}

// ─── 키포인트 색상 매핑 ────────────────────────────────────────────────────────

const KP_COLORS: Record<KPName, string> = {
  head: '#ef4444',
  mouth: '#f97316',
  center: '#3b82f6',
  'left-shoulder': '#8b5cf6',
  'right-shoulder': '#a855f7',
  'left-hand': '#10b981',
  'right-hand': '#14b8a6',
  'left-foot': '#f59e0b',
  'right-foot': '#eab308',
  waist: '#ec4899',
}

const KP_LABELS: Record<KPName, string> = {
  head: '머리',
  mouth: '입',
  center: '중심',
  'left-shoulder': '왼어깨',
  'right-shoulder': '오른어깨',
  'left-hand': '왼손',
  'right-hand': '오른손',
  'left-foot': '왼발',
  'right-foot': '오른발',
  waist: '허리',
}

// ─── 새 키포인트 추가 모달 ───────────────────────────────────────────────────

interface AddKpModalProps {
  open: boolean
  existingNames: KPName[]
  onAdd: (name: KPName) => void
  onClose: () => void
}

function AddKpModal({ open, existingNames, onAdd, onClose }: AddKpModalProps) {
  const available = KP_NAMES.filter((n) => !existingNames.includes(n))

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="키포인트 추가"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-6 shadow-xl min-w-[260px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-[var(--color-text)] mb-4">키포인트 추가</h3>
        {available.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            추가할 수 있는 키포인트가 없습니다.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {available.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onAdd(name)}
                className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-sm text-left hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
              >
                <span
                  className="size-3 rounded-full shrink-0"
                  style={{ backgroundColor: KP_COLORS[name] }}
                />
                {KP_LABELS[name]} ({name})
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            취소
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── KeypointEditor 본체 ──────────────────────────────────────────────────────

export function KeypointEditor({
  imageUrl,
  width,
  height,
  keypoints,
  onChange,
  readonly = false,
}: KeypointEditorProps) {
  const svgRef = React.useRef<SVGSVGElement>(null)
  const [draggingName, setDraggingName] = React.useState<KPName | null>(null)
  const [focusedName, setFocusedName] = React.useState<KPName | null>(null)
  const [addModalOpen, setAddModalOpen] = React.useState(false)
  const [pendingPosition, setPendingPosition] = React.useState<{ x: number; y: number } | null>(
    null,
  )
  const [contextMenu, setContextMenu] = React.useState<{
    x: number
    y: number
    name: KPName
  } | null>(null)

  const existingNames = keypoints.map((kp) => kp.name)

  // SVG 클라이언트 좌표 → 정규화 좌표 (0..1)
  const toNormalized = React.useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }
      const rect = svg.getBoundingClientRect()
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
      return { x, y }
    },
    [],
  )

  const updateKeypoint = React.useCallback(
    (name: KPName, pos: { x: number; y: number }) => {
      onChange(
        keypoints.map((kp) =>
          kp.name === name ? { ...kp, x: pos.x, y: pos.y, inferred: false } : kp,
        ),
      )
    },
    [keypoints, onChange],
  )

  // ── pointer 이벤트 핸들러 ──

  const handlePointerDown = React.useCallback(
    (name: KPName, e: React.PointerEvent) => {
      if (readonly) return
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      setDraggingName(name)
      setFocusedName(name)
    },
    [readonly],
  )

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent<SVGElement>) => {
      if (!draggingName || readonly) return
      const pos = toNormalized(e.clientX, e.clientY)
      updateKeypoint(draggingName, pos)
    },
    [draggingName, readonly, toNormalized, updateKeypoint],
  )

  const handlePointerUp = React.useCallback(() => {
    setDraggingName(null)
  }, [])

  // ── 더블클릭 → 추가 모달 ──

  const handleSvgDoubleClick = React.useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (readonly) return
      const pos = toNormalized(e.clientX, e.clientY)
      setPendingPosition(pos)
      setAddModalOpen(true)
    },
    [readonly, toNormalized],
  )

  // ── 우클릭 → 삭제 컨텍스트 메뉴 ──

  const handleKpContextMenu = React.useCallback(
    (name: KPName, e: React.MouseEvent) => {
      if (readonly) return
      e.preventDefault()
      setContextMenu({ x: e.clientX, y: e.clientY, name })
    },
    [readonly],
  )

  // ── 키보드 핸들러 (방향키로 1px 이동, Shift+방향키 10px) ──
  const STEP = 1 / 1000
  const STEP_BIG = 10 / 1000

  const handleKpKeyDown = React.useCallback(
    (name: KPName, e: React.KeyboardEvent) => {
      if (readonly) return
      const step = e.shiftKey ? STEP_BIG : STEP
      const kp = keypoints.find((k) => k.name === name)
      if (!kp) return

      let nx = kp.x
      let ny = kp.y

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        nx = Math.max(0, nx - step)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        nx = Math.min(1, nx + step)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        ny = Math.max(0, ny - step)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        ny = Math.min(1, ny + step)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        onChange(keypoints.filter((k) => k.name !== name))
        setFocusedName(null)
        return
      } else return

      updateKeypoint(name, { x: nx, y: ny })
    },
    [readonly, keypoints, onChange, updateKeypoint],
  )

  // ── 컨텍스트 메뉴 닫기 ──
  React.useEffect(() => {
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  return (
    <div className="relative flex flex-col gap-3">
      {/* SVG 오버레이 */}
      <div
        className="relative w-full"
        style={{ aspectRatio: width > 0 && height > 0 ? `${width}/${height}` : '1/1' }}
      >
        <Image
          src={imageUrl}
          alt="리소스 이미지"
          fill
          sizes="(max-width: 1280px) 100vw, 800px"
          className="object-contain"
          draggable={false}
        />
        <svg
          ref={svgRef}
          className={cn(
            'absolute inset-0 w-full h-full',
            !readonly && 'cursor-crosshair',
            draggingName && 'cursor-grabbing',
          )}
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleSvgDoubleClick}
          aria-label="키포인트 편집 영역"
          role="application"
        >
          {keypoints.map((kp) => {
            const color = KP_COLORS[kp.name] ?? '#6366f1'
            const isFocused = focusedName === kp.name
            const isDragging = draggingName === kp.name

            return (
              <g key={kp.name} aria-label={`키포인트: ${KP_LABELS[kp.name]}`}>
                {/* 외곽 원 (inferred: 점선) */}
                <circle
                  cx={kp.x}
                  cy={kp.y}
                  r={0.025}
                  fill="transparent"
                  stroke={color}
                  strokeWidth={kp.inferred ? 0.004 : 0.005}
                  strokeDasharray={kp.inferred ? '0.012 0.008' : undefined}
                  className={cn(!readonly && 'cursor-grab', isDragging && 'cursor-grabbing')}
                  onPointerDown={(e) =>
                    handlePointerDown(kp.name, e as unknown as React.PointerEvent)
                  }
                  onContextMenu={(e) =>
                    handleKpContextMenu(kp.name, e as unknown as React.MouseEvent)
                  }
                  onKeyDown={(e) => handleKpKeyDown(kp.name, e as unknown as React.KeyboardEvent)}
                  onFocus={() => setFocusedName(kp.name)}
                  tabIndex={readonly ? undefined : 0}
                  role={readonly ? undefined : 'button'}
                  aria-label={`${KP_LABELS[kp.name]} 키포인트${kp.inferred ? ' (추정)' : ''}`}
                  style={{
                    outline: isFocused ? `2px solid ${color}` : undefined,
                    filter: isFocused ? `drop-shadow(0 0 4px ${color})` : undefined,
                  }}
                />
                {/* 중심 점 */}
                <circle cx={kp.x} cy={kp.y} r={0.008} fill={color} pointerEvents="none" />
                {/* 라벨 */}
                <text
                  x={kp.x + 0.03}
                  y={kp.y + 0.01}
                  fontSize={0.03}
                  fill={color}
                  style={{ userSelect: 'none', fontFamily: 'sans-serif' }}
                  pointerEvents="none"
                >
                  {KP_LABELS[kp.name]}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-2 text-xs text-[var(--color-text-muted)]">
        {keypoints.map((kp) => (
          <span key={kp.name} className="flex items-center gap-1">
            <span
              className={cn(
                'size-2.5 rounded-full shrink-0',
                kp.inferred && 'border border-dashed',
              )}
              style={{
                backgroundColor: KP_COLORS[kp.name],
                borderColor: kp.inferred ? KP_COLORS[kp.name] : undefined,
              }}
            />
            {KP_LABELS[kp.name]}
            {kp.inferred && <span className="text-[var(--color-text-disabled)]">(추정)</span>}
          </span>
        ))}
      </div>

      {!readonly && (
        <p className="text-xs text-[var(--color-text-muted)]">
          드래그로 이동 · 방향키로 미세 조정 · 더블클릭으로 추가 · 우클릭/Delete 로 삭제
        </p>
      )}

      {/* 추가 모달 */}
      <AddKpModal
        open={addModalOpen}
        existingNames={existingNames}
        onAdd={(name) => {
          const pos = pendingPosition ?? { x: 0.5, y: 0.5 }
          onChange([...keypoints, { name, x: pos.x, y: pos.y, inferred: false }])
          setAddModalOpen(false)
          setPendingPosition(null)
        }}
        onClose={() => {
          setAddModalOpen(false)
          setPendingPosition(null)
        }}
      />

      {/* 우클릭 컨텍스트 메뉴 */}
      {contextMenu && (
        <div
          role="menu"
          aria-label="키포인트 메뉴"
          className="fixed z-50 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-lg py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            role="menuitem"
            type="button"
            className="w-full px-4 py-2 text-sm text-left text-[var(--color-error-500)] hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:bg-[var(--color-surface-muted)]"
            onClick={() => {
              onChange(keypoints.filter((k) => k.name !== contextMenu.name))
              setContextMenu(null)
            }}
          >
            {KP_LABELS[contextMenu.name]} 삭제
          </button>
        </div>
      )}

      {/* keypoints position: absolute to percentage (for display below image) */}
      {keypoints.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {keypoints.map((kp) => (
            <div
              key={kp.name}
              className="flex items-center gap-2 px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] text-xs"
            >
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: KP_COLORS[kp.name] }}
              />
              <span className="text-[var(--color-text-muted)] min-w-[3.5rem]">
                {KP_LABELS[kp.name]}
              </span>
              <span className="tabular-nums text-[var(--color-text)] ml-auto">
                ({(kp.x * 100).toFixed(1)}%, {(kp.y * 100).toFixed(1)}%)
              </span>
              {kp.inferred && (
                <span className="text-[var(--color-warning-500)]" title="자동 추정값">
                  ~
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

KeypointEditor.displayName = 'KeypointEditor'
