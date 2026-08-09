/**
 * compose.ts — ai-layout 메인 함수 (M4-03 Step 4 · LAYOUT-03 수용량 반영)
 *
 * 처리 흐름:
 *  1. Format 로드 (opts.format 직접 주입 또는 formatId 기반 폴백)
 *  2. splitScenes() → PageGroup[]                     — 연출 규칙(R1~R5)
 *  3. planCapacityPages() → PageGroup[]               — 대사 수용량 재계획 (LAYOUT-03)
 *  4. 각 PageGroup:
 *     a. 확정된 Template 로드 (+ 부족하면 말풍선 슬롯 동적 보강)
 *     b. assignSlots() → SlotAssignment[] (lowDpi 제약 포함)
 *     c. buildFabricJson() → PageFabricJson (Schema v1 호환)
 *  5. warnings 종합 → ComposeResult 반환
 *
 * 결정론: seed 고정 → 동일 입력 → 동일 출력
 * mm 단위 전용: 픽셀 하드코딩 금지 (CLAUDE.md §8)
 */

import type { RecommendResult } from '@storywork/ai-recommend'
import type { AnalyzeResult, AnalyzedScene } from '@storywork/ai-script'
import { isCaptionLine } from '@storywork/ai-script'

import { assignBubblesByCost, speakerAnchorFromPoseSlot } from './bubble-cost.js'
import type { SpeakerAnchor } from './bubble-cost.js'
import { withGeneratedBubbleSlots } from './bubble-slots.js'
import {
  captionTextsOf,
  dialogueLinesOf,
  planCapacityPages,
  resolveTemplateHint,
  sceneSpeakers,
} from './capacity.js'
import {
  captionBoxesNeeded,
  captionSlotsOf,
  groupCaptionLines,
  withGeneratedCaptionSlots,
} from './caption-slots.js'
import { checkLowDpiConstraint, formatLowDpiWarning } from './constraints/low-dpi.js'
import { splitScenes } from './page-split.js'
import { assignSlots, BG_TONE_COLOR } from './slot-assign.js'
import { isWebtoonFormat, normalizeWebtoonFormat, planningTemplate } from './strip.js'
import { matchTemplate, PRESET_TEMPLATES } from './template-match.js'
import type {
  ComposeOptions,
  ComposeResult,
  FabricLayer,
  LayoutFormat,
  LayoutSlot,
  LayoutTemplate,
  PageDraft,
  PageFabricJson,
  PageGroup,
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
  sceneIndex?: number,
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
        // kind/resourceId/alternatives 는 M4-05 편집기 컷 교체 UI 의 파싱 계약
        // (useAlternativesStore.parseAlternatives — meta.kind 필수)
        meta: {
          kind: 'pose',
          resourceId: assignment.resourceId,
          characterName: assignment.characterName,
          // 멀티 장면 경로와 대칭 — 향후 장면 컨텍스트 재추천의 참조점
          sceneIndex,
          lowDpiViolation: assignment.lowDpiViolation ?? false,
          effectiveDpi: assignment.effectiveDpi,
          ...(assignment.poseAlternatives && assignment.poseAlternatives.length > 0
            ? { alternatives: assignment.poseAlternatives }
            : {}),
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
          // 대사 순번 — 배치 품질 측정(LAYOUT-04)이 읽기 순서를 복원하는 근거
          lineIndex: assignment.lineIndex,
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
// 캡션(내레이션·지문) 레이어 (SCRIPT-KO-04)
// ─────────────────────────────────────────────

/** 캡션 본문 글자 크기 (pt) — 대사(14)보다 작게 둬 말풍선과 시각적으로 구분한다 */
const CAPTION_FONT_SIZE = 12

/**
 * 캡션 박스 하나 → **줄당 하나씩**의 텍스트 레이어.
 *
 * 한 레이어에 개행을 넣지 않는 이유: PDF 렌더(pdf-lib `drawText`)는 `\n` 을 만나면
 * 페이지 기본 lineHeight(24pt)로 줄을 내려 12pt 캡션이 박스를 넘긴다.
 * 줄 위치를 여기서 직접 계산해 그 경로를 아예 쓰지 않는다.
 */
function captionLayersOf(
  slot: LayoutSlot,
  lines: readonly string[],
  format: LayoutFormat,
  makeLayerId: (lineIndex: number) => string,
  sceneIndex?: number,
): FabricLayer[] {
  if (lines.length === 0) return []

  const widthMm = slot.w * format.widthMm
  const boxHeightMm = slot.h * format.heightMm
  const lineHeightMm = boxHeightMm / lines.length

  return lines.map((text, i) => ({
    id: makeLayerId(i),
    kind: 'text',
    data: {
      slotId: slot.id,
      locked: false,
      visible: true,
      meta: {
        kind: 'caption',
        lineKind: 'caption',
        text,
        // 같은 박스에 묶인 줄들 — 편집기가 한 덩어리로 다룰 수 있게 슬롯 ID 와 순서를 남긴다
        captionBoxSlotId: slot.id,
        captionLineIndex: i,
        sceneIndex,
      },
    },
    fabric: {
      type: 'textbox',
      leftMm: slot.x * format.widthMm,
      topMm: slot.y * format.heightMm + i * lineHeightMm,
      widthMm,
      heightMm: lineHeightMm,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      opacity: 1,
      text,
      fontSize: CAPTION_FONT_SIZE,
      fill: '#000000',
      zIndex: slot.zIndex,
    },
  }))
}

// ─────────────────────────────────────────────
// PageGroup → PageFabricJson (Schema v1 호환)
// ─────────────────────────────────────────────

/**
 * 페이지가 담당하는 장면 사본 — `lineRanges` 가 있으면 그 구간의 대사만 남긴다.
 *
 * `characters` 는 **전체 장면의 화자 집합**으로 고정한다. 대사를 잘라내면 그 페이지의
 * 화자가 사라져 필수 포즈 슬롯이 비는데(= `[slot-empty]`), 템플릿은 전체 장면 기준으로
 * 골랐으므로 그건 계획과 배치가 어긋난 것이다.
 */
function scenePageView(
  scene: AnalyzedScene,
  range?: { start: number; end: number },
): AnalyzedScene {
  if (!range) return scene
  return {
    ...scene,
    lines: scene.lines.slice(range.start, range.end),
    characters: sceneSpeakers(scene),
  }
}

/**
 * 멀티 scene 페이지 처리 전략:
 * - 단일 scene: 전체 template에 대해 assignSlots() 1회 호출
 * - 멀티 scene (1on1-talk, four-cut 등): 각 scene의 첫 번째 포즈 후보를 순서대로
 *   pose 슬롯에 배치하고, 배경은 첫 scene 기준 1회, 말풍선은 **페이지 전체 대사**를
 *   BUBBLE-02 비용함수로 배치한다(컷별 화자 앵커 → 자기 컷 근처로 모인다).
 */
async function buildPageFabricJson(
  group: PageGroup,
  analyzed: AnalyzeResult,
  recommended: RecommendResult,
  format: LayoutFormat,
  opts: ComposeOptions,
): Promise<{ fabricJson: PageFabricJson; templateId?: string; warnings: string[] }> {
  const { pageIndex, sceneIndices } = group
  const seed = opts.seed ?? 0
  const templates = opts._templates ?? []
  const preferredIds = opts.preferredTemplateIds ?? []
  const tagAdapter = opts._resourceTagAdapter ?? null

  const rangeOf = (sceneIndex: number): { start: number; end: number } | undefined =>
    group.lineRanges?.find((r) => r.sceneIndex === sceneIndex)

  // 첫 번째 장면 기준으로 templateHint 결정
  const firstSceneIdx = sceneIndices[0] ?? 0
  const firstScene = analyzed.scenes.find((s) => s.index === firstSceneIdx)

  // page-split 의 templateHint 우선 사용 (R3 풀샷 단독 등 명시적 분류 보존).
  // 없으면 장면 수/cameraAngle 로 fallback 추론 — 수용량 패스와 같은 규칙을 쓴다.
  const hint = resolveTemplateHint(group.templateHint, sceneIndices.length, firstScene)

  // Template — 수용량 패스가 확정했으면 그대로 쓴다(재매칭으로 계획과 어긋나지 않게).
  const pool = templates.length > 0 ? templates : PRESET_TEMPLATES
  const planned = group.templateId ? pool.find((t) => t.id === group.templateId) : undefined
  const baseTemplate: LayoutTemplate =
    planned ??
    matchTemplate(hint, preferredIds, firstScene ? sceneSpeakers(firstScene).length : 1, templates)
      .template

  // 이 페이지가 실을 라인 — 대사는 말풍선, 서술·지문은 캡션 박스로 (LAYOUT-03 · SCRIPT-KO-04)
  const pageViewLines = sceneIndices.flatMap((idx) => {
    const scene = analyzed.scenes.find((s) => s.index === idx)
    return scene ? scenePageView(scene, rangeOf(idx)).lines : []
  })
  // 웹툰이면 리듬 인셋 사본 — capacity 의 수용량 계산과 같은 변환이어야 한다 (MODE-03)
  const rhythmTemplate = planningTemplate(baseTemplate, format)
  // 보강 순서는 capacity.pageBudgetOf() 와 같아야 한다 — 말풍선이 먼저 자리를 잡고,
  // 캡션은 남은 자리에 만들어진다. 순서가 어긋나면 계획한 수용량과 실제가 달라진다.
  const template = withGeneratedCaptionSlots(
    withGeneratedBubbleSlots(rhythmTemplate, format, dialogueLinesOf(pageViewLines).length),
    format,
    captionBoxesNeeded(captionTextsOf(pageViewLines)),
  )

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
          scenePageView(scene, rangeOf(sceneIdx)),
          format,
          tagAdapter,
        )
        allWarnings.push(...warnings)

        for (let ai = 0; ai < assignments.length; ai++) {
          const assignment = assignments[ai]
          if (!assignment || usedSlotIds.has(assignment.slotId)) continue
          usedSlotIds.add(assignment.slotId)

          // 캡션은 줄당 레이어 — 개행 한 덩어리로 내보내면 PDF 에서 박스를 넘친다
          if (assignment.kind === 'caption') {
            layers.push(
              ...captionLayersOf(
                assignment.slot,
                assignment.captionLines ?? [],
                format,
                (li) => makeId(seed, pageIndex * 100 + ai, `${assignment.slot.id}-${li}`),
                sceneIdx,
              ),
            )
            continue
          }

          const layer = assignmentToFabricLayer(
            assignment,
            format,
            seed,
            pageIndex * 100 + ai,
            sceneIdx,
          )
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

    // 배경 슬롯은 첫 번째 scene 기준으로 1회 배치
    const firstSceneRec = recommended.scenes.find((r) => r.sceneIndex === firstSceneIdx)
    if (firstScene && firstSceneRec) {
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
    }

    // 각 scene → 순서대로 pose 슬롯에 배치 (말풍선보다 먼저 — 화자 앵커의 근거)
    const anchors = new Map<string, SpeakerAnchor>()
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

      if (charName) {
        // 같은 인물이 여러 컷에 나와도 컷마다 별도 앵커 — 대사가 자기 컷으로 모인다
        anchors.set(`${sceneIdx}::${charName}`, speakerAnchorFromPoseSlot(poseSlot, charName))
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
          // M4-05 컷 교체 파싱 계약 (단일 장면 경로와 동일)
          meta: {
            kind: 'pose',
            resourceId,
            characterName: charName,
            sceneIndex: sceneIdx,
            lowDpiViolation,
            ...(poseCandidates.length > 0
              ? {
                  alternatives: poseCandidates.slice(0, 5).map((c) => ({
                    resourceId: c.resourceId,
                    poseAction: c.poseAction,
                    confidence: c.confidence,
                    characterName: charName,
                  })),
                }
              : {}),
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

    // ── 말풍선: 페이지 전체 대사를 4항 비용함수로 배치 (LAYOUT-03) ──────────
    // 종전에는 첫 장면 대사만 슬롯 순서대로 꽂아 나머지 컷의 대사가 통째로 사라졌다.
    const pageLines: Array<{ sceneIndex: number; text: string; speaker?: string | null }> = []
    const captionEntries: Array<{ sceneIndex: number; text: string }> = []
    for (const sceneIdx of sceneIndices) {
      const scene = analyzed.scenes.find((s) => s.index === sceneIdx)
      if (!scene) continue
      for (const line of scenePageView(scene, rangeOf(sceneIdx)).lines) {
        // 서술·지문은 말풍선이 아니라 캡션 박스로 (SCRIPT-KO-04)
        if (isCaptionLine(line)) {
          captionEntries.push({ sceneIndex: sceneIdx, text: line.text })
          continue
        }
        pageLines.push({ sceneIndex: sceneIdx, text: line.text, speaker: line.speaker })
      }
    }

    const bubbleSlots = template.slots
      .filter(
        (s) =>
          (s.allowedKinds.includes('bubble') || s.allowedKinds.includes('text')) &&
          !s.allowedKinds.includes('caption'),
      )
      .sort((a, b) => a.y - b.y || a.x - b.x)

    const { slotIndexByLine } = assignBubblesByCost({
      lines: pageLines.map((l) => ({
        speaker: l.speaker ? `${l.sceneIndex}::${l.speaker}` : null,
      })),
      slots: bubbleSlots,
      anchors,
      format,
    })

    for (const [lineIdx, slotIdx] of [...slotIndexByLine].sort((a, b) => a[0] - b[0])) {
      const bubbleSlot = bubbleSlots[slotIdx]
      const line = pageLines[lineIdx]
      if (!bubbleSlot || !line || usedSlotIds.has(bubbleSlot.id)) continue
      usedSlotIds.add(bubbleSlot.id)
      layers.push({
        id: makeId(seed, pageIndex * 100 + lineIdx + 50, bubbleSlot.id),
        kind: 'bubble',
        data: {
          slotId: bubbleSlot.id,
          locked: false,
          visible: true,
          meta: {
            text: line.text,
            speaker: line.speaker ?? undefined,
            sceneIndex: line.sceneIndex,
            // 대사 순번 — 배치 품질 측정(LAYOUT-04)이 읽기 순서를 복원하는 근거
            lineIndex: lineIdx,
          },
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
          text: line.text,
          fontSize: 14,
          fill: '#000000',
          zIndex: bubbleSlot.zIndex,
        },
      })
    }

    // ── 캡션(내레이션·지문) 박스 — 페이지 전체 서술을 순서대로 묶어 배치 ─────────
    const captionSlots = captionSlotsOf(template).sort((a, b) => a.y - b.y || a.x - b.x)
    const captionBoxes = groupCaptionLines(captionEntries.map((e) => e.text))
    let captionCursor = 0

    for (let bi = 0; bi < captionSlots.length && bi < captionBoxes.length; bi++) {
      const captionSlot = captionSlots[bi]
      const box = captionBoxes[bi]
      if (!captionSlot || !box || usedSlotIds.has(captionSlot.id)) continue
      const firstEntry = captionEntries[captionCursor]
      captionCursor += box.length
      usedSlotIds.add(captionSlot.id)

      layers.push(
        ...captionLayersOf(
          captionSlot,
          box,
          format,
          (li) => makeId(seed, pageIndex * 100 + bi + 80, `${captionSlot.id}-${li}`),
          firstEntry?.sceneIndex,
        ),
      )
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
      // 웹툰 세그먼트 표시 (MODE-03) — editor-core 는 _aiMeta 를 무시해도 무방
      ...(isWebtoonFormat(format) ? { mode: 'webtoon' as const } : {}),
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
  // 웹툰(px) 판형은 스트립 계획용으로 정규화된다 — safeMm 가 리듬 인셋(px)으로 재해석 (MODE-03)
  const format: LayoutFormat = normalizeWebtoonFormat(opts.format ?? DEFAULT_FORMAT)
  const webtoon = isWebtoonFormat(format)
  const enableSplitMerge = opts.enableSplitMerge !== false // 기본 true

  // 1. 페이지 분할 — 연출 규칙 (R1~R5).
  //    웹툰은 합병(한 지면에 여러 컷)이 인쇄 문법이라 쓰지 않는다 — 장면당 1세그먼트.
  //    enableSplitMerge 옵션은 웹툰에서 무시된다(합병 없음이 모드의 정의).
  const sceneGroups: PageGroup[] =
    !webtoon && enableSplitMerge
      ? splitScenes(recommended.scenes, analyzed)
      : recommended.scenes.map((r, i) => ({
          pageIndex: i,
          sceneIndices: [r.sceneIndex],
          templateHint: 'default' as TemplateHint,
        }))

  // 2. 대사 수용량 재계획 — 템플릿 확정 + 합병 해제 + 분할 (LAYOUT-03).
  //    웹툰에서 "분할"은 페이지가 아니라 **스트립 연장**(세그먼트 추가)이다 — 항상 허용.
  const pageGroups = planCapacityPages(sceneGroups, analyzed, {
    templates: opts._templates ?? [],
    preferredIds: opts.preferredTemplateIds ?? [],
    format,
    allowSplit: webtoon ? true : enableSplitMerge,
  })

  // 3. 각 PageGroup → PageDraft
  const pages: PageDraft[] = []
  const globalWarnings: string[] = []

  for (const group of pageGroups) {
    const { fabricJson, templateId, warnings } = await buildPageFabricJson(
      group,
      analyzed,
      recommended,
      format,
      opts,
    )

    pages.push({
      pageIndex: group.pageIndex,
      templateId,
      fabricJson,
      sceneIndices: group.sceneIndices,
      ...(group.lineRanges ? { lineRanges: group.lineRanges } : {}),
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
