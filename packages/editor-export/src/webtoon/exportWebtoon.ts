// ─────────────────────────────────────────────
// exportWebtoon.ts — 웹툰(px 판형) 이미지 내보내기 (MODE-05 / ADR-0017)
//
// POD 는 PDF 로 나가고, 웹툰은 이미지로 나간다. 두 가지 레이아웃:
//   - sequence: 세그먼트 1개 = 이미지 1장 (플랫폼에 컷 단위로 올리는 경우)
//   - long    : 세그먼트를 세로로 이은 롱 이미지. 높이 상한을 넘으면 경계 우선으로 분할
//
// ## 왜 편집기 캔버스를 쓰지 않는가
// 편집 중인 fabric 캔버스는 화면 맞춤 배율(viewportTransform)이 걸려 있고, fabric 의
// `toCanvasElement` 는 그 배율까지 곱해 그린다 — 화면 줌 0.6 이면 결과도 0.6 배가 된다.
// 게다가 스트립은 라이브 창 밖 세그먼트의 캔버스가 아예 없다. 그래서 세그먼트마다 **헤드리스
// StoryCanvas 를 판형 실물 크기(배율 1)로 새로 만들어** 저장본을 얹고 그린다. 웹툰 판형은
// 좌표가 픽셀 1:1 이므로(MODE-04a `coordDpi`) 판형 폭 690 이면 결과 폭도 정확히 690 이다.
//
// ## 메모리
// 세그먼트를 전부 렌더해 두지 않는다. 렌더 → 조각에 그림 → 버림을 순서대로 해서 동시에
// 살아 있는 세그먼트 캔버스는 많아야 1개다(모바일 Safari 캔버스 메모리 한도 대비).
// ─────────────────────────────────────────────

import { MAX_CANVAS_SIDE_PX, StoryCanvas } from '@storywork/editor-core'
import type { Format } from '@storywork/editor-core'
import type { PageJsonV1 } from '@storywork/schema/editor'

import { dataUrlToBlob } from '../png/render.js'

import { planWebtoonSlices } from './slices.js'

export type WebtoonImageMime = 'image/png' | 'image/jpeg' | 'image/webp'

export type ExportWebtoonOptions = {
  /** sequence = 세그먼트별 이미지, long = 이어 붙인 롱 이미지(필요 시 분할) */
  layout: 'sequence' | 'long'
  /** 출력 배율. 기본 1 — 판형 폭 그대로(플랫폼 규격은 폭 고정이므로 보통 1) */
  scale?: number
  /** 배경색. 기본 '#ffffff'. 'transparent' 는 PNG/WebP 에서만 의미가 있다 */
  background?: string
  /** 출력 MIME. 기본 'image/png' */
  format?: WebtoonImageMime
  /** jpeg/webp 품질 0..1. 기본 0.92 */
  quality?: number
  /** long 전용 — 세그먼트 사이 여백(px, 판형 단위). 기본 0 */
  gapPx?: number
  /**
   * long 전용 — 파일 하나의 최대 높이(px, 판형 단위). 플랫폼 업로드 규격에 맞춘다.
   * 생략하면 브라우저 캔버스 상한(16384px / scale)까지 한 장으로 잇는다.
   */
  maxSliceHeightPx?: number
  /** 파일명 접두. 기본 'webtoon' */
  fileBaseName?: string
  /** 진행률 — 렌더한 세그먼트 수 / 전체 */
  onProgress?: (done: number, total: number) => void
}

export type WebtoonImageFile = {
  name: string
  blob: Blob
  /** 픽셀 너비 */
  width: number
  /** 픽셀 높이 */
  height: number
}

export type ExportWebtoonResult = {
  layout: 'sequence' | 'long'
  files: WebtoonImageFile[]
  mimeType: WebtoonImageMime
}

/** 저장본 하나 — 빈 세그먼트(신규·미편집)는 null/빈 객체로 들어올 수 있다 */
export type WebtoonPageInput = PageJsonV1 | Record<string, unknown> | null | undefined

