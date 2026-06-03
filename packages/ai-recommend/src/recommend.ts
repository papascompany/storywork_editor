/**
 * recommend.ts — ai-recommend 메인 함수 (M4-02)
 *
 * 처리 흐름:
 *  1. characterMapping 구성 (옵션 → system "더미맨" 폴백)
 *  2. 각 scene 에 대해:
 *     - pose-rules → action 키워드
 *     - character-search → PoseCandidate[] K=5
 *     - bubble-rules → Line[] 별 BubbleCandidate
 *     - bg-tone-rules → BackgroundCandidate
 *     - wordfx-rules → 강조 대사 WordFxCandidate[]
 *  3. confidence 종합
 *  4. alternatives K=3 (seed 변경 → 룰 가중 다변화)
 *
 * 결정론: seed 고정 → 동일 입력/seed → 동일 출력
 */

import type { AnalyzeResult, AnalyzedScene } from '@storywork/ai-script'

import { searchPosesByCharacter } from './embedding/character-search.js'
import type { PoseDbAdapter } from './embedding/character-search.js'
import { getBgToneCandidate } from './rules/bg-tone-rules.js'
import { getBubbleCandidates } from './rules/bubble-rules.js'
import { getWordFxCandidates } from './rules/wordfx-rules.js'
import type {
  PoseCandidate,
  RecommendOptions,
  RecommendResult,
  SceneRecommendation,
} from './types.js'

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────

const DEFAULT_CANDIDATES = 5
const DEFAULT_ALTERNATIVES = 3

/**
 * system "더미맨" Character.id — DB 에 실재하는 단일 system 캐릭터.
 * characterMapping 에서 캐릭터가 매핑되지 않은 경우 폴백으로 사용.
 */
const DUMMY_MAN_CHARACTER_ID = 'system-dummy-man'

// ─────────────────────────────────────────────
// 내부 옵션 타입 (dbAdapter 주입 — 테스트용)
// ─────────────────────────────────────────────

export interface RecommendInternalOptions extends RecommendOptions {
  /** DB 어댑터 override (테스트/mock용) */
  _dbAdapter?: PoseDbAdapter
}

// ─────────────────────────────────────────────
// 단일 장면 추천
// ─────────────────────────────────────────────

async function recommendScene(
  scene: AnalyzedScene,
  characterMapping: Record<string, string>,
  candidatesPerCharacter: number,
  seed: number,
  dbAdapter?: PoseDbAdapter,
): Promise<SceneRecommendation> {
  const { meta, lines, characters } = scene

  // 1. 포즈 추천 (캐릭터별)
  const poses: Record<string, PoseCandidate[]> = {}

  // 장면에 등장하는 캐릭터 (+ 대사 화자)
  const sceneCharacters = new Set<string>([
    ...characters,
    ...lines
      .filter((l: { speaker?: string }) => l.speaker)
      .map((l: { speaker?: string }) => l.speaker as string),
  ])

  for (const charName of sceneCharacters) {
    const characterId = characterMapping[charName] ?? DUMMY_MAN_CHARACTER_ID

    const candidates = await searchPosesByCharacter(characterId, meta, candidatesPerCharacter, {
      dbAdapter,
    })

    poses[charName] = candidates
  }

  // 등장 캐릭터가 없으면 기본 캐릭터로 추천
  if (sceneCharacters.size === 0) {
    const candidates = await searchPosesByCharacter(
      DUMMY_MAN_CHARACTER_ID,
      meta,
      candidatesPerCharacter,
      { dbAdapter },
    )
    poses['default'] = candidates
  }

  // 2. 배경 톤 추천
  const background = getBgToneCandidate({
    mood: meta.mood,
    location: meta.location,
    timeOfDay: meta.timeOfDay,
  })

  // 3. 말풍선 추천 (Line별)
  const bubbles = getBubbleCandidates(
    lines.map((l: { text: string; speaker?: string }) => ({ text: l.text, speaker: l.speaker })),
  )

  // 4. 워드 효과 추천 (강조 대사)
  const wordFx = getWordFxCandidates(
    lines.map((l: { text: string; speaker?: string }) => ({ text: l.text, speaker: l.speaker })),
  )

  // 5. 장면 전체 confidence
  const allPoseCandidates = Object.values(poses).flat()
  const avgPoseConf =
    allPoseCandidates.length > 0
      ? allPoseCandidates.reduce((sum, c) => sum + c.confidence, 0) / allPoseCandidates.length
      : 0.5

  const sceneConf = Math.min(avgPoseConf * 0.7 + 0.3, 1) // 배경/말풍선은 고신뢰도이므로 0.3 가산

  return {
    sceneIndex: scene.index,
    poses,
    background,
    bubbles,
    wordFx: wordFx.length > 0 ? wordFx : undefined,
    confidence: sceneConf,
    seed,
  }
}

// ─────────────────────────────────────────────
// alternatives 생성 (seed 변경 + 가중 다변화)
// ─────────────────────────────────────────────

/**
 * seed 를 변경하면 mock 임베딩 결과가 달라지고,
 * 룰 기반 action 순위도 candidatesPerCharacter 조정으로 미세하게 달라진다.
 * (완전히 다른 결과보다는 "다음 후보" 수준의 변화)
 */
async function generateAlternatives(
  analyzed: AnalyzeResult,
  characterMapping: Record<string, string>,
  baseCandidates: number,
  baseSeed: number,
  numAlternatives: number,
  dbAdapter?: PoseDbAdapter,
): Promise<RecommendResult[]> {
  const alts: RecommendResult[] = []

  for (let i = 1; i <= numAlternatives; i++) {
    const altSeed = baseSeed + i * 1000
    // 후보 수를 약간 조정해 결과 다양화
    const altCandidates = Math.max(baseCandidates, 5) + (i % 3)

    const scenes: SceneRecommendation[] = []
    for (const scene of analyzed.scenes) {
      const rec = await recommendScene(scene, characterMapping, altCandidates, altSeed, dbAdapter)
      scenes.push(rec)
    }

    alts.push({
      scenes,
      seed: altSeed,
      modelVersion: 'rule-only',
    })
  }

  return alts
}

// ─────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────

/**
 * AnalyzeResult 를 입력받아 각 장면의 포즈/배경/말풍선/워드효과를 추천한다.
 *
 * @param analyzed  ai-script.analyze() 결과
 * @param opts      추천 옵션 (seed, characterMapping, candidatesPerCharacter, llmEnabled)
 * @returns         RecommendResult (scenes, alternatives, seed, modelVersion)
 */
export async function recommend(
  analyzed: AnalyzeResult,
  opts: RecommendInternalOptions = {},
): Promise<RecommendResult> {
  const {
    seed = 0,
    characterMapping = {},
    candidatesPerCharacter = DEFAULT_CANDIDATES,
    _dbAdapter,
  } = opts

  // 1. 각 장면 추천
  const scenes: SceneRecommendation[] = []
  for (const scene of analyzed.scenes) {
    const rec = await recommendScene(
      scene,
      characterMapping,
      candidatesPerCharacter,
      seed,
      _dbAdapter,
    )
    scenes.push(rec)
  }

  // 2. alternatives
  const alternatives = await generateAlternatives(
    analyzed,
    characterMapping,
    candidatesPerCharacter,
    seed,
    DEFAULT_ALTERNATIVES,
    _dbAdapter,
  )

  return {
    scenes,
    alternatives,
    seed,
    modelVersion: 'rule-only',
  }
}
