// ─────────────────────────────────────────────
// @storywork/editor-export — 공개 타입 정의
// React/DOM 에 의존하지 않습니다.
// ─────────────────────────────────────────────

import type { LayerNodeJson } from '@storywork/editor-layers'
import type { PageJsonV1 } from '@storywork/schema/editor'

// ─── PNG 내보내기 ───

export type ExportPngOptions = {
  /**
   * 렌더 스케일.
   * 1 = 원본 크기, 2 = Retina 2배. 기본값 2.
   */
  scale?: number
  /**
   * 배경색 CSS color 문자열. 기본값 'transparent'.
   * fabric canvas 의 backgroundColor 를 임시 재정의해 렌더한다.
   */
  background?: string
  /**
   * bleed 영역 포함 여부. 기본값 false.
   * (M6 이전 — 현재는 항상 false, 플래그 예약)
   */
  bleed?: boolean
  /** 출력 MIME 타입. 기본값 'image/png'. */
  format?: 'image/png' | 'image/jpeg' | 'image/webp'
  /**
   * jpeg / webp 한정 품질 0..1. 기본값 0.92.
   */
  quality?: number
}

export type ExportPngResult = {
  blob: Blob
  /** 결과 이미지 픽셀 너비 */
  width: number
  /** 결과 이미지 픽셀 높이 */
  height: number
  scale: number
  mimeType: string
}

// ─── JSON 내보내기 ───

export type ExportJsonResult = {
  page: PageJsonV1
  layers: LayerNodeJson[]
}

// ─── PDF 잡 트리거 (Mock — M6 본격 구현) ───

export type RequestPdfOptions = {
  /** 워커 엔드포인트. 기본값 '/api/pdf'. */
  endpoint?: string
  /** 인쇄 사양 — pdf-engine 이 해석한다. */
  spec?: Record<string, unknown>
}

export type RequestPdfResult = {
  jobId: string
  statusUrl?: string
}
