/**
 * script-importer 공유 타입 (M4-04 Step 2)
 *
 * Wizard 내부 상태 + API 응답 타입 정의.
 * 클라이언트 전용 — 서버 import 없음.
 */

// ─── Wizard 단계 ──────────────────────────────────────────────────────────────

export type WizardStep = 'input' | 'format-check' | 'character-map' | 'preview'

// ─── 판형 프리셋 ──────────────────────────────────────────────────────────────

export interface FormatPreset {
  id: string
  label: string
  description: string
  widthMm: number
  heightMm: number
  dpi: number
}

export const FORMAT_PRESETS: FormatPreset[] = [
  {
    id: 'preset-b5-novel',
    label: 'B5 소설 (130×200mm)',
    description: '가장 일반적인 단행본 규격',
    widthMm: 128,
    heightMm: 182,
    dpi: 350,
  },
  {
    id: 'preset-a5-artbook',
    label: 'A5 아트북 (148×210mm)',
    description: '아트북·만화 적합',
    widthMm: 148,
    heightMm: 210,
    dpi: 350,
  },
  {
    id: 'preset-square',
    label: '정사각형 (150×150mm)',
    description: 'SNS·포스터 적합',
    widthMm: 150,
    heightMm: 150,
    dpi: 300,
  },
  {
    id: 'preset-mobile-story',
    label: '모바일 웹툰 (690×1280px)',
    description: '세로 스크롤 웹툰',
    widthMm: 183,
    heightMm: 339,
    dpi: 96,
  },
]

// ─── 캐릭터 매핑 항목 ─────────────────────────────────────────────────────────

export interface CharacterMapEntry {
  /** 대본에서 추출된 화자명 */
  scriptName: string
  /** 매핑된 Character.id (null = 더미맨 사용) */
  characterId: string | null
}

// ─── full-pipeline API 응답 ────────────────────────────────────────────────────

export interface FullPipelineResponse {
  projectId: string
  pages: Array<{ id: string; pageIndex: number; thumbnail: null }>
  scenes: Array<{ id: string; index: number; summary: string }>
  warnings: string[]
  seed: number
  redirectTo: string
}

// ─── Wizard 전체 상태 ─────────────────────────────────────────────────────────

export interface WizardState {
  step: WizardStep
  scriptRaw: string
  selectedFormatId: string
  detectedFormat: string | null
  characterEntries: CharacterMapEntry[]
  seed: number
  isGenerating: boolean
  generationError: string | null
  result: FullPipelineResponse | null
}
