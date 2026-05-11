// ─────────────────────────────────────────────
// text-object.ts — fabric Textbox 생성 헬퍼
//
// 한글 splitByGrapheme, fallback 폰트 스택 적용.
// React/DOM 의존 없음 — 노드 환경 테스트 가능.
// ─────────────────────────────────────────────

import type { FabricObject } from 'fabric'

// ─── 기본 폰트 스택 ────────────────────────────────────────────────────────────

/**
 * 지원 폰트 목록 (MVP 3종).
 * Pretendard, Noto Sans KR 은 앱에서 font-face 선언 필요.
 */
export const SUPPORTED_FONTS = ['Pretendard', 'Noto Sans KR', 'system-ui'] as const
export type SupportedFont = (typeof SUPPORTED_FONTS)[number]

// ─── TextObject 옵션 ────────────────────────────────────────────────────────────

export type CreateTextObjectOptions = {
  /** 초기 텍스트 */
  text?: string
  /** 좌상단 위치 (px, 캔버스 좌표) */
  left?: number
  top?: number
  /** 폰트 */
  fontFamily?: SupportedFont
  /** 폰트 크기 (px) */
  fontSize?: number
  /** 색상 */
  fill?: string
  /** 정렬 */
  textAlign?: 'left' | 'center' | 'right'
  /** 굵기 */
  fontWeight?: 'normal' | 'bold'
  /** 기울임 */
  fontStyle?: 'normal' | 'italic'
  /** 밑줄 */
  underline?: boolean
  /** 줄간격 배수 */
  lineHeight?: number
  /** 자간 */
  charSpacing?: number
  /** 텍스트박스 너비 (px) */
  width?: number
}

/**
 * fabric Textbox 객체를 생성한다.
 * fabric 은 런타임에만 주입 (헤드리스 환경에서 import 분리).
 */
export async function createTextObject(opts: CreateTextObjectOptions = {}): Promise<FabricObject> {
  const { Textbox } = await import('fabric')

  const text = opts.text ?? '텍스트를 입력하세요'
  const fontFamily = opts.fontFamily ?? 'Pretendard'

  const obj = new Textbox(text, {
    left: opts.left ?? 100,
    top: opts.top ?? 100,
    width: opts.width ?? 200,
    fontFamily,
    fontSize: opts.fontSize ?? 24,
    fill: opts.fill ?? '#111111',
    textAlign: opts.textAlign ?? 'left',
    fontWeight: opts.fontWeight ?? 'normal',
    fontStyle: opts.fontStyle ?? 'normal',
    underline: opts.underline ?? false,
    lineHeight: opts.lineHeight ?? 1.4,
    charSpacing: opts.charSpacing ?? 0,
    // 한글 음절 단위 줄바꿈 (CLAUDE.md §2.4)
    splitByGrapheme: true,
  })

  return obj as unknown as FabricObject
}

// ─── 금칙어 처리 ──────────────────────────────────────────────────────────────

/**
 * 행 끝에 오면 안 되는 문자 (한국어 금칙 기준).
 * fabric Textbox 의 splitByGrapheme 와 병행 사용.
 * 실제 금칙 처리는 렌더링 레벨에서 fabric 이 담당하므로
 * 여기서는 사용자 입력 후 공백 패딩 헬퍼만 제공한다.
 */
export const LINE_END_FORBIDDEN = new Set([
  ',',
  '.',
  '?',
  '!',
  '"',
  "'",
  '」',
  '』',
  '）',
  '》',
  ']',
  '}',
  '，',
  '。',
  '？',
  '！',
])

/**
 * 텍스트에서 금칙어가 행 끝에 왔는지 감지.
 * (단순 검증용 — 실제 줄바꿈은 fabric 이 처리)
 */
export function hasForbiddenLineEnd(text: string): boolean {
  const lines = text.split('\n')
  return lines.some((line) => {
    const trimmed = line.trimEnd()
    if (trimmed.length === 0) return false
    return LINE_END_FORBIDDEN.has(trimmed[trimmed.length - 1] ?? '')
  })
}
