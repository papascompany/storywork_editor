/**
 * packages/pdf-engine/src/preflight/profiles.ts
 *
 * 인쇄소 프리플라이트 프로필 3사 정의
 *
 * BookPrint Korea — 도서 표준 (B5/A5)
 * InstaPrint      — 정사각 1:1 인스타 카드
 * ComicMaker      — 만화/콘티 (≤200p, lowDpi 슬롯 허용)
 */

// ─── 프로필 타입 ──────────────────────────────────────────────────────────────

export interface PreflightProfile {
  /** 영문 슬러그 ('bookprint-korea' / 'instaprint' / 'comicmaker') */
  id: string
  name: string
  description: string
  /** 지원 판형 ID 목록 (빈 배열 = 모두 허용) */
  formats: string[]
  bleedMm: {
    /** 최소 bleed mm */
    min: number
    /** 최대 bleed mm (초과 시 info) */
    max: number
  }
  safeMm: {
    /** safe area 최소 mm */
    min: number
  }
  imageDpi: {
    /** 포즈·인물 이미지 최소 dpi */
    minPose: number
    /** 배경 이미지 최소 dpi */
    minBg: number
  }
  /** 폰트 임베드 필수 여부 */
  fontEmbedRequired: boolean
  /** 허용 색공간 (순서대로 선호도 높음) */
  colorSpace: ('rgb' | 'cmyk')[]
  /** 최대 페이지 수 (undefined = 제한 없음) */
  maxPages?: number
  /** 프로필 전용 커스텀 경고 메시지 */
  customWarnings?: string[]
}

// ─── 프로필 3사 ──────────────────────────────────────────────────────────────

export const PROFILE_BOOKPRINT_KOREA: PreflightProfile = {
  id: 'bookprint-korea',
  name: 'BookPrint Korea',
  description: '도서 표준 인쇄 (B5/A5 위주). 엄격한 bleed/safe 요구사항.',
  formats: ['b5', 'a5', 'b5-format', 'a5-format'],
  bleedMm: { min: 3, max: 5 },
  safeMm: { min: 5 },
  imageDpi: { minPose: 300, minBg: 150 },
  fontEmbedRequired: true,
  colorSpace: ['cmyk', 'rgb'],
  maxPages: undefined,
  customWarnings: [
    '투명도(opacity < 1) 객체는 인쇄 시 의도치 않은 색상 변화가 발생할 수 있습니다.',
  ],
}

export const PROFILE_INSTAPRINT: PreflightProfile = {
  id: 'instaprint',
  name: 'InstaPrint',
  description: '정사각 1:1 인스타 카드 인쇄. 모바일 출판 최적화.',
  formats: ['square', 'square-format', '1:1'],
  bleedMm: { min: 2, max: 4 },
  safeMm: { min: 4 },
  imageDpi: { minPose: 200, minBg: 150 },
  fontEmbedRequired: true,
  colorSpace: ['rgb', 'cmyk'],
  maxPages: 1,
  customWarnings: [
    '인스타 카드는 1페이지만 허용됩니다.',
    '정사각 판형(1:1 비율)이 아니면 인쇄 품질이 저하될 수 있습니다.',
  ],
}

export const PROFILE_COMICMAKER: PreflightProfile = {
  id: 'comicmaker',
  name: 'ComicMaker',
  description: '만화/콘티 전문 인쇄. 페이지 수 ≤ 200. lowDpi 슬롯 허용.',
  formats: [],
  bleedMm: { min: 3, max: 5 },
  safeMm: { min: 5 },
  imageDpi: { minPose: 200, minBg: 72 },
  fontEmbedRequired: true,
  colorSpace: ['rgb', 'cmyk'],
  maxPages: 200,
  customWarnings: [
    '말풍선 내 텍스트는 safe area 안쪽에 위치해야 합니다.',
    '만화 특성상 말풍선 꼬리가 bleed 영역을 침범하지 않도록 주의하세요.',
  ],
}

/** 전체 프로필 목록 */
export const PROFILES: PreflightProfile[] = [
  PROFILE_BOOKPRINT_KOREA,
  PROFILE_INSTAPRINT,
  PROFILE_COMICMAKER,
]

/** ID로 프로필 조회 */
export function getProfileById(id: string): PreflightProfile | undefined {
  return PROFILES.find((p) => p.id === id)
}
