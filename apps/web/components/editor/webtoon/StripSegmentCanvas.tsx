'use client'

/**
 * StripSegmentCanvas — 스트립 세그먼트 하나의 fabric 캔버스 (MODE-04b)
 *
 * 라이브 창 안에 들어온 세그먼트만 마운트된다. 창 밖으로 나가면 언마운트되는데,
 * **언마운트 전에 반드시 flush** 한다 — 안 하면 그 세그먼트의 편집이 사라진다.
 *
 * ## flush 는 인덱스를 명시한다
 * 스트립은 캔버스가 여러 개 동시에 살아 있다. `updateCurrentPageJson`(현재 페이지에 쓰는
 * 액션)을 쓰면 **다른 세그먼트를 덮어쓴다** — 그래서 `updatePageJson(index, json)` 을 쓴다.
 *
 * ## 판형은 px
 * 웹툰 판형은 `unit='px'` 이라 `widthMm/heightMm` 가 곧 픽셀이고 좌표 변환이 1:1 이다
 * (MODE-04a `coordDpi`). 캔버스는 세그먼트 실물 크기로 만들고, 화면 축소는 뷰포트
 * 배율(`setViewportScale`)로 처리한다 — CSS 로 줄이면 클릭 좌표가 어긋난다.
 */

import { StoryCanvas } from '@storywork/editor-core'
import { useEffect, useRef } from 'react'

import type { PageData, PageFormat } from '../store/usePageStore'

export interface StripSegmentCanvasProps {
  index: number
  page: PageData
  format: PageFormat
  zoom: number
  onFlush: (index: number, fabricJson: Record<string, unknown>) => void
}

export function StripSegmentCanvas({
  index,
  page,
  format,
  zoom,
  onFlush,
}: StripSegmentCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<StoryCanvas | null>(null)
  /** 최신 flush 콜백 — effect 를 재실행하지 않고 참조만 갱신한다 */
  const flushRef = useRef(onFlush)
  flushRef.current = onFlush

  // 캔버스 수명 — 세그먼트 하나당 하나. 언마운트 시 flush 후 dispose
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const canvas = new StoryCanvas({
      format: {
        id: 'strip-segment',
        unit: format.unit,
        widthMm: format.widthMm,
        heightMm: format.heightMm,
        dpi: format.dpi,
      },
      container,
      backgroundColor: '#ffffff',
    })
    canvasRef.current = canvas

    // 저장본 복원 — 비어 있으면(신규 세그먼트) 건너뛴다
    if (page.fabricJson && Object.keys(page.fabricJson).length > 0) {
      void canvas.loadJson(page.fabricJson as Parameters<typeof canvas.loadJson>[0])
    }

    return () => {
      // dispose 전에 편집 내용을 스토어로 되돌린다 — 순서가 뒤바뀌면 유실된다
      try {
        flushRef.current(index, canvas.toJson() as unknown as Record<string, unknown>)
      } catch (err) {
        console.warn(`[strip] 세그먼트 ${index} flush 실패:`, err)
      }
      canvas.dispose()
      canvasRef.current = null
    }
    // page.fabricJson 은 의도적으로 제외 — 자기 flush 가 리마운트를 유발하면 무한 루프다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, format.unit, format.widthMm, format.heightMm, format.dpi])

  // 줌은 캔버스를 다시 만들지 않고 뷰포트 배율로만 반영
  useEffect(() => {
    canvasRef.current?.setViewportScale(zoom)
  }, [zoom])

  return <div ref={containerRef} className="h-full w-full" data-testid={`strip-canvas-${index}`} />
}
