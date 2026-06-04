/**
 * @storywork/pdf-engine — 공개 타입 정의
 *
 * PdfBuildInput  : buildPdf() 입력
 * PdfBuildResult : buildPdf() 출력
 * PdfBuildOptions: 빌더 동작 제어
 *
 * ADR-0007 결정론: 같은 입력 + 같은 seed → 같은 PDF 바이트
 * ADR-0008 벡터 우선: pdf-lib 직접 렌더, 폴백만 래스터
 */

// ─── 입력 ─────────────────────────────────────────────────────────────────────

/** 인쇄 판형 규격 (Format 모델 subset) */
export interface PdfFormat {
  widthMm: number
  heightMm: number
  /** 해상도 — 이미지 임베드 최소 기준 (e.g. 300) */
  dpi: number
  /** 재단여유 mm (기본 3) */
  bleedMm: number
  /** 안전영역 mm (bleed 안쪽 5) */
  safeMm: number
}

/** 배경 톤 6종 — DESIGN-nike SSOT */
export type CoverTone = 'cream' | 'mint' | 'lilac' | 'pink' | 'navy' | 'white'

/** 표지 옵션 */
export interface CoverInput {
  title?: string
  subtitle?: string
  authorName?: string
  /** 표지 커버 이미지 URL (퍼블릭 또는 서명 URL) */
  coverImageUrl?: string
  backgroundTone?: CoverTone
}

/** 페이지 입력 */
export interface PageInput {
  pageIndex: number
  /** editor-core PageJsonV1 직렬화 object — 변경 금지(ADR-0006) */
  fabricJson: object
  /** 미리보기 썸네일 URL (사용 안 할 수도 있음) */
  thumbnail?: string
}

/** buildPdf() 메인 입력 */
export interface PdfBuildInput {
  formatId: string
  format: PdfFormat
  title: string
  author?: string
  pages: PageInput[]
  cover?: CoverInput
  /**
   * 결정론 시드 (기본 0).
   * 동일 시드 → 동일 PDF 바이트(CreationDate 고정 등).
   */
  seed?: number
}

// ─── 출력 ─────────────────────────────────────────────────────────────────────

/** buildPdf() 출력 */
export interface PdfBuildResult {
  /** 최종 PDF 바이트 */
  pdfBuffer: Uint8Array
  pageCount: number
  byteSize: number
  /** bleed 침범 / lowDpi 등 비치명 경고 */
  warnings: string[]
  metadata: {
    title: string
    author?: string
    /** 항상 'StoryWork PDF Engine v0.1' */
    producer: string
    /** ISO 8601 — 결정론 시드 기반 고정값 */
    creationDate: string
  }
}

// ─── 옵션 ─────────────────────────────────────────────────────────────────────

/** buildPdf() 동작 제어 옵션 */
export interface PdfBuildOptions {
  /** 폴백 래스터 허용 (기본 false, 벡터 우선) */
  raster?: boolean
  /** Pretendard ttf 임베드 (기본 true) */
  embedFonts?: boolean
  /** 표지 페이지 포함 (기본: cover 있으면 true) */
  withCover?: boolean
  /**
   * 결정론 메타데이터 날짜 오버라이드.
   * ISO 8601 문자열. 미지정 시 seed 기반 계산.
   */
  metadataDate?: string
  /** 각 페이지 bleed/safe 가이드 라인 시각화 (기본 false) */
  showGuides?: boolean
}

// ─── 내부 상수 ───────────────────────────────────────────────────────────────

/** 1mm = 2.83465pt (PDF point 단위 변환) */
export const MM_TO_PT = 2.83465 as const

/** PDF 생산자 문자열 */
export const PDF_PRODUCER = 'StoryWork PDF Engine v0.1' as const

/** 결정론 기준 에포크 (seed 0 → 2024-01-01T00:00:00Z) */
export const SEED_EPOCH_MS = 1704067200000 as const
