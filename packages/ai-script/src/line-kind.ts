/**
 * line-kind.ts — 라인 종류 판정 (SCRIPT-KO-04)
 *
 * `AnalyzedLine.kind` 는 파서가 항상 채우지만, 이 필드 도입 이전에 저장된 SceneDoc·
 * 외부에서 들어온 분석 결과에는 없다. 소비 측(ai-layout)이 매번 폴백 규칙을 다시 쓰면
 * 서로 다른 결론을 낼 수 있으므로 판정을 여기 한 곳에 모은다.
 *
 * 폴백 규칙: 화자가 있으면 대사, 없으면 서술. 종전 동작(화자 유무로만 구분)과 같다.
 */

import type { AnalyzedLine, LineKind } from './types.js'

/** 라인의 종류 — `kind` 가 없으면 화자 유무로 추론한다 */
export function lineKindOf(line: Pick<AnalyzedLine, 'kind' | 'speaker'>): LineKind {
  if (line.kind) return line.kind
  return line.speaker ? 'dialogue' : 'narration'
}

/** 말풍선에 들어갈 대사인가 */
export function isDialogueLine(line: Pick<AnalyzedLine, 'kind' | 'speaker'>): boolean {
  return lineKindOf(line) === 'dialogue'
}

/** 캡션(내레이션/지문) 박스에 들어갈 라인인가 */
export function isCaptionLine(line: Pick<AnalyzedLine, 'kind' | 'speaker'>): boolean {
  return lineKindOf(line) !== 'dialogue'
}
