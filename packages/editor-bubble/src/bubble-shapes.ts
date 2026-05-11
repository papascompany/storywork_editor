// ─────────────────────────────────────────────
// bubble-shapes.ts — 말풍선 모양 라이브러리
//
// 5종 모양 + SVG-path 형태 반환.
// fabric.js 에 의존하지 않음 — 순수 좌표 계산.
// ─────────────────────────────────────────────

/**
 * 지원 말풍선 모양
 *
 * - rounded-rect : 둥근 사각 (가장 일반적인 대사)
 * - cloud        : 구름 (꿈/생각/혼잣말)
 * - spike        : 뾰족 외침 (충격/외침/효과음)
 * - oval         : 타원 (부드러운 대사)
 * - caption      : 네모 내레이션 박스 (꼬리 없음)
 */
export type BubbleShape = 'rounded-rect' | 'cloud' | 'spike' | 'oval' | 'caption'

export const BUBBLE_SHAPES: BubbleShape[] = ['rounded-rect', 'cloud', 'spike', 'oval', 'caption']

/**
 * 말풍선 본체의 SVG path 를 생성한다 (꼬리 제외).
 *
 * 좌표계: (0, 0) = 좌상단, (w, h) = 우하단.
 * 반환된 path 는 fabric.Path 에 직접 사용 가능.
 *
 * @param shape 말풍선 모양
 * @param w     너비 (px)
 * @param h     높이 (px)
 * @returns SVG path string
 */
export function buildBubbleBodyPath(shape: BubbleShape, w: number, h: number): string {
  switch (shape) {
    case 'rounded-rect':
      return _roundedRectPath(w, h)
    case 'cloud':
      return _cloudPath(w, h)
    case 'spike':
      return _spikePath(w, h)
    case 'oval':
      return _ovalPath(w, h)
    case 'caption':
      return _captionPath(w, h)
    default: {
      const _exhaustive: never = shape
      return _roundedRectPath(w, h)
    }
  }
}

// ─── 모양별 path 생성 ────────────────────────────────────────────────────────

/**
 * 둥근 사각형 — 일반 대사
 * rx = 너비/높이 중 작은 값의 20%, 최대 20px
 */
function _roundedRectPath(w: number, h: number): string {
  const rx = Math.min(Math.min(w, h) * 0.2, 20)
  return [
    `M ${rx} 0`,
    `L ${w - rx} 0`,
    `Q ${w} 0 ${w} ${rx}`,
    `L ${w} ${h - rx}`,
    `Q ${w} ${h} ${w - rx} ${h}`,
    `L ${rx} ${h}`,
    `Q 0 ${h} 0 ${h - rx}`,
    `L 0 ${rx}`,
    `Q 0 0 ${rx} 0`,
    'Z',
  ].join(' ')
}

/**
 * 구름 — 생각 말풍선
 * 상단과 좌우에 돌출 원호를 추가한 형태
 */
function _cloudPath(w: number, h: number): string {
  // MVP: 둥근 사각형 + 상하 물결 시뮬레이션
  const bumpCount = 7
  const topBumpH = h * 0.12
  let cloudPath = `M ${w * 0.15} 0`

  for (let i = 0; i < bumpCount; i++) {
    const x1 = w * 0.15 + (w * 0.7 * i) / bumpCount
    const x2 = w * 0.15 + (w * 0.7 * (i + 1)) / bumpCount
    const mx = (x1 + x2) / 2
    cloudPath += ` Q ${mx} ${-topBumpH} ${x2} 0`
  }

  cloudPath += [
    ` Q ${w} 0 ${w} ${h * 0.2}`,
    ` Q ${w * 1.08} ${h * 0.5} ${w} ${h * 0.8}`,
    ` Q ${w} ${h} ${w * 0.85} ${h}`,
  ].join('')

  for (let i = bumpCount; i > 0; i--) {
    const x1 = w * 0.15 + (w * 0.7 * i) / bumpCount
    const x2 = w * 0.15 + (w * 0.7 * (i - 1)) / bumpCount
    const mx = (x1 + x2) / 2
    cloudPath += ` Q ${mx} ${h + topBumpH} ${x2} ${h}`
  }

  cloudPath += [
    ` Q 0 ${h} 0 ${h * 0.8}`,
    ` Q ${-w * 0.08} ${h * 0.5} 0 ${h * 0.2}`,
    ' Q 0 0',
    ` ${w * 0.15} 0 Z`,
  ].join('')

  return cloudPath
}

/**
 * 뾰족 — 외침/충격 말풍선
 * 사각형 경계에 불규칙 뾰족 돌출부를 추가
 */
function _spikePath(w: number, h: number): string {
  const cx = w / 2
  const cy = h / 2
  // 8방향 스파이크
  const spikeCount = 16
  const innerR = Math.min(w, h) * 0.35
  const outerR = Math.min(w, h) * 0.5

  let path = ''
  for (let i = 0; i < spikeCount; i++) {
    const angle = (i / spikeCount) * Math.PI * 2
    const isOuter = i % 2 === 0
    const r = isOuter ? outerR : innerR
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    if (i === 0) {
      path = `M ${x} ${y}`
    } else {
      path += ` L ${x} ${y}`
    }
  }
  path += ' Z'
  return path
}

/**
 * 타원 — 부드러운 대사
 */
function _ovalPath(w: number, h: number): string {
  const cx = w / 2
  const cy = h / 2
  const rx = w / 2
  const ry = h / 2
  // SVG 타원을 4개 bezier 로 근사
  const k = 0.5523 // 4/3 * tan(π/8) 근사값

  return [
    `M ${cx} ${cy - ry}`,
    `C ${cx + rx * k} ${cy - ry} ${cx + rx} ${cy - ry * k} ${cx + rx} ${cy}`,
    `C ${cx + rx} ${cy + ry * k} ${cx + rx * k} ${cy + ry} ${cx} ${cy + ry}`,
    `C ${cx - rx * k} ${cy + ry} ${cx - rx} ${cy + ry * k} ${cx - rx} ${cy}`,
    `C ${cx - rx} ${cy - ry * k} ${cx - rx * k} ${cy - ry} ${cx} ${cy - ry}`,
    'Z',
  ].join(' ')
}

/**
 * 캡션 — 내레이션 박스 (꼬리 없음, 직각)
 */
function _captionPath(w: number, h: number): string {
  return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`
}

/**
 * 해당 모양이 꼬리를 가지는지 여부.
 * caption 은 내레이션이므로 꼬리가 없다.
 */
export function shapeHasTail(shape: BubbleShape): boolean {
  return shape !== 'caption'
}

/**
 * 말풍선 모양의 표시 이름 (한국어)
 */
export const BUBBLE_SHAPE_LABELS: Record<BubbleShape, string> = {
  'rounded-rect': '둥근 사각',
  cloud: '구름',
  spike: '외침',
  oval: '타원',
  caption: '내레이션',
}
