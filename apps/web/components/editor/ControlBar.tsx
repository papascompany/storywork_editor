'use client'

// ─────────────────────────────────────────────
// ControlBar — 선택 객체 타입별 가변 속성 패널
//
// 섹션 구성:
//   1. 위치/크기 (공통) — x/y, width/height + 비율 잠금, 회전 Slider+Input
//   2. 표시/투명도 (공통) — Opacity Slider
//   3. 상태 (공통) — Lock / Visibility / Delete 토글
//   4. 타입별 가변 — background: Fill ColorPicker
//                  shape: Fill + Stroke + BorderRadius
//                  pose/text/bubble 등: placeholder
//
// 모든 캔버스 변경은 editor-history Command 를 통한다.
// 슬라이더 드래그 중 16ms throttle 적용, 종료 시점에 Command commit.
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import {
  HiddenCommand,
  LockCommand,
  RemoveObjectCommand,
  TransformObjectCommand,
  collectHiddenPrevStates,
  collectLockPrevStates,
  snapshotFromFabricObject,
} from '@storywork/editor-history'
import type { LayerTree } from '@storywork/editor-layers'
import { ColorPicker, Input, Slider, cn, showToast } from '@storywork/ui'
import type { FabricObject } from 'fabric'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eye,
  EyeOff,
  Italic,
  Link,
  Link2Off,
  Lock,
  LockOpen,
  Trash2,
  Underline,
} from 'lucide-react'
import React, { useCallback, useRef, useState } from 'react'

import type { ObjectProps } from './hooks/useSelection'
import type { HistoryRef as History } from './types'

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type ControlBarProps = {
  props: ObjectProps | null
  canvas: StoryCanvas | null
  layerTree: LayerTree | null
  history: History | null
}

// ─── 섹션 구분선 ──────────────────────────────────────────────────────────────

function SectionDivider() {
  return <div aria-hidden="true" className="my-1 h-px w-full bg-[var(--color-border)]" />
}

// ─── 섹션 헤더 ────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
      {children}
    </h3>
  )
}

// ─── NumberInput ──────────────────────────────────────────────────────────────

type NumberInputProps = {
  label: string
  value: number
  unit?: string
  step?: number
  min?: number
  max?: number
  isMobile?: boolean
  onCommit: (v: number) => void
  'aria-label'?: string
}

