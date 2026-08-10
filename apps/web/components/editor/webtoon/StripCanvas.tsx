'use client'

/**
 * StripCanvas — 웹툰 세로 스트립 편집 뷰 (MODE-04b / ADR-0017)
 *
 * 세그먼트를 세로로 쌓아 스크롤로 훑는다. POD(mm) 편집기와 달리 "페이지를 넘기는" 것이
 * 아니라 "이어서 내려 읽는" 것이 웹툰 문법이라, 페이지 전환 UI 대신 스크롤이 주 조작이다.
 *
 * ## 구조
 * - 스크롤 컨테이너 하나 + 세그먼트마다 절대 위치 슬롯(높이 = 세그먼트 px × zoom)
 * - 라이브 창(K개)만 `<StripSegmentCanvas>` = 실제 fabric 캔버스, 나머지는 썸네일 `<img>`
 * - 세그먼트 사이 간격이 컷 경계 — 배경색으로 자연히 드러나므로 별도 가이드선을 그리지 않는다
 *
 * ## 왜 세그먼트별 캔버스인가
 * 스트립 전체를 캔버스 하나로 만들면 fabric 오프스크린 컬링이 무효화되고(엘리먼트 크기가
 * 곧 뷰포트라 모든 객체가 "화면 안"), dpr=2·7세그먼트에서 Safari 16384px 상한을 넘어
 * 빈 화면이 된다. 근거는 `editor-core/src/strip/geometry.ts` 상단 주석.
 *
 * ## 알려진 제약 (아키텍처 귀결)
 * 세그먼트 **간** 드래그 이동은 불가하다 — fabric 캔버스 경계를 넘지 못한다.
 * 잘라내기/붙여넣기로 옮긴다.
 */

import { fitStripWidth } from '@storywork/editor-core'
import type { StripSegment } from '@storywork/editor-core'
import { cn } from '@storywork/ui'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { PageData, PageFormat } from '../store/usePageStore'

import { StripSegmentCanvas } from './StripSegmentCanvas'
import { useStripVirtualizer } from './useStripVirtualizer'

export interface StripCanvasProps {
  pages: readonly PageData[]
  format: PageFormat
  activeIndex: number
  onActiveIndexChange: (index: number) => void
  /** 세그먼트 캔버스가 내려갈 때 flush — 인덱스 지정 필수(다른 세그먼트를 덮어쓰지 않게) */
  onSegmentFlush: (index: number, fabricJson: Record<string, unknown>) => void
}

export function StripCanvas({
  pages,
  format,
  activeIndex,
  onActiveIndexChange,
  onSegmentFlush,
}: StripCanvasProps) {
  // callback ref + state — DOM 이 붙는 순간 리렌더가 일어나야 가상화 effect 가 컨테이너를
  // 실제로 잡는다. 평범한 useRef 로 넘기면 마운트 타이밍에 따라 영영 0×0 으로 남는다(실측).
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [zoom, setZoom] = useState(1)

  // px 판형이면 widthMm/heightMm 가 곧 픽셀값이다 (MODE-04a `coordDpi` 참조)
  const segments: StripSegment[] = useMemo(
    () => pages.map(() => ({ heightPx: format.heightMm })),
    [pages, format.heightMm],
  )

  const { layout, liveIndices, scrolledIndex } = useStripVirtualizer({
    segments,
    zoom,
    activeIndex,
    scrollEl,
  })

  // 폭 맞춤 — 컨테이너 크기가 바뀌면 다시 계산
  useEffect(() => {
    if (!scrollEl) return
    const fit = () => setZoom(fitStripWidth(format.widthMm, scrollEl.clientWidth))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(scrollEl)
    return () => ro.disconnect()
  }, [scrollEl, format.widthMm])

  // 스크롤로 지나간 세그먼트를 활성으로 승격 — 도구 패널이 그 세그먼트를 향하게 한다
  useEffect(() => {
    if (scrolledIndex !== activeIndex) onActiveIndexChange(scrolledIndex)
    // activeIndex 를 의존성에 넣으면 사용자가 직접 고른 활성을 스크롤이 되돌린다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrolledIndex])

  const liveSet = useMemo(() => new Set(liveIndices), [liveIndices])

  return (
    <div
      ref={useCallback((el: HTMLDivElement | null) => setScrollEl(el), [])}
      className={cn(
        'relative h-full w-full overflow-y-auto overscroll-contain',
        'bg-[var(--editor-canvas-bg,var(--color-surface-muted))]',
      )}
      data-testid="strip-scroll"
      aria-label="웹툰 스트립"
    >
      <div className="relative mx-auto" style={{ height: layout.totalHeight }}>
        {layout.slots.map((slot) => {
          const page = pages[slot.index]
          if (!page) return null
          const isLive = liveSet.has(slot.index)
          const isActive = slot.index === activeIndex

          return (
            <div
              key={page.id}
              className={cn(
                'absolute left-1/2 -translate-x-1/2 bg-white shadow-sm',
                isActive && 'ring-2 ring-[var(--editor-focus)]',
              )}
              style={{ top: slot.top, width: format.widthMm * zoom, height: slot.height }}
              data-testid={`strip-segment-${slot.index}`}
              data-live={isLive ? 'true' : 'false'}
              onPointerDown={() => {
                if (!isActive) onActiveIndexChange(slot.index)
              }}
            >
              {isLive ? (
                <StripSegmentCanvas
                  index={slot.index}
                  page={page}
                  format={format}
                  zoom={zoom}
                  onFlush={onSegmentFlush}
                />
              ) : page.thumbnail ? (
                // 썸네일은 캔버스가 만든 dataURL — next/image 최적화 대상이 아니다
                // (PagePanel·ProjectCard 와 같은 처리)
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={page.thumbnail}
                  alt={`세그먼트 ${slot.index + 1}`}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                // 썸네일이 아직 없는 세그먼트 — 자리만 잡아 스크롤 높이를 유지한다
                <div className="flex h-full w-full items-center justify-center text-sm text-[var(--color-text-muted)]">
                  {slot.index + 1}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
