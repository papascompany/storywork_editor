/**
 * script-importer 공유 타입 (M4-04 Step 2)
 *
 * Wizard 내부 상태 + API 응답 타입 정의.
 * 클라이언트 전용 — 서버 import 없음.
 */

// ─── Wizard 단계 ──────────────────────────────────────────────────────────────

// CONTI-03: 'conti'(콘티 확정) 단계 — 무영속 분석 결과를 확인·확정한 뒤에만
// full-pipeline(영속화)을 호출한다 (대본 → 콘티 확정 → 페이지 생성)
export type WizardStep = 'input' | 'format-check' | 'character-map' | 'conti' | 'preview'

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

// ─── 콘티(무영속 분석) 응답 — /api/script/analyze 의 소비 필드만 (CONTI-03) ────

export interface ContiLine {
  index: number
  speaker?: string
  text: string
}

export interface ContiScene {
  index: number
  slug: string
  summary: string
  lines: ContiLine[]
  characters: string[]
  meta: { emotion?: string }
}

export interface ContiAnalyzeResponse {
  scenes: ContiScene[]
  characters: Array<{ name: string; mentionCount: number }>
  seed: number
  /** 'rule-only' | LLM 모델명 — rule-only 는 시드 변주가 no-op 이라 재생성 버튼 숨김 */
  modelVersion: string
}

// ─── Wizard 전체 상태 ─────────────────────────────────────────────────────────

export interface WizardState {
  step: WizardStep
  scriptRaw: string
  selectedFormatId: string
  detectedFormat: string | null
  characterEntries: CharacterMapEntry[]
  /**
   * 결정론 시드 (ADR-0007) — 초기 0 고정. 콘티 단계의 "재생성" 버튼만 +1 한다.
   * (구 Math.random 시드는 재현 불가라 제거 — research 2026-07-21 §2.2)
   */
  seed: number
  isGenerating: boolean
  generationError: string | null
  /** 콘티(무영속 분석) 결과 — conti 단계 데이터 소스 */
  conti: ContiAnalyzeResponse | null
  /** conti 를 만든 대본 스냅샷 — 동일 대본 재진입 시 재분석/제외 초기화 방지 */
  analyzedScriptRaw: string | null
  /** 콘티 확정에서 제외한 컷(Scene.index) */
  excludedSceneIndices: number[]
  /**
   * 확정으로 생성된 Project.id — 재확정 시 재사용(덮어쓰기)해
   * '새 콘티' 중복 프로젝트가 누적되지 않게 한다
   */
  projectId: string | null
  result: FullPipelineResponse | null
}
