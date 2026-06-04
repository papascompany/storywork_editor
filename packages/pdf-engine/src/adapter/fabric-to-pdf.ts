/**
 * packages/pdf-engine/src/adapter/fabric-to-pdf.ts
 *
 * PageJsonV1 fabricJson → 렌더 명령(RenderCommand[]) 변환 어댑터
 *
 * - ADR-0006: fabricJson Schema v1 in-place 수정 금지 → 읽기 전용 파싱만
 * - ADR-0008: 벡터 우선. 알려진 한계: shadow/filter 는 래스터 폴백 플래그 설정
 *
 * 좌표 변환은 page-renderer.ts 에서 mm→pt + y-flip 처리.
 * 여기서는 fabric 객체를 RenderCommand 로 1:1 매핑만 한다.
 */

import type { LayerJson } from '@storywork/schema/editor'

// ─── 렌더 명령 타입 ──────────────────────────────────────────────────────────

export interface RectCommand {
  kind: 'rect'
  /** mm */
  x: number
  y: number
  width: number
  height: number
  fill: { r: number; g: number; b: number }
  opacity: number
  rotation: number
}

export interface ImageCommand {
  kind: 'image'
  x: number
  y: number
  width: number
  height: number
  /** 이미지 URL (퍼블릭 또는 서명 URL) */
  url: string
  opacity: number
  rotation: number
  /** 래스터 폴백 필요 여부 (filter 존재 시) */
  needsRaster: boolean
}

export interface TextCommand {
  kind: 'text'
  x: number
  y: number
  width: number
  height: number
  text: string
  fontSize: number
  /** 헥스 컬러 */
  color: string
  fontFamily: string
  opacity: number
  rotation: number
}

export interface BubbleCommand {
  kind: 'bubble'
  x: number
  y: number
  width: number
  height: number
  fill: { r: number; g: number; b: number }
  stroke: { r: number; g: number; b: number }
  strokeWidth: number
  opacity: number
  rotation: number
  bubbleType: 'rounded' | 'cloud' | 'shout' | 'oval' | 'narration' | 'unknown'
  /** 말풍선 꼬리 방향 (0=없음, 각도 deg) */
  tailAngle?: number
}

export interface GroupCommand {
  kind: 'group'
  x: number
  y: number
  width: number
  height: number
  opacity: number
  rotation: number
  children: RenderCommand[]
}

export interface SkipCommand {
  kind: 'skip'
  reason: string
}

export type RenderCommand =
  | RectCommand
  | ImageCommand
  | TextCommand
  | BubbleCommand
  | GroupCommand
  | SkipCommand

// ─── 어댑터 ──────────────────────────────────────────────────────────────────

/** fabric 에서 숫자 값 추출 (없으면 기본값) */
function num(obj: Record<string, unknown>, key: string, fallback = 0): number {
  const v = obj[key]
  return typeof v === 'number' ? v : fallback
}

/** fabric 에서 문자열 값 추출 */
function str(obj: Record<string, unknown>, key: string, fallback = ''): string {
  const v = obj[key]
  return typeof v === 'string' ? v : fallback
}

/** CSS/fabric 색상 문자열 → RGB (0-255) */
function parseColor(color: string): { r: number; g: number; b: number } {
  // #rrggbb
  const hex6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color)
  if (hex6 && hex6[1] !== undefined && hex6[2] !== undefined && hex6[3] !== undefined) {
    return {
      r: parseInt(hex6[1], 16),
      g: parseInt(hex6[2], 16),
      b: parseInt(hex6[3], 16),
    }
  }
  // #rgb
  const hex3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(color)
  if (hex3 && hex3[1] !== undefined && hex3[2] !== undefined && hex3[3] !== undefined) {
    return {
      r: parseInt(hex3[1] + hex3[1], 16),
      g: parseInt(hex3[2] + hex3[2], 16),
      b: parseInt(hex3[3] + hex3[3], 16),
    }
  }
  // rgb(r,g,b)
  const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(color)
  if (rgb && rgb[1] !== undefined && rgb[2] !== undefined && rgb[3] !== undefined) {
    return {
      r: parseInt(rgb[1], 10),
      g: parseInt(rgb[2], 10),
      b: parseInt(rgb[3], 10),
    }
  }
  // 기본 검정
  return { r: 0, g: 0, b: 0 }
}

