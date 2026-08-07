/**
 * @storywork/ai-script — Public API
 *
 * 대본 분석 파이프라인: 텍스트 → SceneDoc 초안
 * CLAUDE.md §5.1 결정론 원칙: seed 고정 + temperature 0
 */

export { analyze } from './analyze.js'
export { detectFormat } from './parsers/detect-format.js'
export { parseNovel } from './parsers/parse-novel.js'
export { parseScreenplay, parseSceneHeading } from './parsers/parse-screenplay.js'
// SCRIPT-KO-04: 대사/지문 구분
export { isCaptionLine, isDialogueLine, lineKindOf } from './line-kind.js'
// SCRIPT-KO-01: 한국어 화자귀속 1층 룰 엔진
export {
  attributeParagraph,
  createAttributionContext,
  extractDialogueQuotes,
  recordMentions,
  CharacterRegistry,
  SPEECH_VERB_RE,
} from './parsers/ko-speech.js'
export type { AttributedQuote, AttributionContext, ExtractedQuote } from './parsers/ko-speech.js'
export type {
  AnalyzeOptions,
  AnalyzeResult,
  AnalyzedLine,
  AnalyzedScene,
  CameraAngle,
  DetectedCharacter,
  LineKind,
  Pacing,
  SceneMeta,
  ScriptInputFormat,
  TimeOfDay,
} from './types.js'