const DEFAULT_BACKGROUND = '#ffffff'
const DEFAULT_QUALITY = 0.92

const EXT: Record<WebtoonImageMime, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

function hasLayers(json: WebtoonPageInput): json is PageJsonV1 {
  if (!json || typeof json !== 'object') return false
  const layers = (json as { layers?: unknown }).layers
  return Array.isArray(layers) && layers.length > 0
}

function pad3(n: number): string {
  return String(n).padStart(3, '0')
}

/** 세그먼트 하나를 판형 실물 크기 × scale 로 그린 캔버스 엘리먼트 */
async function renderSegment(
  json: WebtoonPageInput,
  format: Format,
  scale: number,
  background: string,
): Promise<HTMLCanvasElement> {
  // container 없이 만들면 헤드리스 경로 — DOM 에 붙지 않고, 화면 배율도 없다
  const story = new StoryCanvas({ format, backgroundColor: background })
  try {
    if (hasLayers(json)) await story.loadJson(json)
    const fabricCanvas = story._fabricCanvas
    // 헤드리스 어댑터는 'transparent' 같은 값을 그대로 넘기지 않으므로 명시적으로 맞춘다
    fabricCanvas.backgroundColor = background === 'transparent' ? '' : background
    return fabricCanvas.toCanvasElement(scale)
  } finally {
    story.dispose()
  }
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: WebtoonImageMime,
  quality: number,
): Promise<Blob> {
  // 브라우저는 toBlob 이 base64 를 거치지 않아 롱 이미지(수십 MB)에서 메모리를 덜 쓴다
  if (typeof canvas.toBlob === 'function') {
    const blob = await new Promise<Blob | null>((resolve) => {
      try {
        canvas.toBlob((b) => resolve(b), mime, quality)
      } catch {
        resolve(null)
      }
    })
    if (blob && blob.size > 0) return blob
  }
  return dataUrlToBlob(canvas.toDataURL(mime, quality), mime)
}

/** 조각용 빈 캔버스. fabric 을 런타임 의존으로 끌어오지 않으려고 DOM 을 직접 쓴다 */
function createCanvasElement(): HTMLCanvasElement {
  if (typeof document === 'undefined') {
    throw new Error(
      '[editor-export] exportWebtoon: long 레이아웃은 DOM(document) 환경이 필요합니다.',
    )
  }
  return document.createElement('canvas')
}

function assertWebtoonFormat(format: Format): void {
  if (format.unit !== 'px') {
    // mm 판형을 이 경로로 내보내면 210mm 가 210px 로 찍힌다 — 인쇄물은 PDF 경로로
    throw new Error(
      '[editor-export] exportWebtoon: px(웹툰) 판형 전용입니다. mm 판형은 PDF 출판을 사용하세요.',
    )
  }
  if (!(format.widthMm > 0) || !(format.heightMm > 0)) {
    throw new Error('[editor-export] exportWebtoon: 판형 크기가 올바르지 않습니다.')
  }
}

/**
 * 웹툰 세그먼트 저장본들을 이미지 파일로 내보낸다.
 *
 * @param pages 세그먼트 저장본(스트립 순서)
 * @param format 웹툰 판형 — `unit: 'px'` 필수. widthMm/heightMm 는 픽셀값(컬럼명 레거시)
 * @throws Error px 판형이 아니거나, 세그먼트가 없거나, 옵션이 범위를 벗어날 때
 */
