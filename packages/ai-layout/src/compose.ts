/**
 * compose.ts — ai-layout 메인 함수 (M4-03 Step 4)
 *
 * 처리 흐름:
 *  1. Format 로드 (opts.format 직접 주입 또는 formatId 기반 폴백)
 *  2. splitScenes() → PageGroup[]
 *  3. 각 PageGroup:
 *     a. matchTemplate() → Template 선택
 *     b. assignSlots() → SlotAssignment[] (lowDpi 제약 포함)
 *     c. buildFabricJson() → PageFabricJson (Schema v1 호환)
 *  4. warnings 종합 → ComposeResult 반환
 *
 * 결정론: seed 고정 → 동일 입력 → 동일 출력
 * mm 단위 전용: 픽셀 하드코딩 금지 (CLAUDE.md §8)
 */

import type { RecommendResult } from '@storywork/ai-recommend'
import type { AnalyzeResult } from '@storywork/ai-script'

import { checkLowDpiConstraint, formatLowDpiWarning } from './constraints/low-dpi.js'
import { splitScenes } from './page-split.js'
import { assignSlots, BG_TONE_COLOR } from './slot-assign.js'
import { matchTemplate } from './template-match.js'
import type {
  ComposeOptions,
  ComposeResult,
  FabricLayer,
  LayoutFormat,
  PageDraft,
  PageFabricJson,
  SlotAssignment,
  TemplateHint,
} from './types.js'

// ─────────────────────────────────────────────
// 기본 Format (DB 없을 때 B5 폴백)
// ─────────────────────────────────────────────

const DEFAULT_FORMAT: LayoutFormat = {
  id: 'default-b5',
  widthMm: 128,
  heightMm: 182,
  dpi: 350,
  bleedMm: 3,
  safeMm: 5,
}

// ─────────────────────────────────────────────
// nanoid 대체 — 결정론 ID 생성 (seed 기반)
// ─────────────────────────────────────────────

function makeId(seed: number, index: number, suffix: string): string {
  return `ai-${seed}-${index}-${suffix}`
}

// ─────────────────────────────────────────────
// SlotAssignment → FabricLayer 변환
// ─────────────────────────────────────────────

function assignmentToFabricLayer(
  assignment: SlotAssignment,
  format: LayoutFormat,
  seed: number,
  assignIndex: number,
): FabricLayer | null {
  const { slot } = assignment

  // 슬롯 좌표(0..1) → mm 좌표
  const leftMm = slot.x * format.widthMm
  const topMm = slot.y * format.heightMm
  const widthMm = slot.w * format.widthMm
  const heightMm = slot.h * format.heightMm

  const id = makeId(seed, assignIndex, slot.id)

  if (assignment.kind === 'background') {
    const tone = assignment.text ?? 'white'
    const fill = BG_TONE_COLOR[tone] ?? '#FFFFFF'
    return {
      id,
      kind: 'bg',
      data: {
        slotId: slot.id,
        locked: false,
        visible: true,
        meta: { bgTone: tone },
      },
      fabric: {
        type: 'rect',
        leftMm,
        topMm,
        widthMm,
        heightMm,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        opacity: 1,
        fill,
        zIndex: slot.zIndex,
      },
    }
  }

  if (assignment.kind === 'pose') {
    return {
      id,
      kind: 'pose',
      data: {
        resourceId: assignment.resourceId,
        slotId: slot.id,
        locked: false,
        visible: true,
        meta: {
          characterName: assignment.characterName,
          lowDpiViolation: assignment.lowDpiViolation ?? false,
          effectiveDpi: assignment.effectiveDpi,
        },
      },
      fabric: {
        type: 'image',
        leftMm,
        topMm,
        widthMm,
        heightMm,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        opacity: 1,
        flipX: false,
        flipY: false,
        src: assignment.resourceId ? `resource://${assignment.resourceId}` : '',
        zIndex: slot.zIndex,
      },
    }
  }

  if (assignment.kind === 'bubble' || assignment.kind === 'text') {
    return {
      id,
      kind: 'bubble',
      data: {
        slotId: slot.id,
        locked: false,
        visible: true,
        meta: {
          speaker: assignment.characterName,
          text: assignment.text ?? '',
        },
      },
      fabric: {
        type: 'textbox',
        leftMm,
        topMm,
        widthMm,
        heightMm,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        opacity: 1,
        text: assignment.text ?? '',
        fontSize: 14,
        fill: '#000000',
        zIndex: slot.zIndex,
      },
    }
  }

  // 'empty' → null (배치 안 함)
  return null
}

