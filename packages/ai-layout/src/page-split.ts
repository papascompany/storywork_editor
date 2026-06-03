/**
 * page-split.ts — 페이지 분할 알고리즘 (M4-03 Step 1)
 *
 * 5개 결정론적 규칙으로 SceneRecommendation[] → 페이지 그룹 배열을 생성한다.
 *
 * 규칙 우선순위 (높음 → 낮음):
 *  R1: 기본 — 1 페이지 = 1 장면
 *  R2: closeup + dialogue 4+ → 4컷 페이지 (4 scenes 합병)
 *  R3: cameraAngle=wide + props 다수(3+) → 풀샷 단독 페이지
 *  R4: 같은 location 연속 → 같은 페이지 결합 후보 (lookahead 1)
 *  R5: emotion 급변 (calm/romantic → tense/action 또는 반대) → 강제 분할
 *
 * 결정론: 동일 입력 → 동일 출력 (배열 순서 기반, 랜덤 없음)
 */

import type { SceneRecommendation } from '@storywork/ai-recommend'
import type { AnalyzeResult, AnalyzedScene } from '@storywork/ai-script'

import type { TemplateHint } from './types.js'

// ─────────────────────────────────────────────
// 상수 (4컷 합병 기준)
// ─────────────────────────────────────────────

const FOUR_CUT_MIN_DIALOGUE = 4
const WIDE_PROPS_THRESHOLD = 3

// ─────────────────────────────────────────────
// Emotion 그룹 분류 (R5)
// ─────────────────────────────────────────────

const CALM_EMOTIONS = new Set(['calm', 'happy', 'romantic', 'neutral', 'comic'])
const TENSE_EMOTIONS = new Set(['tense', 'action', 'angry', 'fear', 'surprised', 'dark'])

function emotionGroup(emotion: string | undefined): 'calm' | 'tense' | 'neutral' {
  if (!emotion) return 'neutral'
  if (CALM_EMOTIONS.has(emotion)) return 'calm'
  if (TENSE_EMOTIONS.has(emotion)) return 'tense'
  return 'neutral'
}

function isEmotionShift(prevEmotion: string | undefined, currEmotion: string | undefined): boolean {
  const prev = emotionGroup(prevEmotion)
  const curr = emotionGroup(currEmotion)
  // neutral → anything 은 shift 아님. calm ↔ tense 만 급변으로 처리
  if (prev === 'neutral' || curr === 'neutral') return false
  return prev !== curr
}

// ─────────────────────────────────────────────
// 페이지 그룹 결과 타입
// ─────────────────────────────────────────────

export interface PageGroup {
  pageIndex: number
  sceneIndices: number[]
  templateHint: TemplateHint
}

// ─────────────────────────────────────────────
// R3: 풀샷 단독 여부
// ─────────────────────────────────────────────

function isFullShotSolo(scene: AnalyzedScene): boolean {
  return (
    scene.meta.cameraAngle === 'wide' &&
    Array.isArray(scene.meta.props) &&
    scene.meta.props.length >= WIDE_PROPS_THRESHOLD
  )
}

// ─────────────────────────────────────────────
// R2: 4컷 closeup+dialogue 조건
// ─────────────────────────────────────────────

function isCloseupDialogue(scene: AnalyzedScene): boolean {
  return scene.meta.cameraAngle === 'closeup' && scene.lines.length >= FOUR_CUT_MIN_DIALOGUE
}

// ─────────────────────────────────────────────
// 주요 함수 — splitScenes()
// ─────────────────────────────────────────────

/**
 * SceneRecommendation[] + AnalyzeResult 를 받아 페이지 그룹을 결정한다.
 *
 * @param scenes    SceneRecommendation[] (sceneIndex 순서 보장)
 * @param analyzed  AnalyzeResult (meta, characters, lines 등 상세 정보)
 * @returns         PageGroup[] — 페이지별 sceneIndices + templateHint
 */
