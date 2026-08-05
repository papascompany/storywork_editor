/**
 * capacity.ts — 대사 수용량 기반 페이지 계획 (LAYOUT-03)
 *
 * ## 문제
 * `splitScenes()` 의 5규칙(R1~R5)은 **연출**만 본다 — 카메라 앵글, 감정, 장소.
 * 그 결과 장면당 대사가 7개인데 말풍선 슬롯 2개짜리 페이지가 만들어졌고,
 * 초과 대사는 경고 없이 사라졌다 (AI-ACT-04 baseline: 대사 보존 52.2% · 채택률 13.8%).
 *
 * ## 이 모듈이 하는 일
 * splitScenes 결과를 받아 **담을 수 있는가**를 기준으로 다시 계획한다:
 *
 *  1. 페이지가 쓸 Template 을 수용량 인식 매칭으로 확정한다(`templateId` 로 고정 —
 *     compose 가 다시 매칭해 다른 결론을 내는 표류를 막는다).
 *  2. 합병된 페이지가 대사를 다 못 담거나 컷을 다 못 보여주면 **합병을 해제**한다.
 *     (같은 4컷을 대사만 바꿔 4번 반복하는 것보다 컷마다 한 페이지가 낫다)
 *  3. 단일 장면이 수용량을 넘으면 **같은 장면을 여러 페이지로 나눈다**(`lineRanges`).
 *
 * 대사를 버리는 경로는 남기지 않는다 — 모든 대사는 정확히 한 페이지에 귀속된다.
 *
 * 결정론: 입력 순서와 정수 연산만 사용. 랜덤·시각 의존 없음.
 */

import type { AnalyzeResult, AnalyzedScene } from '@storywork/ai-script'

import { pageBubbleCapacity, poseSlotsOf } from './bubble-slots.js'
import { matchTemplate } from './template-match.js'
import type { LayoutFormat, LayoutTemplate, PageGroup, TemplateHint } from './types.js'

// ─────────────────────────────────────────────
// 장면 속성
// ─────────────────────────────────────────────

/**
 * 이 장면에서 포즈로 세울 수 있는 인물 목록.
 * `slot-assign` 이 쓰는 집합(장면 characters ∪ 대사 화자)과 **같은 정의**여야 한다 —
 * 다르면 "채울 수 있다고 보고 고른 템플릿"이 실제로는 비어 `[slot-empty]` 가 난다.
 */
export function sceneSpeakers(scene: AnalyzedScene): string[] {
  const set = new Set<string>(scene.characters)
  for (const line of scene.lines) {
    if (line.speaker) set.add(line.speaker)
  }
  return [...set]
}

/** 장면 단독 배치 시의 템플릿 힌트 (합병 해제 시 사용) */
export function sceneHint(scene: AnalyzedScene): TemplateHint {
  if (scene.meta.cameraAngle === 'closeup') return 'closeup'
  if (scene.meta.cameraAngle === 'wide') return 'wide'
  return 'default'
}

/**
 * page-split 이 남긴 힌트를 실제 매칭에 쓸 힌트로 확정한다.
 *
 * splitScenes 의 R1 은 연출 분류가 애매하면 `'default'` 를 남긴다 —
 * 그 경우에만 장면 수와 카메라 앵글로 다시 추론한다.
 * **수용량 패스와 compose 가 같은 결론을 내야** 계획한 템플릿과 배치가 어긋나지 않는다.
 */
export function resolveTemplateHint(
  hint: TemplateHint | undefined,
  sceneCount: number,
  firstScene: AnalyzedScene | undefined,
): TemplateHint {
  if (hint && hint !== 'default') return hint
  if (sceneCount === 4) return 'four-cut'
  if (sceneCount === 2) return '1on1-talk'
  if (firstScene) return sceneHint(firstScene)
  return 'default'
}

// ─────────────────────────────────────────────
// 계획
// ─────────────────────────────────────────────

export interface CapacityPlanContext {
  templates: LayoutTemplate[]
  preferredIds: string[]
  format: LayoutFormat
  /**
   * 수용량 초과 시 페이지 분할을 허용할지 (기본 true).
   * `ComposeOptions.enableSplitMerge=false` — "1 장면 = 1 페이지" 를 명시한 호출에서는
   * false 로 넘겨 분할을 막는다(이 경우 초과 대사는 종전처럼 배치되지 않는다).
   */
  allowSplit?: boolean
}

