// ─────────────────────────────────────────────
// slices.ts — 웹툰 롱 이미지 분할 계획 (MODE-05)
//
// 순수 산술. 세그먼트(컷 묶음)를 세로로 이은 "가상 스트립"을 만들고, 그것을 높이 상한 이하의
// 조각(slice)으로 자른다. 렌더는 하지 않는다 — 어떤 세그먼트의 어느 구간을 조각의 어디에
// 그릴지만 정한다.
//
// ## 자르는 위치
// 플랫폼 업로드 규격은 "폭 고정 + 파일당 높이 상한"이다. 아무 데서나 자르면 컷 한가운데가
// 잘려 업로드 후 이음매가 보일 수 있으므로 **세그먼트 경계를 우선**한다:
//   1. 다음 세그먼트까지 담아도 상한 이하면 계속 담는다
//   2. 넘치면 그 세그먼트 앞(경계)에서 자른다
//   3. 세그먼트 하나가 상한보다 크면 그 세그먼트만 상한 단위로 강제 분할한다
// 세그먼트 사이 간격(gap)은 배경색 여백이며, 경계에서 자를 때 조각 끝에 붙이지 않는다
// (조각이 여백으로 끝나면 이어 붙였을 때 간격이 두 배가 된다).
// ─────────────────────────────────────────────

/** 조각 안에 그릴 세그먼트 구간 하나 */
export type WebtoonSlicePart = {
  /** 원본 세그먼트 인덱스 */
  segmentIndex: number
  /** 세그먼트 안에서의 시작 y(px, 세그먼트 좌표) */
  srcY: number
  /** 조각 안에서의 시작 y(px, 조각 좌표) */
  dstY: number
  /** 그릴 높이(px) */
  height: number
}

export type WebtoonSlice = {
  /** 가상 스트립에서의 시작 y(px) */
  top: number
  /** 조각 높이(px) — 항상 maxSliceHeightPx 이하 */
  height: number
  parts: WebtoonSlicePart[]
}

export type PlanWebtoonSlicesOptions = {
  /** 세그먼트 사이 여백(px). 기본 0 */
  gapPx?: number
  /** 조각 하나의 최대 높이(px). 생략하면 분할하지 않는다(조각 1개) */
  maxSliceHeightPx?: number
}

/**
 * 세그먼트 높이 목록으로 롱 이미지 조각 계획을 세운다.
 *
 * @param segmentHeights 세그먼트별 높이(px). 모두 양수여야 한다
 * @throws Error 입력이 비었거나 높이/옵션이 양수가 아닐 때
 */
export function planWebtoonSlices(
  segmentHeights: readonly number[],
  opts: PlanWebtoonSlicesOptions = {},
): WebtoonSlice[] {
  const gap = opts.gapPx ?? 0
  if (segmentHeights.length === 0) {
    throw new Error('[editor-export] planWebtoonSlices: 세그먼트가 없습니다.')
  }
  if (segmentHeights.some((h) => !Number.isFinite(h) || h <= 0)) {
    throw new Error('[editor-export] planWebtoonSlices: 세그먼트 높이는 양수여야 합니다.')
  }
  if (!Number.isFinite(gap) || gap < 0) {
    throw new Error('[editor-export] planWebtoonSlices: gapPx 는 0 이상이어야 합니다.')
  }

  // 정수 픽셀로 고정 — 조각 경계가 소수면 이어 붙일 때 1px 이음매가 생긴다
  const heights = segmentHeights.map((h) => Math.round(h))
  const gapPx = Math.round(gap)
  const totalHeight = heights.reduce((sum, h) => sum + h, 0) + gapPx * (heights.length - 1)
  const max = opts.maxSliceHeightPx === undefined ? totalHeight : Math.floor(opts.maxSliceHeightPx)
  if (!Number.isFinite(max) || max <= 0) {
    throw new Error('[editor-export] planWebtoonSlices: maxSliceHeightPx 는 양수여야 합니다.')
  }

  // 세그먼트의 가상 스트립 시작 y
  const segTops: number[] = []
  let cursor = 0
  for (const h of heights) {
    segTops.push(cursor)
    cursor += h + gapPx
  }

  const slices: WebtoonSlice[] = []
  let i = 0
  while (i < heights.length) {
    const segH = heights[i] as number

    // 3. 상한보다 큰 세그먼트 — 단독으로 강제 분할
    if (segH > max) {
      for (let srcY = 0; srcY < segH; srcY += max) {
        const height = Math.min(max, segH - srcY)
        slices.push({
          top: (segTops[i] as number) + srcY,
          height,
          parts: [{ segmentIndex: i, srcY, dstY: 0, height }],
        })
      }
      i++
      continue
    }

    // 1~2. 경계를 넘지 않는 한 세그먼트를 이어 담는다
    const top = segTops[i] as number
    const parts: WebtoonSlicePart[] = []
    let used = 0
    while (i < heights.length) {
      const h = heights[i] as number
      const lead = parts.length === 0 ? 0 : gapPx
      if (used + lead + h > max) break
      parts.push({ segmentIndex: i, srcY: 0, dstY: used + lead, height: h })
      used += lead + h
      i++
    }
    slices.push({ top, height: used, parts })
  }

  return slices
}