export function splitScenes(scenes: SceneRecommendation[], analyzed: AnalyzeResult): PageGroup[] {
  if (scenes.length === 0) return []

  // sceneIndex → AnalyzedScene 맵
  const sceneMap = new Map<number, AnalyzedScene>()
  for (const s of analyzed.scenes) {
    sceneMap.set(s.index, s)
  }

  const pages: PageGroup[] = []
  let pageIndex = 0
  let i = 0

  while (i < scenes.length) {
    const sceneRec = scenes[i]
    if (!sceneRec) {
      i++
      continue
    }
    const sceneIdx = sceneRec.sceneIndex
    const scene = sceneMap.get(sceneIdx)

    if (!scene) {
      // 분석 결과에 없는 장면 — 기본 1:1 배치
      pages.push({ pageIndex, sceneIndices: [sceneIdx], templateHint: 'default' })
      pageIndex++
      i++
      continue
    }

    // ── R3: wide + props 다수 → 풀샷 단독 ─────────────────────────────────
    if (isFullShotSolo(scene)) {
      pages.push({ pageIndex, sceneIndices: [sceneIdx], templateHint: 'full-shot-solo' })
      pageIndex++
      i++
      continue
    }

    // ── R5: emotion 급변 → 강제 분할 (이전 페이지와 비교) ─────────────────
    if (pages.length > 0) {
      const prevPage = pages[pages.length - 1]
      const prevLastSceneIdx = prevPage
        ? prevPage.sceneIndices[prevPage.sceneIndices.length - 1]
        : undefined
      const prevScene = prevLastSceneIdx !== undefined ? sceneMap.get(prevLastSceneIdx) : undefined

      if (prevScene && isEmotionShift(prevScene.meta.emotion, scene.meta.emotion)) {
        // 이미 새 페이지로 나뉘어 있으므로 현재 페이지로 계속 처리
        // (급변 체크는 페이지 경계에서만 분할 결정 → 여기서는 이미 새 i 이므로 fall-through)
      }
    }

    // ── R2: closeup + dialogue 4+ → 4컷 합병 시도 ────────────────────────
    if (isCloseupDialogue(scene)) {
      const fourCutIndices: number[] = [sceneIdx]
      let j = i + 1
      while (j < scenes.length && fourCutIndices.length < 4) {
        const nextRec = scenes[j]
        if (!nextRec) break
        const nextScene = sceneMap.get(nextRec.sceneIndex)
        if (!nextScene) break
        // R5 적용: 급변하면 4컷 합병 중단
        const prevIdx = fourCutIndices[fourCutIndices.length - 1]
        const prevSc = prevIdx !== undefined ? sceneMap.get(prevIdx) : undefined
        if (prevSc && isEmotionShift(prevSc.meta.emotion, nextScene.meta.emotion)) break
        // 4컷 합병 조건: closeup or dialogue 4+
        if (isCloseupDialogue(nextScene) || nextScene.meta.cameraAngle === 'closeup') {
          fourCutIndices.push(nextRec.sceneIndex)
          j++
        } else {
          break
        }
      }

      if (fourCutIndices.length >= 2) {
        // 2개 이상 모이면 4컷으로 처리
        const hint: TemplateHint = fourCutIndices.length === 4 ? 'four-cut' : 'closeup'
        pages.push({ pageIndex, sceneIndices: fourCutIndices, templateHint: hint })
        pageIndex++
        i = j
        continue
      }
      // 1개만이면 단독 closeup
      pages.push({ pageIndex, sceneIndices: [sceneIdx], templateHint: 'closeup' })
      pageIndex++
      i++
      continue
    }

    // ── R4: 같은 location 연속 → lookahead 1 결합 ─────────────────────────
    const nextRec = i + 1 < scenes.length ? scenes[i + 1] : undefined
    if (nextRec) {
      const nextScene = sceneMap.get(nextRec.sceneIndex)
      if (
        nextScene &&
        scene.meta.location &&
        nextScene.meta.location === scene.meta.location &&
        // R5: emotion 급변이 없어야 결합
        !isEmotionShift(scene.meta.emotion, nextScene.meta.emotion) &&
        // 풀샷은 결합 금지 (R3 우선)
        !isFullShotSolo(nextScene)
      ) {
        // 1대1 대화 힌트 (두 장면, 같은 location)
        const hint: TemplateHint = '1on1-talk'
        pages.push({ pageIndex, sceneIndices: [sceneIdx, nextRec.sceneIndex], templateHint: hint })
        pageIndex++
        i += 2
        continue
      }
    }

    // ── R1: 기본 1:1 ───────────────────────────────────────────────────────
    const hint: TemplateHint = scene.meta.cameraAngle === 'wide' ? 'wide' : 'default'
    pages.push({ pageIndex, sceneIndices: [sceneIdx], templateHint: hint })
    pageIndex++
    i++
  }

  return pages
}

// ─────────────────────────────────────────────
// Export (디버깅용 내부 함수 공개)
// ─────────────────────────────────────────────

export { emotionGroup, isEmotionShift, isFullShotSolo, isCloseupDialogue }
