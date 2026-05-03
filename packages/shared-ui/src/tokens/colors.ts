/**
 * StoryWork 컬러 토큰
 *
 * 규칙: 직접 hex 값을 사용하지 말고 반드시 이 토큰 또는 CSS 변수를 사용하십시오.
 * 사용법: `var(--color-brand-500)` 또는 Tailwind `text-brand-500`
 */

// ─── Brand Scale (보라/파랑 계열) ─────────────────────────────────────────────
export const brand = {
  50: '#f0f0ff',
  100: '#e0e0ff',
  200: '#c4c4fe',
  300: '#a3a3fd',
  400: '#8080fb',
  500: '#6366f1', // 메인 브랜드
  600: '#4f46e5',
  700: '#4338ca',
  800: '#3730a3',
  900: '#312e81',
  950: '#1e1b4b',
} as const

// ─── Accent Scale (시안) ──────────────────────────────────────────────────────
export const accent = {
  50: '#ecfeff',
  100: '#cffafe',
  200: '#a5f3fc',
  300: '#67e8f9',
  400: '#22d3ee',
  500: '#06b6d4', // 메인 accent
  600: '#0891b2',
  700: '#0e7490',
  800: '#155e75',
  900: '#164e63',
  950: '#083344',
} as const

// ─── Role Colors ──────────────────────────────────────────────────────────────
/** pose: 핑크 계열 */
export const pose = {
  50: '#fdf2f8',
  100: '#fce7f3',
  200: '#fbcfe8',
  300: '#f9a8d4',
  400: '#f472b6',
  500: '#ec4899',
  600: '#db2777',
  700: '#be185d',
  800: '#9d174d',
  900: '#831843',
  950: '#500724',
} as const

/** background: 블루 계열 */
export const background = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
  950: '#172554',
} as const

/** bubble: 에메랄드 계열 */
export const bubble = {
  50: '#ecfdf5',
  100: '#d1fae5',
  200: '#a7f3d0',
  300: '#6ee7b7',
  400: '#34d399',
  500: '#10b981',
  600: '#059669',
  700: '#047857',
  800: '#065f46',
  900: '#064e3b',
  950: '#022c22',
} as const

/** fx: 워드효과, 옐로우 계열 */
export const fx = {
  50: '#fefce8',
  100: '#fef9c3',
  200: '#fef08a',
  300: '#fde047',
  400: '#facc15',
  500: '#eab308',
  600: '#ca8a04',
  700: '#a16207',
  800: '#854d0e',
  900: '#713f12',
  950: '#422006',
} as const

/** template: 라일락 계열 */
export const template = {
  50: '#faf5ff',
  100: '#f3e8ff',
  200: '#e9d5ff',
  300: '#d8b4fe',
  400: '#c084fc',
  500: '#a855f7',
  600: '#9333ea',
  700: '#7e22ce',
  800: '#6b21a8',
  900: '#581c87',
  950: '#3b0764',
} as const

/** pdf: 오렌지 계열 */
export const pdf = {
  50: '#fff7ed',
  100: '#ffedd5',
  200: '#fed7aa',
  300: '#fdba74',
  400: '#fb923c',
  500: '#f97316',
  600: '#ea580c',
  700: '#c2410c',
  800: '#9a3412',
  900: '#7c2d12',
  950: '#431407',
} as const

/** ai: 시안 (accent 와 동일 팔레트, semantic alias) */
export const ai = accent

// ─── Status ───────────────────────────────────────────────────────────────────
export const status = {
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  error: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
    950: '#4c0519',
  },
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },
} as const

// ─── Neutral (gray) ───────────────────────────────────────────────────────────
export const neutral = {
  0: '#ffffff',
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',
  800: '#1f2937',
  900: '#111827',
  950: '#030712',
  1000: '#000000',
} as const

// ─── Semantic Surface / Text / Border ────────────────────────────────────────
/**
 * CSS 변수로 주입됩니다 (globals.css 참조).
 * 다크모드에서 자동으로 오버라이드됩니다.
 */
export const semantic = {
  /** 페이지 배경 */
  surface: 'var(--color-surface)',
  /** 카드/패널 배경 */
  surfaceRaised: 'var(--color-surface-raised)',
  /** 호버/강조 배경 */
  surfaceMuted: 'var(--color-surface-muted)',
  /** 기본 텍스트 */
  text: 'var(--color-text)',
  /** 보조 텍스트 */
  textMuted: 'var(--color-text-muted)',
  /** 비활성 텍스트 */
  textDisabled: 'var(--color-text-disabled)',
  /** 역색상 텍스트 (어두운 배경 위 흰색 등) */
  textInverse: 'var(--color-text-inverse)',
  /** 기본 테두리 */
  border: 'var(--color-border)',
  /** 강조 테두리 */
  borderFocus: 'var(--color-border-focus)',
} as const

export const colors = {
  brand,
  accent,
  pose,
  background,
  bubble,
  fx,
  template,
  pdf,
  ai,
  status,
  neutral,
  semantic,
} as const

export type Colors = typeof colors