/**
 * splitScenes() 결과를 수용량 기준으로 다시 계획한다.
 * 반환된 PageGroup 은 `pageIndex` 가 0부터 재부여되고 `templateId` 가 항상 채워진다.
 */
export function planCapacityPages(
  groups: readonly PageGroup[],
  analyzed: AnalyzeResult,
  ctx: CapacityPlanContext,
): PageGroup[] {
  const allowSplit = ctx.allowSplit !== false
  const sceneMap = new Map<number, AnalyzedScene>(analyzed.scenes.map((s) => [s.index, s]))
  const out: PageGroup[] = []

  const emit = (group: Omit<PageGroup, 'pageIndex'>): void => {
    out.push({ ...group, pageIndex: out.length })
  }

  /** 장면 하나를 (필요하면 여러 페이지로 나눠) 배치한다 */
  const planSingleScene = (sceneIndex: number, rawHint: TemplateHint): void => {
    const scene = sceneMap.get(sceneIndex)
    if (!scene) {
      // 분석 결과에 없는 장면 — 종전처럼 그대로 흘려보낸다
      emit({ sceneIndices: [sceneIndex], templateHint: rawHint })
      return
    }

    const hint = resolveTemplateHint(rawHint, 1, scene)
    const speakerCount = sceneSpeakers(scene).length
    const lineCount = scene.lines.length
    const { template } = matchTemplate(hint, ctx.preferredIds, speakerCount, ctx.templates, {
      dialogueCount: lineCount,
      // 단독 장면은 인물 1명만 세워도 성립한다 — 화자가 없으면 포즈 슬롯도 요구하지 않는다
      requiredPoseCount: Math.min(1, speakerCount),
    })

    const capacity = pageBubbleCapacity(template, ctx.format)
    if (!allowSplit || lineCount <= capacity || capacity <= 0) {
      emit({ sceneIndices: [sceneIndex], templateHint: hint, templateId: template.id })
      return
    }

    // 균등 분할 — 마지막 페이지에 대사 1개만 남는 배치를 피한다
    const pageCount = Math.ceil(lineCount / capacity)
    const perPage = Math.ceil(lineCount / pageCount)
    for (let start = 0; start < lineCount; start += perPage) {
      const end = Math.min(lineCount, start + perPage)
      emit({
        sceneIndices: [sceneIndex],
        templateHint: hint,
        templateId: template.id,
        lineRanges: [{ sceneIndex, start, end }],
      })
    }
  }

  for (const group of groups) {
    // ── 단일 장면 ────────────────────────────────────────────────────────────
    if (group.sceneIndices.length <= 1) {
      const sceneIndex = group.sceneIndices[0]
      if (sceneIndex === undefined) continue
      planSingleScene(sceneIndex, group.templateHint)
      continue
    }

    // ── 합병 페이지 ──────────────────────────────────────────────────────────
    const scenes = group.sceneIndices
      .map((i) => sceneMap.get(i))
      .filter((s): s is AnalyzedScene => s !== undefined)
    const totalLines = scenes.reduce((sum, s) => sum + s.lines.length, 0)
    const cutCount = group.sceneIndices.length
    const hint = resolveTemplateHint(group.templateHint, cutCount, scenes[0])

    // 멀티 장면 페이지는 장면당 포즈 1개를 세운다 → 채울 수 있는 포즈 수 = 컷 수
    const { template } = matchTemplate(hint, ctx.preferredIds, cutCount, ctx.templates, {
      dialogueCount: totalLines,
      requiredPoseCount: cutCount,
    })
    const capacity = pageBubbleCapacity(template, ctx.format)
    const fitsDialogue = totalLines <= capacity
    const showsAllCuts = poseSlotsOf(template).length >= cutCount

    if (fitsDialogue && showsAllCuts) {
      emit({ sceneIndices: group.sceneIndices, templateHint: hint, templateId: template.id })
      continue
    }

    // 합병 해제 — 대사를 다 담지 못하거나 컷을 다 보여주지 못한다.
    // 같은 컷 구성을 대사만 바꿔 반복하느니 장면마다 한 페이지를 준다.
    for (const sceneIndex of group.sceneIndices) {
      const scene = sceneMap.get(sceneIndex)
      planSingleScene(sceneIndex, scene ? sceneHint(scene) : 'default')
    }
  }

  return out
}