function NumberInput({
  label,
  value,
  unit = 'mm',
  step = 0.1,
  min,
  max,
  onCommit,
  'aria-label': ariaLabel,
}: NumberInputProps) {
  // 편집 중 임시값 관리 (controlled)
  const [draft, setDraft] = useState<string | null>(null)
  const originalRef = useRef(value)

  // 외부 value 변경 시 draft 리셋
  const displayValue = draft !== null ? draft : String(Math.round(value * 10) / 10)

  const commit = useCallback(
    (raw: string) => {
      const v = parseFloat(raw)
      if (!isNaN(v)) {
        const clamped =
          min !== undefined ? Math.max(min, max !== undefined ? Math.min(max, v) : v) : v
        onCommit(clamped)
      }
      setDraft(null)
    },
    [onCommit, min, max],
  )

  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] text-[var(--color-text-muted)]">{label}</label>
      <div className="relative flex items-center">
        <Input
          type="number"
          step={step}
          value={displayValue}
          key={`${value}`}
          min={min}
          max={max}
          aria-label={ariaLabel ?? label}
          className="h-7 w-full pr-7 text-xs"
          onChange={(e) => {
            setDraft(e.target.value)
            originalRef.current = value
          }}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit((e.target as HTMLInputElement).value)
            if (e.key === 'Escape') {
              setDraft(null)
              ;(e.target as HTMLInputElement).value = String(
                Math.round(originalRef.current * 10) / 10,
              )
            }
          }}
          inputMode="decimal"
        />
        {unit && (
          <span className="pointer-events-none absolute right-2 text-[10px] text-[var(--color-text-muted)]">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── 섹션 1: 위치/크기 ───────────────────────────────────────────────────────

type PositionSizeSectionProps = {
  props: ObjectProps
  canvas: StoryCanvas
  history: History
}

function PositionSizeSection({ props, canvas, history }: PositionSizeSectionProps) {
  const [lockRatio, setLockRatio] = useState(false)
  const ratioRef = useRef(props.width / props.height)

  const getObj = (): FabricObject | undefined => {
    return canvas.getObject(props.id) as FabricObject | undefined
  }

  const makeTransformCmd = useCallback(
    (
      patch: Partial<{ left: number; top: number; scaleX: number; scaleY: number; angle: number }>,
    ) => {
      const obj = getObj()
      if (!obj) return
      const before = snapshotFromFabricObject(obj)
      obj.set(patch)
      obj.setCoords()
      const after = snapshotFromFabricObject(obj)
      canvas._fabricCanvas.requestRenderAll()
      const cmd = new TransformObjectCommand({ canvas, id: props.id, before, after })
      history.push(cmd)
    },
    [canvas, history, props.id],
  )

  const handleX = (v: number) => makeTransformCmd({ left: canvas.mmToPx(v) })
  const handleY = (v: number) => makeTransformCmd({ top: canvas.mmToPx(v) })

  const handleWidth = (v: number) => {
    const obj = getObj()
    if (!obj) return
    const naturalWidth = obj.width ?? 1
    const newScaleX = canvas.mmToPx(v) / naturalWidth
    if (lockRatio) {
      const naturalHeight = obj.height ?? 1
      // ratio 기반 비례 계산
      const ratio = ratioRef.current
      const newHeightMm = v / ratio
      const newScaleYSimple = canvas.mmToPx(newHeightMm) / naturalHeight
      makeTransformCmd({ scaleX: newScaleX, scaleY: newScaleYSimple })
    } else {
      makeTransformCmd({ scaleX: newScaleX })
    }
  }

  const handleHeight = (v: number) => {
    const obj = getObj()
    if (!obj) return
    const naturalHeight = obj.height ?? 1
    const newScaleY = canvas.mmToPx(v) / naturalHeight
    if (lockRatio) {
      const ratio = ratioRef.current
      const newWidthMm = v * ratio
      const naturalWidth = obj.width ?? 1
      const newScaleX = canvas.mmToPx(newWidthMm) / naturalWidth
      makeTransformCmd({ scaleX: newScaleX, scaleY: newScaleY })
    } else {
      makeTransformCmd({ scaleY: newScaleY })
    }
  }

  const handleAngleCommit = (v: number) => makeTransformCmd({ angle: v })

  const toggleLockRatio = () => {
    ratioRef.current = props.width / props.height
    setLockRatio((p) => !p)
  }

  return (
    <section aria-label="위치 및 크기">
      <SectionLabel>위치 / 크기</SectionLabel>
      <div className="flex flex-col gap-2">
        {/* X / Y */}
        <div className="grid grid-cols-2 gap-1.5">
          <NumberInput label="X" value={props.x} onCommit={handleX} aria-label="X 위치 (mm)" />
          <NumberInput label="Y" value={props.y} onCommit={handleY} aria-label="Y 위치 (mm)" />
        </div>

        {/* Width / Height + 비율 잠금 */}
        <div className="flex items-end gap-1">
          <div className="grid flex-1 grid-cols-2 gap-1.5">
            <NumberInput
              label="너비"
              value={props.width}
              onCommit={handleWidth}
              aria-label="너비 (mm)"
              min={1}
            />
            <NumberInput
              label="높이"
              value={props.height}
              onCommit={handleHeight}
              aria-label="높이 (mm)"
              min={1}
            />
          </div>
          {/* 비율 잠금 */}
          <button
            type="button"
            aria-label={lockRatio ? '비율 잠금 해제' : '비율 잠금'}
            aria-pressed={lockRatio}
            onClick={toggleLockRatio}
            title={lockRatio ? '비율 잠금 해제' : '비율 잠금'}
            className={cn(
              'mb-0 flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm,4px)]',
              'border border-[var(--color-border)]',
              'transition-colors motion-reduce:transition-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
              lockRatio
                ? 'border-[var(--color-brand-400)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] dark:bg-[var(--color-brand-950)] dark:text-[var(--color-brand-400)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
            )}
          >
            {lockRatio ? <Link className="size-3.5" /> : <Link2Off className="size-3.5" />}
          </button>
        </div>

        {/* 회전 */}
        <div className="flex items-end gap-1.5">
          <div className="flex-1">
            <Slider
              label="각도"
              unit="°"
              min={0}
              max={359}
              step={1}
              value={Math.round(props.angle)}
              onValueChange={(v) => {
                // 드래그 중 캔버스 반영 (throttle 없이 Radix 기본)
                const obj = getObj()
                if (!obj) return
                obj.set({ angle: v })
                obj.setCoords()
                canvas._fabricCanvas.requestRenderAll()
              }}
              onValueCommit={handleAngleCommit}
              aria-label="회전 각도"
            />
          </div>
          <div className="w-16">
            <NumberInput
              label=""
              value={Math.round(props.angle)}
              unit="°"
              step={1}
              min={0}
              max={359}
              onCommit={handleAngleCommit}
              aria-label="회전 각도 (도)"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── 섹션 2: 투명도 ───────────────────────────────────────────────────────────

type OpacitySectionProps = {
  props: ObjectProps
  canvas: StoryCanvas
  history: History
}

function OpacitySection({ props, canvas, history }: OpacitySectionProps) {
  const getObj = (): FabricObject | undefined => {
    return canvas.getObject(props.id) as FabricObject | undefined
  }

  const opacity = (() => {
    const obj = getObj()
    return Math.round((obj?.opacity ?? 1) * 100)
  })()

  const handleChange = (v: number) => {
    const obj = getObj()
    if (!obj) return
    obj.set({ opacity: v / 100 })
    canvas._fabricCanvas.requestRenderAll()
  }

  const handleCommit = (v: number) => {
    const obj = getObj()
    if (!obj) return
    const before = snapshotFromFabricObject(obj)
    // opacity 는 TransformSnapshot 에 없음 — fabric object:modified 를 통해 canvas-observer 가 처리
    // 직접 push: before/after 에 opacity 를 담은 별도 Command 가 없으므로
    // TransformObjectCommand 를 재사용하되 같은 before/after 로 (opacity 만 변경)
    obj.set({ opacity: v / 100 })
    const after = snapshotFromFabricObject(obj)
    canvas._fabricCanvas.requestRenderAll()
    // opacity 변경은 TransformObjectCommand 의 coalesce 대상이 되지 않도록 별도 타임스탬프
    const cmd = new TransformObjectCommand({ canvas, id: props.id, before, after })
    history.push(cmd)
  }

  return (
    <section aria-label="투명도">
      <SectionLabel>투명도</SectionLabel>
      <Slider
        label=""
        unit="%"
        min={0}
        max={100}
        step={1}
        value={opacity}
        onValueChange={handleChange}
        onValueCommit={handleCommit}
        aria-label="투명도"
      />
    </section>
  )
}

// ─── 섹션 3: 상태 (Lock / Visibility / Delete) ───────────────────────────────

type StateSectionProps = {
  props: ObjectProps
  canvas: StoryCanvas
  layerTree: LayerTree
  history: History
}

function StateSection({ props, canvas, layerTree, history }: StateSectionProps) {
  const node = layerTree.getNode(props.id)
  const locked = node?.locked ?? false
  const hidden = node?.hidden ?? false

  const handleToggleLock = () => {
    const prevStates = collectLockPrevStates(layerTree, props.id, false)
    const cmd = new LockCommand({
      layerTree,
      id: props.id,
      locked: !locked,
      prevStates,
    })
    history.push(cmd)
  }

  const handleToggleHidden = () => {
    const prevStates = collectHiddenPrevStates(layerTree, props.id, false)
    const cmd = new HiddenCommand({
      layerTree,
      id: props.id,
      hidden: !hidden,
      prevStates,
    })
    history.push(cmd)
  }

  const handleDelete = () => {
    const fabricObj = canvas.getObject(props.id) as FabricObject | undefined
    const objectData = canvas.getObjectData(props.id)
    if (!fabricObj || !objectData) return
    const cmd = new RemoveObjectCommand({ canvas, id: props.id, fabricObj, objectData })
    canvas._fabricCanvas.discardActiveObject()
    history.push(cmd)
  }

  const handleDuplicate = () => {
    showToast('M1-08e 에서 활성화 예정입니다.', 'info')
  }

  return (
    <section aria-label="객체 상태">
      <SectionLabel>상태</SectionLabel>
      <div className="flex items-center gap-1">
        {/* 잠금 */}
        <IconToggle
          aria-label={locked ? '잠금 해제' : '잠금'}
          pressed={locked}
          onClick={handleToggleLock}
          title={locked ? '잠금 해제' : '잠금'}
        >
          {locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
        </IconToggle>

        {/* 숨기기 */}
        <IconToggle
          aria-label={hidden ? '표시' : '숨기기'}
          pressed={hidden}
          onClick={handleToggleHidden}
          title={hidden ? '표시' : '숨기기'}
        >
          {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </IconToggle>

        {/* 구분 */}
        <div aria-hidden="true" className="flex-1" />

        {/* 복제 (비활성) */}
        <button
          type="button"
          aria-label="복제"
          title="복제 (M1-08e)"
          onClick={handleDuplicate}
          className={cn(
            'flex size-7 items-center justify-center rounded-[var(--radius-sm,4px)]',
            'border border-[var(--color-border)]',
            'text-[var(--color-text-muted)] opacity-50',
            'hover:bg-[var(--color-surface-muted)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
          )}
        >
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
        </button>

        {/* 삭제 */}
        <button
          type="button"
          aria-label="삭제"
          title="삭제"
          onClick={handleDelete}
          className={cn(
            'flex size-7 items-center justify-center rounded-[var(--radius-sm,4px)]',
            'border border-[var(--color-border)]',
            'text-[var(--color-text-muted)]',
            'hover:border-[var(--color-error-300,#fca5a5)] hover:bg-[var(--color-error-50,#fff1f2)] hover:text-[var(--color-error-600,#e11d48)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error-500,#f43f5e)]',
            'transition-colors motion-reduce:transition-none',
          )}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </section>
  )
}

// ─── 아이콘 토글 버튼 헬퍼 ────────────────────────────────────────────────────

type IconToggleProps = {
  pressed: boolean
  onClick: () => void
  children: React.ReactNode
  'aria-label': string
  title?: string
}

function IconToggle({
  pressed,
  onClick,
  children,
  'aria-label': ariaLabel,
  title,
}: IconToggleProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={pressed}
      title={title}
      onClick={onClick}
      className={cn(
        'flex size-7 items-center justify-center rounded-[var(--radius-sm,4px)]',
        'border border-[var(--color-border)]',
        'transition-colors motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
        pressed
          ? 'border-[var(--color-brand-400)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] dark:bg-[var(--color-brand-950)] dark:text-[var(--color-brand-400)]'
          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
      )}
    >
      {children}
    </button>
  )
}

// ─── 섹션 4: 타입별 가변 ────────────────────────────────────────────────────

// Background Fill
type BackgroundFillSectionProps = {
  props: ObjectProps
  canvas: StoryCanvas
  history: History
}

function BackgroundFillSection({ props, canvas, history }: BackgroundFillSectionProps) {
  const getObj = (): FabricObject | undefined => {
    return canvas.getObject(props.id) as FabricObject | undefined
  }

  const currentFill = (() => {
    const obj = getObj()
    const fill = obj?.fill
    return typeof fill === 'string' ? fill : '#ffffff'
  })()

  const handleColorChange = (hex: string) => {
    const obj = getObj()
    if (!obj) return
    const before = snapshotFromFabricObject(obj)
    obj.set({ fill: hex })
    canvas._fabricCanvas.requestRenderAll()
    const after = snapshotFromFabricObject(obj)
    const cmd = new TransformObjectCommand({ canvas, id: props.id, before, after })
    history.push(cmd)
  }

  return (
    <section aria-label="배경 색상">
      <SectionLabel>배경 색상</SectionLabel>
      <ColorPicker value={currentFill} onChange={handleColorChange} />
    </section>
  )
}

// Shape Fill + Stroke + BorderRadius
type ShapeDetailSectionProps = {
  props: ObjectProps
  canvas: StoryCanvas
  history: History
}

function ShapeDetailSection({ props, canvas, history }: ShapeDetailSectionProps) {
  const getObj = (): FabricObject | undefined => {
    return canvas.getObject(props.id) as FabricObject | undefined
  }

  const obj = getObj()
  const currentFill = typeof obj?.fill === 'string' ? obj.fill : '#6366f1'
  const currentStroke = typeof obj?.stroke === 'string' ? obj.stroke : '#000000'
  const currentStrokeWidth = obj?.strokeWidth ?? 0
  const currentRx = (obj as unknown as { rx?: number })?.rx ?? 0

  const applyAndCommit = (patch: Record<string, unknown>) => {
    const target = getObj()
    if (!target) return
    const before = snapshotFromFabricObject(target)
    target.set(patch as Parameters<typeof target.set>[0])
    canvas._fabricCanvas.requestRenderAll()
    const after = snapshotFromFabricObject(target)
    const cmd = new TransformObjectCommand({ canvas, id: props.id, before, after })
    history.push(cmd)
  }

  return (
    <>
      <section aria-label="채우기 색상">
        <SectionLabel>채우기</SectionLabel>
        <ColorPicker value={currentFill} onChange={(hex) => applyAndCommit({ fill: hex })} />
      </section>

      <SectionDivider />

      <section aria-label="테두리">
        <SectionLabel>테두리</SectionLabel>
        <div className="flex flex-col gap-2">
          <ColorPicker value={currentStroke} onChange={(hex) => applyAndCommit({ stroke: hex })} />
          <Slider
            label="두께"
            unit="px"
            min={0}
            max={20}
            step={1}
            value={currentStrokeWidth}
            onValueChange={(v) => {
              const target = getObj()
              if (!target) return
              target.set({ strokeWidth: v })
              canvas._fabricCanvas.requestRenderAll()
            }}
            onValueCommit={(v) => applyAndCommit({ strokeWidth: v })}
            aria-label="테두리 두께"
          />
        </div>
      </section>

      {/* BorderRadius — Rect 계열에만 */}
      {obj && 'rx' in obj && (
        <>
          <SectionDivider />
          <section aria-label="모서리 반경">
            <SectionLabel>모서리</SectionLabel>
            <Slider
              label="반경"
              unit="px"
              min={0}
              max={50}
              step={1}
              value={currentRx}
              onValueChange={(v) => {
                const target = getObj()
                if (!target) return
                target.set({ rx: v, ry: v } as Parameters<typeof target.set>[0])
                canvas._fabricCanvas.requestRenderAll()
              }}
              onValueCommit={(v) => applyAndCommit({ rx: v, ry: v })}
              aria-label="모서리 반경"
            />
          </section>
        </>
      )}
    </>
  )
}

// ─── 섹션 4a: Text 속성 ──────────────────────────────────────────────────────

type TextSectionProps = {
  props: ObjectProps
  canvas: StoryCanvas
  history: History
}

/** 지원 폰트 MVP 3종 */
const TEXT_FONTS = ['Pretendard', 'Noto Sans KR', 'system-ui'] as const

function TextSection({ props, canvas, history }: TextSectionProps) {
  const getObj = (): FabricObject | undefined =>
    canvas.getObject(props.id) as FabricObject | undefined

  const obj = getObj()

  // 현재 속성 읽기
  const fontFamily = (obj as { fontFamily?: string })?.fontFamily ?? 'Pretendard'
  const fontSize = (obj as { fontSize?: number })?.fontSize ?? 24
  const fill = typeof obj?.fill === 'string' ? obj.fill : '#111111'
  const fontWeight = (obj as { fontWeight?: string })?.fontWeight ?? 'normal'
  const fontStyle = (obj as { fontStyle?: string })?.fontStyle ?? 'normal'
  const underline = (obj as { underline?: boolean })?.underline ?? false
  const textAlign = (obj as { textAlign?: string })?.textAlign ?? 'left'
  const lineHeight = (obj as { lineHeight?: number })?.lineHeight ?? 1.4
  const charSpacing = (obj as { charSpacing?: number })?.charSpacing ?? 0

  const applyAndCommit = (patch: Record<string, unknown>) => {
    const target = getObj()
    if (!target) return
    const before = snapshotFromFabricObject(target)
    target.set(patch as Parameters<typeof target.set>[0])
    canvas._fabricCanvas.requestRenderAll()
    const after = snapshotFromFabricObject(target)
    // TransformObjectCommand 재사용 (텍스트 속성도 before/after 스냅샷으로 표현)
    const cmd = new TransformObjectCommand({ canvas, id: props.id, before, after })
    history.push(cmd)
  }

  const isBold = fontWeight === 'bold'
  const isItalic = fontStyle === 'italic'

  return (
    <>
      {/* 폰트 선택 */}
      <section aria-label="폰트">
        <SectionLabel>폰트</SectionLabel>
        <select
          value={fontFamily}
          aria-label="폰트 선택"
          onChange={(e) => applyAndCommit({ fontFamily: e.target.value })}
          className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
        >
          {TEXT_FONTS.map((font) => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font}
            </option>
          ))}
        </select>
      </section>

      <SectionDivider />

      {/* 크기 */}
      <section aria-label="글자 크기">
        <SectionLabel>크기</SectionLabel>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Slider
              label=""
              unit="px"
              min={8}
              max={200}
              step={1}
              value={Math.round(fontSize)}
              onValueChange={(v) => {
                const target = getObj()
                if (!target) return
                target.set({ fontSize: v } as Parameters<typeof target.set>[0])
                canvas._fabricCanvas.requestRenderAll()
              }}
              onValueCommit={(v) => applyAndCommit({ fontSize: v })}
              aria-label="글자 크기"
            />
          </div>
          <div className="w-14">
            <NumberInput
              label=""
              value={Math.round(fontSize)}
              unit="px"
              step={1}
              min={8}
              max={200}
              onCommit={(v) => applyAndCommit({ fontSize: v })}
              aria-label="글자 크기 (px)"
            />
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* 서식 버튼 (굵게/기울임/밑줄) + 정렬 */}
      <section aria-label="서식">
        <SectionLabel>서식</SectionLabel>
        <div className="flex gap-1">
          {/* 굵게 */}
          <button
            type="button"
            aria-label="굵게"
            aria-pressed={isBold}
            onClick={() => applyAndCommit({ fontWeight: isBold ? 'normal' : 'bold' })}
            className={cn(
              'flex size-7 items-center justify-center rounded-[var(--radius-sm,4px)] border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
              isBold
                ? 'border-[var(--color-brand-400)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] dark:bg-[var(--color-brand-950)]'
                : 'hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
            )}
          >
            <Bold className="size-3.5" aria-hidden="true" />
          </button>

          {/* 기울임 */}
          <button
            type="button"
            aria-label="기울임"
            aria-pressed={isItalic}
            onClick={() => applyAndCommit({ fontStyle: isItalic ? 'normal' : 'italic' })}
            className={cn(
              'flex size-7 items-center justify-center rounded-[var(--radius-sm,4px)] border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
              isItalic
                ? 'border-[var(--color-brand-400)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] dark:bg-[var(--color-brand-950)]'
                : 'hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
            )}
          >
            <Italic className="size-3.5" aria-hidden="true" />
          </button>

          {/* 밑줄 */}
          <button
            type="button"
            aria-label="밑줄"
            aria-pressed={underline}
            onClick={() => applyAndCommit({ underline: !underline })}
            className={cn(
              'flex size-7 items-center justify-center rounded-[var(--radius-sm,4px)] border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
              underline
                ? 'border-[var(--color-brand-400)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] dark:bg-[var(--color-brand-950)]'
                : 'hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
            )}
          >
            <Underline className="size-3.5" aria-hidden="true" />
          </button>

          <div aria-hidden="true" className="flex-1" />

          {/* 정렬 */}
          {(['left', 'center', 'right'] as const).map((align) => {
            const Icon =
              align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight
            const labels = { left: '왼쪽 정렬', center: '가운데 정렬', right: '오른쪽 정렬' }
            return (
              <button
                key={align}
                type="button"
                aria-label={labels[align]}
                aria-pressed={textAlign === align}
                onClick={() => applyAndCommit({ textAlign: align })}
                className={cn(
                  'flex size-7 items-center justify-center rounded-[var(--radius-sm,4px)] border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
                  textAlign === align
                    ? 'border-[var(--color-brand-400)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] dark:bg-[var(--color-brand-950)]'
                    : 'hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </button>
            )
          })}
        </div>
      </section>

      <SectionDivider />

      {/* 색상 */}
      <section aria-label="글자 색상">
        <SectionLabel>글자 색상</SectionLabel>
        <ColorPicker value={fill} onChange={(hex) => applyAndCommit({ fill: hex })} />
      </section>

      <SectionDivider />

      {/* 줄간격 */}
      <section aria-label="줄간격">
        <SectionLabel>줄간격</SectionLabel>
        <Slider
          label=""
          unit="×"
          min={0.8}
          max={2.4}
          step={0.1}
          value={Math.round(lineHeight * 10) / 10}
          onValueChange={(v) => {
            const target = getObj()
            if (!target) return
            target.set({ lineHeight: v } as Parameters<typeof target.set>[0])
            canvas._fabricCanvas.requestRenderAll()
          }}
          onValueCommit={(v) => applyAndCommit({ lineHeight: v })}
          aria-label="줄간격"
        />
      </section>

      <SectionDivider />

      {/* 자간 */}
      <section aria-label="자간">
        <SectionLabel>자간</SectionLabel>
        <Slider
          label=""
          unit=""
          min={-100}
          max={500}
          step={10}
          value={charSpacing}
          onValueChange={(v) => {
            const target = getObj()
            if (!target) return
            target.set({ charSpacing: v } as Parameters<typeof target.set>[0])
            canvas._fabricCanvas.requestRenderAll()
          }}
          onValueCommit={(v) => applyAndCommit({ charSpacing: v })}
          aria-label="자간"
        />
      </section>
    </>
  )
}

// Placeholder 섹션 (미구현 타입용)
function PlaceholderSection({ milestone, label }: { milestone: string; label: string }) {
  return (
    <section aria-label={`${label} 설정 (미구현)`}>
      <div
        className={cn(
          'rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)]',
          'p-3 text-center text-xs text-[var(--color-text-muted)]',
        )}
      >
        <p className="font-medium">{label} 속성</p>
        <p className="mt-1 opacity-70">{milestone} 에서 활성화 예정</p>
      </div>
    </section>
  )
}

// ─── ControlBar 메인 ──────────────────────────────────────────────────────────

export function ControlBar({ props, canvas, layerTree, history }: ControlBarProps) {
  // 선택 없음
  if (!props || !canvas || !history) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-[var(--color-text-muted)]">
        객체를 선택하면 속성이 여기에 표시됩니다
      </div>
    )
  }

  const kind = (() => {
    const obj = canvas.getObject(props.id) as
      | (FabricObject & { data?: { kind?: string } })
      | undefined
    return obj?.data?.kind ?? 'unknown'
  })()

  return (
    <div className="flex flex-col gap-0 divide-y divide-[var(--color-border)]">
      {/* 섹션 1: 위치/크기 */}
      <div className="px-4 py-3">
        <PositionSizeSection props={props} canvas={canvas} history={history} />
      </div>

      {/* 섹션 2: 투명도 */}
      <div className="px-4 py-3">
        <OpacitySection props={props} canvas={canvas} history={history} />
      </div>

      {/* 섹션 3: 상태 */}
      {layerTree && (
        <div className="px-4 py-3">
          <StateSection props={props} canvas={canvas} layerTree={layerTree} history={history} />
        </div>
      )}

      {/* 섹션 4: 타입별 */}
      {kind === 'background' && (
        <div className="px-4 py-3">
          <BackgroundFillSection props={props} canvas={canvas} history={history} />
        </div>
      )}

      {kind === 'shape' && (
        <div className="px-4 py-3">
          <ShapeDetailSection props={props} canvas={canvas} history={history} />
        </div>
      )}

      {kind === 'pose' && (
        <div className="px-4 py-3">
          <PlaceholderSection label="포즈" milestone="M2" />
        </div>
      )}

      {kind === 'text' && (
        <div className="px-4 py-3">
          <TextSection props={props} canvas={canvas} history={history} />
        </div>
      )}

      {(kind === 'bubble' || kind === 'wordfx' || kind === 'decoration' || kind === 'frame') && (
        <div className="px-4 py-3">
          <PlaceholderSection
            label={
              kind === 'bubble'
                ? '말풍선'
                : kind === 'wordfx'
                  ? '워드효과'
                  : kind === 'decoration'
                    ? '꾸미기'
                    : '프레임'
            }
            milestone="M5"
          />
        </div>
      )}
    </div>
  )
}