// ─────────────────────────────────────────────
// PageGroup → PageFabricJson (Schema v1 호환)
// ─────────────────────────────────────────────

/**
 * 멀티 scene 페이지 처리 전략:
 * - 단일 scene: 전체 template에 대해 assignSlots() 1회 호출
 * - 멀티 scene (1on1-talk, four-cut 등): 단일 scene (첫 번째)을 기준으로 배치하되,
 *   각 scene의 첫 번째 포즈 후보를 순서대로 pose 슬롯에 배치.
 *   배경/말풍선은 페이지 단위로 1회만 배치 (중복 slotId 방지).
 */
async function buildPageFabricJson(
  pageIndex: number,
  sceneIndices: number[],
  analyzed: AnalyzeResult,
  recommended: RecommendResult,
  format: LayoutFormat,
  opts: ComposeOptions,
  pageHint?: TemplateHint,
): Promise<{ fabricJson: PageFabricJson; templateId?: string; warnings: string[] }> {
  const seed = opts.seed ?? 0
  const templates = opts._templates ?? []
  const preferredIds = opts.preferredTemplateIds ?? []
  const tagAdapter = opts._resourceTagAdapter ?? null

  // 첫 번째 장면 기준으로 templateHint 결정
  const firstSceneIdx = sceneIndices[0] ?? 0
  const firstScene = analyzed.scenes.find((s) => s.index === firstSceneIdx)
  const charCount = firstScene ? firstScene.characters.length : 1

  // page-split 의 templateHint 우선 사용 (R3 풀샷 단독 등 명시적 분류 보존).
  // 없으면 장면 수/cameraAngle 로 fallback 추론.
  let hint: TemplateHint
  if (pageHint && pageHint !== 'default') {
    hint = pageHint
  } else if (sceneIndices.length === 4) hint = 'four-cut'
  else if (sceneIndices.length === 2) hint = '1on1-talk'
  else if (firstScene?.meta.cameraAngle === 'closeup') hint = 'closeup'
  else if (firstScene?.meta.cameraAngle === 'wide') hint = 'wide'
  else hint = 'default'

  // Template 매칭
  const { template } = matchTemplate(hint, preferredIds, charCount, templates)

  const allWarnings: string[] = []
  const layers: FabricLayer[] = []
  const usedSlotIds = new Set<string>()

  if (sceneIndices.length === 1) {
    // ── 단일 장면: 전체 template 1회 배치 ─────────────────────────────────
    const sceneIdx = sceneIndices[0]
    if (sceneIdx !== undefined) {
      const scene = analyzed.scenes.find((s) => s.index === sceneIdx)
      const sceneRec = recommended.scenes.find((r) => r.sceneIndex === sceneIdx)

      if (scene && sceneRec) {
        const { assignments, warnings } = await assignSlots(
          template,
          sceneRec,
          scene,
          format,
          tagAdapter,
        )
        allWarnings.push(...warnings)

        for (let ai = 0; ai < assignments.length; ai++) {
          const assignment = assignments[ai]
          if (!assignment || usedSlotIds.has(assignment.slotId)) continue
          usedSlotIds.add(assignment.slotId)
          const layer = assignmentToFabricLayer(assignment, format, seed, pageIndex * 100 + ai)
          if (layer) layers.push(layer)
        }
      }
    }
  } else {
    // ── 멀티 scene: pose 슬롯을 각 scene에 순서대로 배분 ──────────────────
    // pose 슬롯 목록 (x 오름차순)
    const poseSlots = template.slots
      .filter((s) => s.allowedKinds.includes('pose'))
      .sort((a, b) => a.x - b.x)

    // 배경/말풍선 슬롯은 첫 번째 scene 기준으로 1회 배치
    const firstSceneRec = recommended.scenes.find((r) => r.sceneIndex === firstSceneIdx)
    if (firstScene && firstSceneRec) {
      // 배경 슬롯 배치 (중복 방지)
      for (const bgSlot of template.slots.filter((s) => s.allowedKinds.includes('bg'))) {
        if (usedSlotIds.has(bgSlot.id)) continue
        usedSlotIds.add(bgSlot.id)
        const tone = firstSceneRec.background.suggestedTone
        const fill = BG_TONE_COLOR[tone] ?? '#FFFFFF'
        const layer: FabricLayer = {
          id: makeId(seed, pageIndex * 100, bgSlot.id),
          kind: 'bg',
          data: { slotId: bgSlot.id, locked: false, visible: true, meta: { bgTone: tone } },
          fabric: {
            type: 'rect',
            leftMm: bgSlot.x * format.widthMm,
            topMm: bgSlot.y * format.heightMm,
            widthMm: bgSlot.w * format.widthMm,
            heightMm: bgSlot.h * format.heightMm,
            scaleX: 1,
            scaleY: 1,
            angle: 0,
            opacity: 1,
            fill,
            zIndex: bgSlot.zIndex,
          },
        }
        layers.push(layer)
      }

      // 말풍선 슬롯: 첫 번째 scene의 lines 기준
      const bubbleSlots = template.slots
        .filter((s) => s.allowedKinds.includes('bubble') || s.allowedKinds.includes('text'))
        .sort((a, b) => a.y - b.y || a.x - b.x)
      for (let bi = 0; bi < bubbleSlots.length; bi++) {
        const bubbleSlot = bubbleSlots[bi]
        if (!bubbleSlot || usedSlotIds.has(bubbleSlot.id)) continue

        // 어느 scene의 line 인지 결정 (scene 순서 × slot 순서)
        const sceneIdx2 =
          sceneIndices[
            Math.floor(bi / Math.max(1, Math.ceil(bubbleSlots.length / sceneIndices.length)))
          ]
        const bScene =
          sceneIdx2 !== undefined ? analyzed.scenes.find((s) => s.index === sceneIdx2) : firstScene
        const line = bScene?.lines[bi % Math.max(1, Math.ceil(firstScene?.lines.length ?? 1))]
        if (!line && bubbleSlot.optional) continue

        usedSlotIds.add(bubbleSlot.id)
        const layer: FabricLayer = {
          id: makeId(seed, pageIndex * 100 + bi + 50, bubbleSlot.id),
          kind: 'bubble',
          data: {
            slotId: bubbleSlot.id,
            locked: false,
            visible: true,
            meta: { text: line?.text ?? '' },
          },
          fabric: {
            type: 'textbox',
            leftMm: bubbleSlot.x * format.widthMm,
            topMm: bubbleSlot.y * format.heightMm,
            widthMm: bubbleSlot.w * format.widthMm,
            heightMm: bubbleSlot.h * format.heightMm,
            scaleX: 1,
            scaleY: 1,
            angle: 0,
            opacity: 1,
            text: line?.text ?? '',
            fontSize: 14,
            fill: '#000000',
            zIndex: bubbleSlot.zIndex,
          },
        }
        layers.push(layer)
      }
    }

    // 각 scene → 순서대로 pose 슬롯에 배치
    for (let si = 0; si < sceneIndices.length; si++) {
      const sceneIdx = sceneIndices[si]
      if (sceneIdx === undefined) continue

      const scene = analyzed.scenes.find((s) => s.index === sceneIdx)
      const sceneRec = recommended.scenes.find((r) => r.sceneIndex === sceneIdx)
      if (!scene || !sceneRec) continue

      // 이 scene 에 할당된 pose 슬롯
      const poseSlot = poseSlots[si]
      if (!poseSlot || usedSlotIds.has(poseSlot.id)) continue

      // scene 의 첫 번째 캐릭터 포즈 후보
      const charName = scene.characters[0] ?? Object.keys(sceneRec.poses)[0]
      const poseCandidates = charName ? (sceneRec.poses[charName] ?? []) : []
      const candidate = poseCandidates[0]

      if (!candidate && !poseSlot.optional) {
        allWarnings.push(`[slot-empty] 장면 ${sceneIdx} 포즈 슬롯 ${poseSlot.id} 에 포즈 없음.`)
      }

      // lowDpi 체크
      const resourceId = candidate?.resourceId
      let lowDpiViolation = false
      if (candidate && tagAdapter) {
        const tags = await tagAdapter.getTags(candidate.resourceId)
        const isLowDpi = tags.includes('lowDpi')
        if (isLowDpi) {
          const assetSize = await tagAdapter.getMasterSize(candidate.resourceId)
          const check = checkLowDpiConstraint(isLowDpi, assetSize, poseSlot, format)
          if (!check.ok) {
            const warnMsg = formatLowDpiWarning(candidate.resourceId, poseSlot.id, check)
            allWarnings.push(warnMsg)
            lowDpiViolation = true
          }
        }
      }

      usedSlotIds.add(poseSlot.id)
      const layer: FabricLayer = {
        id: makeId(seed, pageIndex * 100 + si * 10, poseSlot.id),
        kind: 'pose',
        data: {
          resourceId,
          slotId: poseSlot.id,
          locked: false,
          visible: true,
          meta: {
            characterName: charName,
            sceneIndex: sceneIdx,
            lowDpiViolation,
          },
        },
        fabric: {
          type: 'image',
          leftMm: poseSlot.x * format.widthMm,
          topMm: poseSlot.y * format.heightMm,
          widthMm: poseSlot.w * format.widthMm,
          heightMm: poseSlot.h * format.heightMm,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          opacity: 1,
          flipX: false,
          flipY: false,
          src: resourceId ? `resource://${resourceId}` : '',
          zIndex: poseSlot.zIndex,
        },
      }
      layers.push(layer)
    }
  }

  // zIndex 오름차순 정렬 (결정론)
  layers.sort((a, b) => {
    const za = typeof a.fabric['zIndex'] === 'number' ? a.fabric['zIndex'] : 0
    const zb = typeof b.fabric['zIndex'] === 'number' ? b.fabric['zIndex'] : 0
    return za - zb || a.id.localeCompare(b.id)
  })

  const fabricJson: PageFabricJson = {
    v: 1,
    format: {
      id: format.id,
      widthMm: format.widthMm,
      heightMm: format.heightMm,
      dpi: format.dpi,
    },
    layers,
    _aiMeta: {
      generatedBy: 'ai-layout',
      seed,
      schemaVersion: 1,
      templateId: template.id,
      sceneIndices,
    },
  }

  return { fabricJson, templateId: template.id, warnings: allWarnings }
}

