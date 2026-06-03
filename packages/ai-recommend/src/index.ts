/**
 * @storywork/ai-recommend — Public API
 *
 * 포즈/배경/말풍선/워드효과 추천 파이프라인
 * M4-02: 룰 기반 추천 코어 + 임베딩 검색 결합
 */

// filename-tagger (M2-03a)
export type {
  DictRule,
  FilenameDictionary,
  FilenameTagResult,
  MatchType,
  SubfolderTagEntry,
  ViewHint,
} from './filename-tagger.js'
export {
  clearDictCache,
  loadDictionary,
  tagFromFilename,
  tagFromSubfolder,
} from './filename-tagger.js'

// 타입 (M4-02)
export type {
  BackgroundCandidate,
  BgTone,
  BubbleCandidate,
  BubbleShape,
  PoseCandidate,
  PoseRuleContext,
  RecommendOptions,
  RecommendResult,
  SceneRecommendation,
  WordFxCandidate,
  WordFxScope,
} from './types.js'

// 룰 모듈 (M4-02)
export { getBgToneCandidate } from './rules/bg-tone-rules.js'
export {
  BUBBLE_SHAPE_CONFIDENCE,
  getBubbleCandidate,
  getBubbleCandidates,
} from './rules/bubble-rules.js'
export {
  getPoseActionCandidates,
  normalizeEmotion,
  normalizeLocation,
  normalizeMood,
  POSE_RULES,
} from './rules/pose-rules.js'
export { getWordFxCandidate, getWordFxCandidates } from './rules/wordfx-rules.js'

// 추천 메인 (Step 3에서 추가)
export { recommend } from './recommend.js'

// 임베딩 검색 (Step 2에서 추가)
export { searchPosesByCharacter } from './embedding/character-search.js'
export { embedSceneMeta } from './embedding/embed-scene.js'