export async function exportWebtoon(
  pages: readonly WebtoonPageInput[],
  format: Format,
  opts: ExportWebtoonOptions,
): Promise<ExportWebtoonResult> {
  assertWebtoonFormat(format)
  if (pages.length === 0) {
    throw new Error('[editor-export] exportWebtoon: 내보낼 세그먼트가 없습니다.')
  }

  const scale = opts.scale ?? 1
  const background = opts.background ?? DEFAULT_BACKGROUND
  const mime = opts.format ?? 'image/png'
  const quality = opts.quality ?? DEFAULT_QUALITY
  const base = opts.fileBaseName?.trim() || 'webtoon'
  const ext = EXT[mime]

  if (!(scale > 0) || !Number.isFinite(scale)) {
    throw new Error('[editor-export] exportWebtoon: scale 은 양수여야 합니다.')
  }
  if (quality < 0 || quality > 1) {
    throw new Error('[editor-export] exportWebtoon: quality 는 0..1 사이여야 합니다.')
  }

  const segW = Math.round(format.widthMm)
  const segH = Math.round(format.heightMm)
  const outW = Math.round(segW * scale)
  if (outW > MAX_CANVAS_SIDE_PX || Math.round(segH * scale) > MAX_CANVAS_SIDE_PX) {
    throw new Error(
      `[editor-export] exportWebtoon: 출력 크기가 브라우저 캔버스 상한(${MAX_CANVAS_SIDE_PX}px)을 넘습니다. scale 을 낮추세요.`,
    )
  }

  const total = pages.length
  const report = (done: number) => opts.onProgress?.(done, total)

  // ── sequence: 세그먼트 1개 = 파일 1개 ──
  if (opts.layout === 'sequence') {
    const files: WebtoonImageFile[] = []
    for (let i = 0; i < total; i++) {
      const canvas = await renderSegment(pages[i], format, scale, background)
      files.push({
        name: `${base}_${pad3(i + 1)}.${ext}`,
        blob: await canvasToBlob(canvas, mime, quality),
        width: canvas.width,
        height: canvas.height,
      })
      report(i + 1)
    }
    return { layout: 'sequence', files, mimeType: mime }
  }

  // ── long: 경계 우선 분할 ──
  // 상한은 출력(배율 적용 후) 기준이라 판형 단위로 환산해 계획에 넘긴다
  const canvasCap = Math.floor(MAX_CANVAS_SIDE_PX / scale)
  const maxSlice = Math.min(opts.maxSliceHeightPx ?? canvasCap, canvasCap)
  const slices = planWebtoonSlices(
    pages.map(() => segH),
    { gapPx: opts.gapPx ?? 0, maxSliceHeightPx: maxSlice },
  )

  const files: WebtoonImageFile[] = []
  // 조각은 세그먼트 순서대로 진행하므로 직전에 렌더한 세그먼트 하나만 캐시하면 된다
  // (강제 분할된 세그먼트가 여러 조각에 걸칠 때 재렌더를 피한다)
  type CachedSegment = { index: number; canvas: HTMLCanvasElement }
  // `as` — 루프 안 await 재할당을 tsc 흐름 분석이 null 로 좁혀 버리는 것을 막는다
  let cached = null as CachedSegment | null
  let rendered = 0

  for (const [n, slice] of slices.entries()) {
    const out = createCanvasElement()
    out.width = outW
    out.height = Math.round(slice.height * scale)
    const ctx = out.getContext('2d')
    if (!ctx) throw new Error('[editor-export] exportWebtoon: 2D 컨텍스트를 만들 수 없습니다.')
    if (background !== 'transparent') {
      ctx.fillStyle = background
      ctx.fillRect(0, 0, out.width, out.height)
    }

    for (const part of slice.parts) {
      if (cached?.index !== part.segmentIndex) {
        cached = {
          index: part.segmentIndex,
          canvas: await renderSegment(pages[part.segmentIndex], format, scale, background),
        }
        rendered++
        report(rendered)
      }
      const sy = Math.round(part.srcY * scale)
      const dy = Math.round(part.dstY * scale)
      const h = Math.round((part.srcY + part.height) * scale) - sy
      ctx.drawImage(cached.canvas, 0, sy, outW, h, 0, dy, outW, h)
    }

    files.push({
      name: slices.length === 1 ? `${base}.${ext}` : `${base}_${pad3(n + 1)}.${ext}`,
      blob: await canvasToBlob(out, mime, quality),
      width: out.width,
      height: out.height,
    })
  }

  return { layout: 'long', files, mimeType: mime }
}