// ─────────────────────────────────────────────
// 공개 API — compose()
// ─────────────────────────────────────────────

/**
 * AnalyzeResult + RecommendResult → ComposeResult (페이지 배열 + fabricJson)
 *
 * @param analyzed    ai-script.analyze() 결과
 * @param recommended ai-recommend.recommend() 결과
 * @param opts        ComposeOptions (formatId, seed, preferredTemplateIds, ...)
 * @returns           ComposeResult (pages, warnings, seed)
 */
export async function compose(
  analyzed: AnalyzeResult,
  recommended: RecommendResult,
  opts: ComposeOptions,
): Promise<ComposeResult> {
  const seed = opts.seed ?? 0
  const format: LayoutFormat = opts.format ?? DEFAULT_FORMAT
  const enableSplitMerge = opts.enableSplitMerge !== false // 기본 true

  // 1. 페이지 분할
  const pageGroups = enableSplitMerge
    ? splitScenes(recommended.scenes, analyzed)
    : recommended.scenes.map((r, i) => ({
        pageIndex: i,
        sceneIndices: [r.sceneIndex],
        templateHint: 'default' as TemplateHint,
      }))

  // 2. 각 PageGroup → PageDraft
  const pages: PageDraft[] = []
  const globalWarnings: string[] = []

  for (const group of pageGroups) {
    const { fabricJson, templateId, warnings } = await buildPageFabricJson(
      group.pageIndex,
      group.sceneIndices,
      analyzed,
      recommended,
      format,
      opts,
      group.templateHint,
    )

    pages.push({
      pageIndex: group.pageIndex,
      templateId,
      fabricJson,
      sceneIndices: group.sceneIndices,
      warnings,
    })

    // page 경고를 global 에도 취합
    globalWarnings.push(
      ...warnings.filter((w) => w.includes('[lowDpi]') || w.includes('[safe-area]')),
    )
  }

  return {
    formatId: format.id,
    pages,
    warnings: [...new Set(globalWarnings)], // 중복 제거
    seed,
  }
}
