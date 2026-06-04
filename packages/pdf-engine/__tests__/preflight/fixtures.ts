/**
 * 테스트 픽스처 — preflight 룰 공용
 */

import type { PdfBuildInput } from '../../src/types.js'

export const BASE_FORMAT = {
  widthMm: 130,
  heightMm: 200,
  dpi: 300,
  bleedMm: 3,
  safeMm: 5,
}

export function makeLayer(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'layer-1',
    kind: 'pose',
    data: { meta: {} },
    fabric: {
      left: 20,
      top: 20,
      width: 80,
      height: 150,
      scaleX: 1,
      scaleY: 1,
      originX: 'left',
      originY: 'top',
      opacity: 1,
      angle: 0,
      fill: '#ffffff',
    },
    ...overrides,
  }
}

export function makeTextLayer(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'text-1',
    kind: 'text',
    data: {},
    fabric: {
      left: 10,
      top: 10,
      width: 100,
      height: 20,
      scaleX: 1,
      scaleY: 1,
      originX: 'left',
      originY: 'top',
      opacity: 1,
      angle: 0,
      text: '안녕하세요',
      fontSize: 14,
      fill: '#000000',
      fontFamily: 'Pretendard',
    },
    ...overrides,
  }
}

export function makeInput(
  pageCount: number,
  formatOverride: Partial<typeof BASE_FORMAT> = {},
  layersPerPage: Record<string, unknown>[][] = [],
): PdfBuildInput {
  const format = { ...BASE_FORMAT, ...formatOverride }
  return {
    formatId: 'b5-format',
    format,
    title: '테스트 작품',
    author: '작가',
    seed: 42,
    pages: Array.from({ length: pageCount }, (_, i) => ({
      pageIndex: i,
      fabricJson: {
        v: 1,
        format: { widthMm: format.widthMm, heightMm: format.heightMm, dpi: format.dpi },
        layers: layersPerPage[i] ?? [
          {
            id: `bg-${i}`,
            kind: 'bg',
            data: {},
            fabric: {
              left: 0,
              top: 0,
              width: format.widthMm,
              height: format.heightMm,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              angle: 0,
              fill: '#f5f0e8',
            },
          },
        ],
      },
    })),
  }
}
