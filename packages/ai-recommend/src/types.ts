/**
 * @storywork/ai-recommend — 추천 타입 정의 (M4-02)
 *
 * AnalyzeResult(scenes + characters + scene.meta) 를 입력 받아
 * 각 장면에 어울리는 포즈/배경/말풍선/소품을 추천한다.
 *
 * 결정론 원칙: 같은 seed + 같은 입력 → 같은 출력 (CLAUDE.md §5.1)
 */

import type { AnalyzeResult, AnalyzedScene, SceneMeta } from '@storywork/ai-script'

// re-export for convenience
export type { AnalyzeResult, AnalyzedScene, SceneMeta }

// ─────────────────────────────────────────────
// 포즈 추천
// ─────────────────────────────────────────────

export interface PoseCandidate {
  /** Resource.id */
  resourceId: string
  /** Character.id */
  characterId: string
  /** 'walking' | 'surprised' | 'standing' | ... */
  poseAction: string
  /** 0~1 신뢰도 */
  confidence: number
  /** 추천 이유 (예: "walking + outdoor mood") */
  reasoning: string
  /** 대안 후보 (resourceId 목록) */
  alternatives?: string[]
}

// ─────────────────────────────────────────────
// 배경 추천 (1차: 색상 톤, 향후 배경 자산 도입)
// ─────────────────────────────────────────────

export type BgTone = 'cream' | 'mint' | 'lilac' | 'pink' | 'navy' | 'white'

export interface BackgroundCandidate {
  suggestedTone: BgTone
  reasoning: string
}

// ─────────────────────────────────────────────
// 말풍선 추천
// ─────────────────────────────────────────────

export type BubbleShape = 'rounded' | 'cloud' | 'shout' | 'oval' | 'narration'

export interface BubbleCandidate {
  shape: BubbleShape
  tailToSpeaker: boolean
  reasoning: string
}

// ─────────────────────────────────────────────
// 워드 효과 추천
// ─────────────────────────────────────────────

export type WordFxScope = 'narration' | 'shout' | 'whisper'

export interface WordFxCandidate {
  /** 'shadow-soft' | 'outline-bold' | 'neon-glow' | ... */
  effectName: string
  scope: WordFxScope
  reasoning: string
}

// ─────────────────────────────────────────────
// 장면별 추천 결과
// ─────────────────────────────────────────────

export interface SceneRecommendation {
  sceneIndex: number
  /** 캐릭터명 → PoseCandidate K=5 */
  poses: Record<string, PoseCandidate[]>
  background: BackgroundCandidate
  /** Line 별 말풍선 추천 */
  bubbles: BubbleCandidate[]
  wordFx?: WordFxCandidate[]
  confidence: number
  seed: number
}

// ─────────────────────────────────────────────
// 전체 추천 결과
// ─────────────────────────────────────────────

export interface RecommendResult {
  scenes: SceneRecommendation[]
  /** K=3 전체 대안 */
  alternatives?: RecommendResult[]
  seed: number
  /** 'rule-only' | 'embedding+rule' | ... */
  modelVersion: string
}

// ─────────────────────────────────────────────
// 옵션
// ─────────────────────────────────────────────

export interface RecommendOptions {
  /** 결정론 시드 (기본: 0) */
  seed?: number
  /**
   * 대본 캐릭터명 → DB Character.id 매핑.
   * 누락 시 system "더미맨" Character 를 사용.
   */
  characterMapping?: Record<string, string>
  /** 캐릭터당 포즈 후보 수 (기본: 5) */
  candidatesPerCharacter?: number
  /** LLM 호출 여부 (기본: false — 룰 기반 우선) */
  llmEnabled?: boolean
}

// ─────────────────────────────────────────────
// 내부: 장면 메타 → 포즈 키워드 컨텍스트
// ─────────────────────────────────────────────

export interface PoseRuleContext {
  emotion?: string
  cameraAngle?: string
  mood?: string
  location?: string
  view?: string
  pacing?: string
  props?: string[]
}
