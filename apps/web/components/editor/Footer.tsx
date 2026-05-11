'use client'

// ─────────────────────────────────────────────
// Footer — 캔버스 하단 40px 줌 + 페이지 인디케이터
//
// 좌: PageIndicator (M5 전까지 1/1 고정)
// 가운데: 캔버스 사이즈 (mm)
// 우: − / Slider(25~400%) / + / 숫자 / 맞춤(F)
//
// 줌 동작:
//   - zoomToPoint: 캔버스 중앙 기준
//   - Fit: 전체 페이지가 뷰포트에 맞도록 (여백 32px)
//   - 키보드: Cmd+= / Cmd+− / Cmd+0 (EditorCanvas 의 keyDown 에서 처리)
//   - 휠 줌: EditorCanvas wrapper 의 wheel 이벤트 (EditorCanvas 에서 연동)
//
// 데스크톱(md+) 전용. 모바일은 BottomSheet 에서 처리 (M1-08f).
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import { Button, Slider, Tooltip, cn } from '@storywork/ui'
import { Point } from 'fabric'
import { Minus, Plus } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { PageIndicator } from './PageIndicator'
import { usePageStore } from './store/usePageStore'

// ─── 상수 ────────────────────────────────────────────────────────────────────

const MIN_ZOOM = 25
const MAX_ZOOM = 400
const ZOOM_STEP = 10
const FIT_MARGIN_PX = 32
const THROTTLE_MS = 16

// ─── 줌 헬퍼 ────────────────────────────────────────────────────────────────

/** fabric viewport transform 에서 현재 줌 % 추출 */
function getZoomPercent(canvas: StoryCanvas): number {
  const zoom = canvas._fabricCanvas.getZoom()
  return Math.round(zoom * 100)
}

/** 캔버스 중앙 기준 zoomToPoint */
function applyZoom(canvas: StoryCanvas, percent: number): void {
  const fabricCanvas = canvas._fabricCanvas
  const center = new Point(fabricCanvas.getWidth() / 2, fabricCanvas.getHeight() / 2)
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, percent)) / 100
  fabricCanvas.zoomToPoint(center, zoom)
  fabricCanvas.requestRenderAll()
}

/**
 * 페이지 전체가 뷰포트에 맞도록 줌 + 패닝.
 *
 * 뷰포트 크기는 fabric canvas element 의 부모 DOM (wrapper div) 에서 읽는다.
 * fabric.getWidth()/getHeight() 는 setDimensions() 또는 setFormat() 이 호출된 후
 * 컨테이너 크기(뷰포트) 또는 판형 px 크기를 반환할 수 있어 신뢰할 수 없다.
 *
 * 실제 뷰포트 크기: canvas element 의 가장 가까운 오버플로우 컨테이너
 * (lowerCanvasEl → wrapperEl → 상위 flex 영역)
 *
 * 페이지 크기: canvas.format 에서 계산 (300dpi 기준 px)
 */
function fitToViewport(canvas: StoryCanvas): void {
  const fabricCanvas = canvas._fabricCanvas
  const format = canvas.format
  const pageW = canvas.mmToPx(format.widthMm)
  const pageH = canvas.mmToPx(format.heightMm)

  // 실제 컨테이너 DOM 크기 획득
  // fabric v6: lowerCanvasEl 은 fabric 내부 canvas element
  // wrapperEl 은 fabric 이 생성한 감싸는 div (lowerCanvasEl.parentElement)
  // 그 부모(grand-parent)가 EditorCanvas 의 containerRef div
  // 그 부모가 EditorCanvas 의 wrapRef div (relative flex 1 overflow-hidden)
  const lowerCanvas = (fabricCanvas as unknown as { lowerCanvasEl?: HTMLElement }).lowerCanvasEl
  // 2단계 상위 = wrapRef (EditorCanvas 전체 영역)
  const containerEl = lowerCanvas?.parentElement?.parentElement
  const viewW = containerEl ? containerEl.clientWidth : fabricCanvas.getWidth()
  const viewH = containerEl ? containerEl.clientHeight : fabricCanvas.getHeight()

  const zoom = Math.min(
    (viewW - FIT_MARGIN_PX * 2) / pageW,
    (viewH - FIT_MARGIN_PX * 2) / pageH,
    MAX_ZOOM / 100,
  )
  const clampedZoom = Math.max(MIN_ZOOM / 100, zoom)

  // fabric canvas dimensions 를 뷰포트에 맞게 재설정 (이미 맞다면 skip)
  if (fabricCanvas.getWidth() !== viewW || fabricCanvas.getHeight() !== viewH) {
    fabricCanvas.setWidth(viewW)
    fabricCanvas.setHeight(viewH)
  }

  // 중앙 정렬: viewportTransform[4], [5] = 패닝
  const offsetX = (viewW - pageW * clampedZoom) / 2
  const offsetY = (viewH - pageH * clampedZoom) / 2

  fabricCanvas.setZoom(clampedZoom)
  fabricCanvas.viewportTransform[4] = offsetX
  fabricCanvas.viewportTransform[5] = offsetY
  fabricCanvas.requestRenderAll()
}

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

type FooterProps = {
  canvas: StoryCanvas | null
  currentPage?: number
  totalPages?: number
  onPrevPage?: () => void
  onNextPage?: () => void
  onGoToPage?: (pageIndex: number) => void
  onTogglePagePanel?: () => void
  className?: string
}

