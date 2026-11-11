/**
 * webtoonExport — 웹툰(px 판형) 이미지 다운로드 (MODE-05 / ADR-0017)
 *
 * POD 의 출력이 PDF 라면 웹툰의 출력은 이미지다. 렌더는 `@storywork/editor-export` 의
 * `exportWebtoon` 이 하고, 여기서는 편집기 상태 → 입력 변환과 다운로드만 맡는다.
 *
 * - 결과가 1장이면 이미지를 그대로, 여러 장이면 ZIP 하나로 묶어 내려준다
 *   (브라우저는 연속 다운로드를 팝업 차단처럼 막는 경우가 있다)
 * - 폭은 판형 폭 그대로(scale 1) — 웹툰 프리셋 폭(690·800)이 곧 업로드 규격 폭이다
 */

import type { Format } from '@storywork/editor-core'

import type { PageFormat } from '../store/usePageStore'

export type WebtoonExportLayout = 'sequence' | 'long'

/** 내보내기 직전에 최신 저장본을 돌려주는 공급자 — 라이브 세그먼트 flush 를 포함해야 한다 */
export type WebtoonExportSource = {
  format: PageFormat
  getPages: () => ReadonlyArray<Record<string, unknown> | null | undefined>
}

export type WebtoonExportOutcome = {
  /** 내려받은 파일 이름 */
  fileName: string
  /** 묶인 이미지 수 */
  imageCount: number
}

function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[/\\?%*:|"<>]/g, '_')
      .trim()
      .slice(0, 60) || 'webtoon'
  )
}

function toCoreFormat(format: PageFormat): Format {
  return {
    id: 'webtoon-export',
    unit: format.unit,
    widthMm: format.widthMm,
    heightMm: format.heightMm,
    dpi: format.dpi,
  }
}

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * 웹툰 이미지를 만들어 다운로드한다.
 *
 * @throws Error px 판형이 아니거나 렌더에 실패했을 때 — 호출자가 토스트로 알린다
 */
export async function runWebtoonExport(
  source: WebtoonExportSource,
  layout: WebtoonExportLayout,
  title: string,
): Promise<WebtoonExportOutcome> {
  // 렌더 엔진은 크다 — 웹툰 다운로드를 누를 때만 받는다(POD 사용자는 받지 않는다)
  const { createStoreZip, exportWebtoon } = await import('@storywork/editor-export')

  const base = sanitizeFilename(title)
  const result = await exportWebtoon(source.getPages(), toCoreFormat(source.format), {
    layout,
    fileBaseName: base,
    background: '#ffffff',
  })

  if (result.files.length === 1) {
    const only = result.files[0]
    if (!only) throw new Error('[webtoon-export] 결과 이미지가 없습니다.')
    download(only.blob, only.name)
    return { fileName: only.name, imageCount: 1 }
  }

  const entries = await Promise.all(
    result.files.map(async (f) => ({
      name: f.name,
      data: new Uint8Array(await f.blob.arrayBuffer()),
    })),
  )
  const zipName = `${base}${layout === 'long' ? '_long' : ''}.zip`
  const zip = createStoreZip(entries)
  download(new Blob([zip as BlobPart], { type: 'application/zip' }), zipName)
  return { fileName: zipName, imageCount: result.files.length }
}
