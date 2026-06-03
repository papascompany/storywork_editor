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

  // 말풍선/텍스트 슬롯
  const bubbleSlots = template.slots
    .filter((s) => s.allowedKinds.includes('bubble') || s.allowedKinds.includes('text'))
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
    })
  }

  // ── 말풍선/텍스트 슬롯 배치 ───────────────────────────────────────────────
  const lines = analyzedScene.lines
  for (let i = 0; i < bubbleSlots.length; i++) {
    const bubbleSlot = bubbleSlots[i]
    if (!bubbleSlot) continue

    if (isTextSafeAreaViolation(bubbleSlot, format)) {
      warnings.push(`[safe-area] 말풍선 슬롯 ${bubbleSlot.id} 가 safe area 를 침범합니다.`)
    }

    const line = lines[i]
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

    const bubbleCandidate = sceneRec.bubbles[i]
    assignments.push({
      slotId: bubbleSlot.id,
      slot: bubbleSlot,
      kind: 'bubble',
      characterName: line.speaker,
      text: line.text,
      // bubbleCandidate 는 shape 정보 — meta 에 저장
    })

    // 사용되지 않은 bubbleCandidate 억제 경고 방지
    void bubbleCandidate
  }

  return { assignments, warnings }
}

// ─────────────────────────────────────────────
// 배경 색상 접근자 (fabricJson 생성 시 사용)
// ─────────────────────────────────────────────

export { BG_TONE_COLOR }