export function Footer({
  canvas,
  currentPage = 1,
  totalPages = 1,
  onPrevPage,
  onNextPage,
  onGoToPage,
  onTogglePagePanel,
  className,
}: FooterProps) {
  const [zoom, setZoom] = useState(100)
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // FOLLOWUP-42: 실제 판형을 store 에서 읽어 Footer 사이즈 표시에 반영
  const format = usePageStore((s) => s.project?.format)

  // 외부(키보드/휠)에서 발생한 줌 변화 동기화
  useEffect(() => {
    if (!canvas) return
    const fabricCanvas = canvas._fabricCanvas

    const syncZoom = () => {
      setZoom(getZoomPercent(canvas))
    }

    // fabric zoom 변경 이벤트 — after:render 로 폴링
    fabricCanvas.on('after:render', syncZoom)
    syncZoom()

    return () => {
      fabricCanvas.off('after:render', syncZoom)
    }
  }, [canvas])

  // throttle 된 줌 변경 (슬라이더 드래그 중)
  const handleSliderChange = useCallback(
    (value: number) => {
      if (!canvas) return
      if (throttleRef.current) return
      throttleRef.current = setTimeout(() => {
        throttleRef.current = null
        applyZoom(canvas, value)
        setZoom(value)
      }, THROTTLE_MS)
    },
    [canvas],
  )

  // 슬라이더 드래그 종료 시 즉시 반영
  const handleSliderCommit = useCallback(
    (value: number) => {
      if (!canvas) return
      if (throttleRef.current) {
        clearTimeout(throttleRef.current)
        throttleRef.current = null
      }
      applyZoom(canvas, value)
      setZoom(value)
    },
    [canvas],
  )

  const handleZoomOut = useCallback(() => {
    if (!canvas) return
    const next = Math.max(MIN_ZOOM, zoom - ZOOM_STEP)
    applyZoom(canvas, next)
    setZoom(next)
  }, [canvas, zoom])

  const handleZoomIn = useCallback(() => {
    if (!canvas) return
    const next = Math.min(MAX_ZOOM, zoom + ZOOM_STEP)
    applyZoom(canvas, next)
    setZoom(next)
  }, [canvas, zoom])

  const handleFit = useCallback(() => {
    if (!canvas) return
    fitToViewport(canvas)
    setZoom(getZoomPercent(canvas))
  }, [canvas])

  return (
    <footer
      className={cn(
        // 데스크톱(md+) 전용
        'hidden md:flex',
        'h-10 items-center justify-between px-3',
        'border-t border-[var(--color-border)]',
        'bg-[var(--color-surface)]',
        'select-none',
        className,
      )}
      role="toolbar"
      aria-label="캔버스 하단 도구"
    >
      {/* 좌: 페이지 인디케이터 */}
      <div className="flex min-w-[96px] items-center">
        <PageIndicator
          currentPage={currentPage}
          totalPages={totalPages}
          onPrev={onPrevPage}
          onNext={onNextPage}
          onGoToPage={onGoToPage}
          onTogglePanel={onTogglePagePanel}
        />
      </div>

      {/* 가운데: 캔버스 사이즈 (FOLLOWUP-42: 실제 판형 반영) */}
      <div
        className="text-xs text-[var(--color-text-muted)]"
        aria-label={`캔버스 사이즈 ${format?.widthMm ?? 0}×${format?.heightMm ?? 0}mm`}
      >
        {format ? `${format.widthMm}×${format.heightMm}mm` : '—'}
      </div>

      {/* 우: 줌 컨트롤 */}
      <div
        className="flex min-w-[200px] items-center justify-end gap-1"
        role="group"
        aria-label="줌 컨트롤"
      >
        {/* − 버튼 */}
        <Tooltip content="축소 (Ctrl −)" side="top">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            disabled={!canvas || zoom <= MIN_ZOOM}
            aria-label="축소"
            className="size-7 [&_svg]:size-3.5"
          >
            <Minus aria-hidden="true" />
          </Button>
        </Tooltip>

        {/* 슬라이더 */}
        <div className="w-[88px]">
          <Slider
            aria-label="줌 슬라이더"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={1}
            value={zoom}
            onValueChange={handleSliderChange}
            onValueCommit={handleSliderCommit}
            disabled={!canvas}
          />
        </div>

        {/* + 버튼 */}
        <Tooltip content="확대 (Ctrl +)" side="top">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            disabled={!canvas || zoom >= MAX_ZOOM}
            aria-label="확대"
            className="size-7 [&_svg]:size-3.5"
          >
            <Plus aria-hidden="true" />
          </Button>
        </Tooltip>

        {/* 숫자 표시 */}
        <button
          type="button"
          onClick={() => {
            if (!canvas) return
            applyZoom(canvas, 100)
            setZoom(100)
          }}
          aria-label={`현재 줌 ${zoom}%. 클릭하여 100%로 리셋`}
          disabled={!canvas}
          className={cn(
            'min-w-[44px] rounded-[var(--radius-sm)] px-1.5 py-0.5',
            'text-center text-xs tabular-nums text-[var(--color-text-muted)]',
            'transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[var(--color-brand-500)]',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          {zoom}%
        </button>

        {/* 맞춤(F) 버튼 */}
        <Tooltip content="페이지 맞춤 (F)" side="top">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFit}
            disabled={!canvas}
            aria-label="페이지 맞춤"
            className="h-7 px-2 text-xs"
          >
            맞춤
          </Button>
        </Tooltip>
      </div>
    </footer>
  )
}

// ─── 줌 공개 헬퍼 (EditorCanvas 휠/키보드 연동용) ────────────────────────────

export { applyZoom, fitToViewport, getZoomPercent, MIN_ZOOM, MAX_ZOOM }