/** fabric 좌표 (center-based) → top-left mm */
function fabricCenterToTopLeft(fabricObj: Record<string, unknown>): {
  x: number
  y: number
  width: number
  height: number
} {
  const left = num(fabricObj, 'left')
  const top = num(fabricObj, 'top')
  const width = num(fabricObj, 'width', 100)
  const height = num(fabricObj, 'height', 100)
  const scaleX = num(fabricObj, 'scaleX', 1)
  const scaleY = num(fabricObj, 'scaleY', 1)
  const scaledW = width * scaleX
  const scaledH = height * scaleY

  // fabric originX/originY 기본 'left'/'top' (편집기 기본값)
  // 단, 일부 객체는 center 기반 — origin 체크
  const originX = str(fabricObj, 'originX', 'left')
  const originY = str(fabricObj, 'originY', 'top')

  let x = left
  let y = top
  if (originX === 'center') x = left - scaledW / 2
  if (originY === 'center') y = top - scaledH / 2

  return { x, y, width: scaledW, height: scaledH }
}

/** LayerJson 하나 → RenderCommand 하나 */
function convertLayer(layer: LayerJson): RenderCommand {
  const fab = layer.fabric as Record<string, unknown>
  const pos = fabricCenterToTopLeft(fab)
  const opacity = num(fab, 'opacity', 1)
  const rotation = num(fab, 'angle', 0)

  switch (layer.kind) {
    case 'bg': {
      const fillRaw = str(fab, 'fill', '#ffffff')
      return {
        kind: 'rect',
        ...pos,
        fill: parseColor(fillRaw),
        opacity,
        rotation,
      }
    }

    case 'pose':
    case 'prop':
    case 'decoration': {
      const data = layer.data as Record<string, unknown>
      const meta = (data['meta'] ?? {}) as Record<string, unknown>
      const url =
        (meta['fileUrl'] as string | undefined) ??
        (meta['url'] as string | undefined) ??
        (meta['src'] as string | undefined) ??
        (fab['src'] as string | undefined) ??
        ''
      const filters = fab['filters']
      const needsRaster = Array.isArray(filters) && filters.length > 0
      if (!url) {
        return { kind: 'skip', reason: `${layer.kind} layer(${layer.id}) has no url` }
      }
      return {
        kind: 'image',
        ...pos,
        url,
        opacity,
        rotation,
        needsRaster,
      }
    }

    case 'text': {
      // fabric IText / Textbox
      const textRaw = str(fab, 'text', '')
      const fontSize = num(fab, 'fontSize', 14)
      const fill = str(fab, 'fill', '#000000')
      const fontFamily = str(fab, 'fontFamily', 'Pretendard')
      return {
        kind: 'text',
        ...pos,
        text: textRaw,
        fontSize,
        color: fill,
        fontFamily,
        opacity,
        rotation,
      }
    }

    case 'bubble': {
      // speech-bubble 객체
      const data = layer.data as Record<string, unknown>
      const meta = (data['meta'] ?? {}) as Record<string, unknown>
      const bubbleType =
        (meta['bubbleType'] as BubbleCommand['bubbleType'] | undefined) ?? 'rounded'
      const tailAngle = meta['tailAngle'] as number | undefined
      const fillRaw = str(fab, 'fill', '#ffffff')
      const strokeRaw = str(fab, 'stroke', '#000000')
      const strokeWidth = num(fab, 'strokeWidth', 1)
      return {
        kind: 'bubble',
        ...pos,
        fill: parseColor(fillRaw),
        stroke: parseColor(strokeRaw),
        strokeWidth,
        opacity,
        rotation,
        bubbleType,
        tailAngle,
      }
    }

    case 'fx': {
      // 워드효과 — 이미지 or 텍스트 형태. 현재는 이미지로 처리
      const data = layer.data as Record<string, unknown>
      const meta = (data['meta'] ?? {}) as Record<string, unknown>
      const url =
        (meta['fileUrl'] as string | undefined) ?? (fab['src'] as string | undefined) ?? ''
      if (!url) {
        return { kind: 'skip', reason: `fx layer(${layer.id}) has no url` }
      }
      return {
        kind: 'image',
        ...pos,
        url,
        opacity,
        rotation,
        needsRaster: false,
      }
    }

    case 'group': {
      const children = (layer.children ?? []).map(convertLayer)
      return {
        kind: 'group',
        ...pos,
        opacity,
        rotation,
        children,
      }
    }

    default: {
      return { kind: 'skip', reason: `unknown layer kind: ${layer.kind}` }
    }
  }
}

// ─── 공개 함수 ──────────────────────────────────────────────────────────────

export interface AdapterResult {
  commands: RenderCommand[]
  /** 건너뛴 레이어 경고 */
  warnings: string[]
}

/**
 * PageJsonV1 의 layers 배열 → RenderCommand[] 변환
 *
 * @param layers PageJsonV1.layers (읽기 전용)
 */
export function fabricLayersToCommands(layers: LayerJson[]): AdapterResult {
  const commands: RenderCommand[] = []
  const warnings: string[] = []

  for (const layer of layers) {
    const cmd = convertLayer(layer)
    commands.push(cmd)
    if (cmd.kind === 'skip') {
      warnings.push(`[adapter] ${cmd.reason}`)
    }
  }

  return { commands, warnings }
}
