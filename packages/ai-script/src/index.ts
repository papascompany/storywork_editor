/**
 * @storywork/ai-script — Public API
 *
 * 대본 분석 파이프라인: 텍스트 → SceneDoc 초안
 * CLAUDE.md §5.1 결정론 원칙: seed 고정 + temperature 0
 */

export { analyze } from './analyze.js'
export { detectFormat } from './parsers/detect-format.js'
export { parseNovel } from './parsers/parse-novel.js'
export { parseScreenplay } from './parsers/parse-screenplay.js'
export type {
  AnalyzeOptions,
  AnalyzeResult,
  AnalyzedLine,
  AnalyzedScene,
  CameraAngle,
  DetectedCharacter,
  Pacing,
  SceneMeta,
  ScriptInputFormat,
  TimeOfDay,
} from './types.js'
