/**
 * slot-assign.ts — Slot 배치 알고리즘 (M4-03 Step 2)
 *
 * Template.slots[] 에 SceneRecommendation 의 포즈/배경/말풍선을 배치한다.
 * lowDpi 제약(ADR-0011a) 적용.
 *
 * 결정론: seed 기반 정렬, 랜덤 없음
 */

import type { SceneRecommendation } from '@storywork/ai-recommend'
import type { AnalyzedScene } from '@storywork/ai-script'
import { isCaptionLine, isDialogueLine } from '@storywork/ai-script'

import { assignBubblesByCost, speakerAnchorFromPoseSlot } from './bubble-cost.js'
import type { SpeakerAnchor } from './bubble-cost.js'
import { captionSlotsOf, groupCaptionLines, joinCaptionBox } from './caption-slots.js'
import { checkLowDpiConstraint, formatLowDpiWarning } from './constraints/low-dpi.js'
import type {
  LayoutFormat,
  LayoutSlot,
  LayoutTemplate,
  ResourceTagAdapter,
  SlotAssignment,
} from './types.js'

// ─────────────────────────────────────────────
// 내부 헬퍼 — safe area 침범 검사
// ─────────────────────────────────────────────

/**
 * 텍스트/말풍선 슬롯이 safe area 를 침범하는지 검사.
 *
 * safe area 체크는 텍스트/말풍선 종류에만 적용한다.
 * 배경(bg)·포즈(pose)는 의도적으로 bleed 경계까지 확장되므로 safe area 체크 제외.
 * optional 슬롯도 safe area 체크 제외.
 *
 * safe area 경계: safeMm / 판형 크기(mm) 로 정규화
 */
function isTextSafeAreaViolation(slot: LayoutSlot, format: LayoutFormat): boolean {
  // bg, pose 슬롯은 체크 제외
  const isTextLike =
    slot.allowedKinds.some((k) => k === 'bubble' || k === 'text') &&
    !slot.allowedKinds.some((k) => k === 'pose' || k === 'bg')

  if (!isTextLike) return false
  if (slot.optional) return false

  const safeLeft = format.safeMm / format.widthMm
  const safeTop = format.safeMm / format.heightMm
  const safeRight = 1 - safeLeft
  const safeBottom = 1 - safeTop

  return (
    slot.x < safeLeft ||
    slot.y < safeTop ||
    slot.x + slot.w > safeRight ||
    slot.y + slot.h > safeBottom
  )
}

// ─────────────────────────────────────────────
// 배경 색상 → fabric fill 변환
// ─────────────────────────────────────────────

const BG_TONE_COLOR: Record<string, string> = {
  cream: '#FFF8F0',
  mint: '#F0FFF4',
  lilac: '#F3F0FF',
  pink: '#FFF0F5',
  navy: '#E8EBF0',
  white: '#FFFFFF',
}

// ─────────────────────────────────────────────
// 공개 API — assignSlots()
// ─────────────────────────────────────────────

export interface SlotAssignResult {
  assignments: SlotAssignment[]
  warnings: string[]
}

/**
 * Template.slots 에 SceneRecommendation 자원을 배치한다.
 *
 * @param template      배치할 Template
 * @param sceneRec      장면 추천 결과
 * @param analyzedScene 장면 상세 (lines, characters)
 * @param format        판형 (mm 단위, safe area 검사용)
 * @param tagAdapter    lowDpi 태그 조회 어댑터 (null 이면 lowDpi 없음으로 처리)
 * @returns             SlotAssignResult
 */
