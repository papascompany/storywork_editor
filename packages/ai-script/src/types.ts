/**
 * @storywork/ai-script — 공유 타입 정의
 *
 * 결정론 시드 + alternatives 패턴 (CLAUDE.md §5.1)
 * LLM 활성 여부: STORYWORK_LLM=1 (로컬/명시) | 기본 off (CI 비용 보호)
 */

// ─────────────────────────────────────────────
// 입력 형식
// ─────────────────────────────────────────────

export type ScriptInputFormat = 'auto' | 'novel' | 'screenplay' | 'essay' | 'diary' | 'light-novel'

// ─────────────────────────────────────────────
// 장면 메타 — AI 가 추출하는 시맨틱 정보
// ─────────────────────────────────────────────

export type CameraAngle = 'closeup' | 'medium' | 'wide' | 'bird-eye' | 'low-angle'
export type Pacing = 'fast' | 'normal' | 'slow'
export type TimeOfDay = 'morning' | 'noon' | 'evening' | 'night'

export interface SceneMeta {
  location?: string
  timeOfDay?: TimeOfDay
  cameraAngle?: CameraAngle
  pacing?: Pacing
  /** tense / calm / comic / dark / romantic / action ... */
  mood?: string
  /** happy / sad / angry / surprised / neutral / tense ... */
  emotion?: string
  /** front / side / back / three-quarter */
  view?: 'front' | 'side' | 'back' | 'three-quarter'
  props?: string[]
  pageBreak?: boolean
}

// ─────────────────────────────────────────────
// 분석 결과 단위
// ─────────────────────────────────────────────

/**
 * 라인 종류 (SCRIPT-KO-04).
 *
 * 종전에는 모든 라인이 구분 없이 말풍선 슬롯을 차지해, 지문·서술이 대사와 같은 자리를
 * 두고 경쟁하며 페이지를 부풀렸다(LAYOUT-03 실측: 화자 없는 라인 비율 essay 96.2% ·
 * diary 90.7% · novel 56.5% · screenplay 27.2%).
 *
 *  - `dialogue`  인물의 발화 → 말풍선
 *  - `narration` 서술·내레이션 → 캡션 박스
 *  - `direction` 지문(무대 지시·행동 묘사) → 캡션 박스
 *
 * 장면 헤딩(`S#1. 병원 응급실 / 밤`)은 라인이 아니라 `SceneMeta.location/timeOfDay` 로
 * 흡수한다 — 배치 대상이 아니라 장면의 속성이기 때문이다.
 */
export type LineKind = 'dialogue' | 'narration' | 'direction'

export interface AnalyzedLine {
  index: number
  speaker?: string
  text: string
  /** 장면 내 텍스트 바이트 오프셋 (경계 계산용) */
  offset?: number
  /**
   * 라인 종류 (SCRIPT-KO-04).
   * 파서는 항상 채우지만, 이 필드 도입 이전에 저장된 SceneDoc 에는 없다 —
   * 소비 측은 `lineKindOf()` 로 읽어 화자 유무 기반 폴백을 거친다.
   */
  kind?: LineKind
}

export interface AnalyzedScene {
  index: number
  /** URL-safe 슬러그 (scene-01 등) */
  slug: string
  /** 한 줄 요약 */
  summary: string
  meta: SceneMeta
  lines: AnalyzedLine[]
  /** 이 장면에 등장하는 화자 이름 리스트 */
  characters: string[]
  /** 0~1 신뢰도 */
  confidence: number
}

export interface DetectedCharacter {
  name: string
  mentionCount: number
  /** 룰-only 추정 신체 유형 */
  suggestedBodyType?: 'M' | 'F' | 'child'
}

// ─────────────────────────────────────────────
// 최종 분석 결과
// ─────────────────────────────────────────────

export interface AnalyzeResult {
  /** 감지된 입력 형식 */
  format: ScriptInputFormat
  scenes: AnalyzedScene[]
  characters: DetectedCharacter[]
  /** K=5 대안 분석 결과 (seed 변화) — LLM 활성 시 채워짐 */
  alternatives?: AnalyzeResult[]
  seed: number
  /** 사용된 모델 버전 ("rule-only" | "claude-sonnet-4-6" 등) */
  modelVersion: string
}

// ─────────────────────────────────────────────
// 옵션
// ─────────────────────────────────────────────

export interface AnalyzeOptions {
  /** 결정론 시드 (기본: 0) */
  seed?: number
  format?: ScriptInputFormat
  /** 대안 분석 최대 수 (기본: 5) */
  maxAlternatives?: number
  /** LLM 활성 (기본: STORYWORK_LLM 환경변수 기준) */
  llmEnabled?: boolean
}
