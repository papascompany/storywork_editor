// ─────────────────────────────────────────────
// seed.ts — 임시 편집기 데이터 (M2 포즈 라이브러리 구현 전 Placeholder)
// ─────────────────────────────────────────────

import type { Format } from '@storywork/editor-core'

/**
 * DEFAULT_FORMAT — B5 판형 (182mm × 257mm × 300dpi)
 */
export const DEFAULT_FORMAT: Format = {
  id: 'b5-300dpi',
  widthMm: 182,
  heightMm: 257,
  dpi: 300,
}

/**
 * 1×1 투명 PNG DataURL — M2 포즈 라이브러리 구현 전 임시 placeholder.
 * 실제 포즈는 M2 후 Supabase Storage URL 로 대체된다.
 */
export const SEED_POSE_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

/**
 * seedBackgroundFill — 단색 배경(연한 회색) CSS 컬러
 */
export const SEED_BACKGROUND_FILL = '#f3f4f6'

/**
 * localStorage 저장 키
 */
export const AUTOSAVE_STORAGE_KEY = 'sw-editor-autosave-v1'