export async function assignSlots(
  template: LayoutTemplate,
  sceneRec: SceneRecommendation,
  analyzedScene: AnalyzedScene,
  format: LayoutFormat,
  tagAdapter: ResourceTagAdapter | null,
): Promise<SlotAssignResult> {
  const assignments: SlotAssignment[] = []
  const warnings: string[] = []

  // 캐릭터 목록 (장면 characters + 대사 화자)
  const chars = new Set<string>([
    ...analyzedScene.characters,
    ...analyzedScene.lines.filter((l) => l.speaker).map((l) => l.speaker as string),
  ])
  const charList = Array.from(chars)

  // 포즈 슬롯 목록 (zIndex 오름차순 → left→right 순)
  const poseSlots = template.slots
    .filter((s) => s.allowedKinds.includes('pose'))
    .sort((a, b) => a.x - b.x)

  // 배경 슬롯
  const bgSlots = template.slots.filter((s) => s.allowedKinds.includes('bg'))

  // 말풍선 슬롯 (캡션 전용 슬롯은 제외 — 대사가 캡션 자리에 들어가면 안 된다)
  const bubbleSlots = template.slots
    .filter(
      (s) =>
        (s.allowedKinds.includes('bubble') || s.allowedKinds.includes('text')) &&
        !s.allowedKinds.includes('caption'),
    )
    .sort((a, b) => a.y - b.y || a.x - b.x)

  // ── 배경 슬롯 배치 ─────────────────────────────────────────────────────────
  for (const bgSlot of bgSlots) {
    if (isTextSafeAreaViolation(bgSlot, format)) {
      warnings.push(`[safe-area] 배경 슬롯 ${bgSlot.id} 가 safe area 를 침범합니다.`)
    }
    assignments.push({
      slotId: bgSlot.id,
      slot: bgSlot,
      kind: 'background',
      // 배경은 색상 톤으로 처리 (resourceId 없음)
      resourceId: undefined,
      characterName: undefined,
      text: sceneRec.background.suggestedTone,
    })
  }

  // ── 포즈 슬롯 배치 ─────────────────────────────────────────────────────────
  for (let i = 0; i < poseSlots.length; i++) {
    const poseSlot = poseSlots[i]
    if (!poseSlot) continue

    // safe area 검사
    if (isTextSafeAreaViolation(poseSlot, format)) {
      warnings.push(`[safe-area] 포즈 슬롯 ${poseSlot.id} 가 safe area 를 침범합니다.`)
    }

    // 이 슬롯에 배치할 캐릭터
    const charName = charList[i]
    if (!charName) {
      if (!poseSlot.optional) {
        warnings.push(`[slot-empty] 필수 포즈 슬롯 ${poseSlot.id} 에 배치할 캐릭터가 없습니다.`)
      }
      assignments.push({
        slotId: poseSlot.id,
        slot: poseSlot,
        kind: 'empty',
      })
      continue
    }

    // 캐릭터 포즈 후보 (신뢰도 내림차순)
    const poseCandidates = (sceneRec.poses[charName] ?? []).sort(
      (a, b) => b.confidence - a.confidence,
    )

    // lowDpi 제약 적용: 통과하는 첫 번째 후보 선택
    let selectedResourceId: string | undefined
    let lowDpiViolation = false
    let effectiveDpi: number | undefined

    for (const candidate of poseCandidates) {
      let isLowDpi = false
      let assetSize: { w: number; h: number } | null = null

      if (tagAdapter) {
        const tags = await tagAdapter.getTags(candidate.resourceId)
        isLowDpi = tags.includes('lowDpi')
        if (isLowDpi) {
          assetSize = await tagAdapter.getMasterSize(candidate.resourceId)
        }
      }

      const check = checkLowDpiConstraint(isLowDpi, assetSize, poseSlot, format)
      effectiveDpi = check.effectiveDpi

      if (check.ok) {
        selectedResourceId = candidate.resourceId
        break
      }

      // size-violation → 다음 후보 시도
      if (check.reason === 'size-violation') {
        const warnMsg = formatLowDpiWarning(candidate.resourceId, poseSlot.id, check)
        if (!warnings.includes(warnMsg)) warnings.push(warnMsg)
        continue
      }

      // dpi-warning/error → 경고 추가 후 사용 (fallback 자산 없으면 그대로 사용)
      const warnMsg = formatLowDpiWarning(candidate.resourceId, poseSlot.id, check)
      if (!warnings.includes(warnMsg)) warnings.push(warnMsg)
      selectedResourceId = candidate.resourceId
      lowDpiViolation = true
      break
    }

    // 모든 후보 size-violation → 첫 번째 후보를 경고와 함께 사용
    const firstCandidate = poseCandidates[0]
    if (!selectedResourceId && firstCandidate) {
      selectedResourceId = firstCandidate.resourceId
      lowDpiViolation = true
      warnings.push(
        `[lowDpi] resource=${selectedResourceId} slot=${poseSlot.id}: 모든 후보가 lowDpi 제약 위반. 첫 번째 후보로 폴백.`,
      )
    }

    assignments.push({
      slotId: poseSlot.id,
      slot: poseSlot,
      kind: 'pose',
      resourceId: selectedResourceId,
      characterName: charName,
      lowDpiViolation,
      effectiveDpi,
      // M4-05 컷 교체: 후보 K개를 레이어 메타로 영속 (편집기 대안 패널 데이터 소스)
      poseAlternatives: poseCandidates.slice(0, 5).map((c) => ({
        resourceId: c.resourceId,
        poseAction: c.poseAction,
        confidence: c.confidence,
        characterName: charName,
      })),
    })
  }

  // ── 말풍선/텍스트 슬롯 배치 (BUBBLE-02: 4항 비용함수 기반 line→slot 매핑) ──
  // cost = w1·(화자 mouth 근접+꼬리 각도) + w2·얼굴 가림 + w3·읽기순서 + w4·경계 침범
  //
  // 말풍선에는 **대사만** 넣는다 (SCRIPT-KO-04). 서술·지문은 아래 캡션 박스로 간다.
  const lines = analyzedScene.lines.filter((l) => isDialogueLine(l))

  // 포즈 배치 결과에서 화자 앵커 구성 (키포인트 어댑터 부재 시 슬롯 휴리스틱)
  const anchors = new Map<string, SpeakerAnchor>()
  for (const a of assignments) {
    if (a.kind === 'pose' && a.characterName && !anchors.has(a.characterName)) {
      anchors.set(a.characterName, speakerAnchorFromPoseSlot(a.slot, a.characterName))
    }
  }

  const { slotIndexByLine } = assignBubblesByCost({
    lines,
    slots: bubbleSlots,
    anchors,
    format,
  })
  const lineBySlot = new Map<number, number>()
  for (const [li, si] of slotIndexByLine) lineBySlot.set(si, li)

  for (let i = 0; i < bubbleSlots.length; i++) {
    const bubbleSlot = bubbleSlots[i]
    if (!bubbleSlot) continue

    if (isTextSafeAreaViolation(bubbleSlot, format)) {
      warnings.push(`[safe-area] 말풍선 슬롯 ${bubbleSlot.id} 가 safe area 를 침범합니다.`)
    }

    const lineIdx = lineBySlot.get(i)
    const line = lineIdx !== undefined ? lines[lineIdx] : undefined
    if (!line) {
      // optional 슬롯이면 건너뜀
      if (bubbleSlot.optional) continue
      assignments.push({
        slotId: bubbleSlot.id,
        slot: bubbleSlot,
        kind: 'empty',
      })
      continue
    }

    const bubbleCandidate = sceneRec.bubbles[lineIdx ?? i]
    assignments.push({
      slotId: bubbleSlot.id,
      slot: bubbleSlot,
      kind: 'bubble',
      characterName: line.speaker,
      text: line.text,
      // 대사 순번 — 배치 품질 측정이 읽기 순서를 복원하는 근거 (LAYOUT-04)
      lineIndex: lineIdx ?? i,
      // bubbleCandidate 는 shape 정보 — meta 에 저장
    })

    // 사용되지 않은 bubbleCandidate 억제 경고 방지
    void bubbleCandidate
  }

  // ── 캡션(내레이션·지문) 박스 배치 (SCRIPT-KO-04) ────────────────────────────
  // 연속된 서술 여러 줄을 한 박스로 묶는다. 묶음 규칙은 수용량 계산과 같은 함수를 쓴다.
  const captionSlots = captionSlotsOf(template).sort((a, b) => a.y - b.y || a.x - b.x)
  const captionBoxes = groupCaptionLines(
    analyzedScene.lines.filter((l) => isCaptionLine(l)).map((l) => l.text),
  )

  for (let i = 0; i < captionSlots.length && i < captionBoxes.length; i++) {
    const captionSlot = captionSlots[i]
    const box = captionBoxes[i]
    if (!captionSlot || !box) continue

    if (isTextSafeAreaViolation(captionSlot, format)) {
      warnings.push(`[safe-area] 캡션 슬롯 ${captionSlot.id} 가 safe area 를 침범합니다.`)
    }

    assignments.push({
      slotId: captionSlot.id,
      slot: captionSlot,
      kind: 'caption',
      text: joinCaptionBox(box),
      captionLines: box,
    })
  }

  return { assignments, warnings }
}

// ─────────────────────────────────────────────
// 배경 색상 접근자 (fabricJson 생성 시 사용)
// ─────────────────────────────────────────────

export { BG_TONE_COLOR }
