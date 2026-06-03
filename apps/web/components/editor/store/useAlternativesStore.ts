'use client'

/**
 * useAlternativesStore — AI 추천 대안 후보 상태 (Zustand + Immer)
 *
 * M4-05: 한 클릭 교체 UI
 *
 * 데이터 흐름:
 *   1. loadAlternatives(layerId, fabricJson) 로 현재 layer 의 meta.alternatives 읽기
 *   2. applyCandidate(index) 로 fabricJson 의 해당 layer 속성 갱신
 *   3. canvas 는 EditorShell 이 제공하는 외부 콜백(onApply) 으로 재렌더
 *
 * 설계 선택 — 옵션 C (클라이언트 메모리 캐시):
 *   full-pipeline 이 반환한 fabricJson.objects[].data.meta.alternatives 를
 *   클라이언트 세션 동안 메모리에 보관.
 *   M4-04 영역 (full-pipeline route) 을 건드리지 않음.
 */

import type { BgTone, BubbleShape } from '@storywork/ai-recommend'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export type AlternativeLayerKind = 'pose' | 'bubble' | 'bg' | 'wordFx'

export interface AlternativeCandidate {
  index: number
  resourceId?: string
  thumbnail?: string
  /** "포즈: 걷기", "배경: cream" 등 */
  label: string
  /** 0~1 */
  confidence: number
  reasoning?: string
  // pose 전용
  poseAction?: string
  characterName?: string
  // bubble 전용
  shape?: BubbleShape
  // bg 전용
  tone?: BgTone
}

interface AlternativesCurrent {
  layerId: string
  layerKind: AlternativeLayerKind
  sceneIndex: number
  candidates: AlternativeCandidate[]
  /** 현재 캔버스에 적용된 후보 index */
  selectedIndex: number
}

interface AlternativesState {
  current: AlternativesCurrent | null
  loading: boolean
  error: string | null
}

interface AlternativesActions {
  /**
   * 선택된 layer 의 fabricJson meta 에서 alternatives 를 읽어 store 에 로드.
   * layerMeta 는 canvas.getObjectData(layerId)?.meta 형태.
   */
  loadAlternatives: (layerId: string, layerMeta: LayerAlternativesMeta | null) => void
  /**
   * candidateIndex 번 후보로 교체 결정.
   * 실제 canvas 변경은 외부 콜백(onApply)을 통해 수행.
   */
  selectCandidate: (candidateIndex: number) => void
  /** 선택된 layer 가 해제되거나 다른 layer 선택 시 초기화 */
  clear: () => void
}

/**
 * fabricJson layer.data.meta 에서 alternatives 관련 필드.
 * M4-02/M4-03 의 compose() 가 생성하는 메타 스키마와 호환.
 */
export interface LayerAlternativesMeta {
  kind: string
  sceneIndex?: number
  characterName?: string
  resourceId?: string
  tone?: BgTone
  shape?: BubbleShape
  /** K=5 포즈/배경/말풍선 후보 목록 */
  alternatives?: RawAlternative[]
}

export interface RawAlternative {
  resourceId?: string
  thumbnail?: string
  poseAction?: string
  confidence: number
  reasoning?: string
  shape?: BubbleShape
  tone?: BgTone
  characterName?: string
}

// ─── 내부 헬퍼: RawAlternative → AlternativeCandidate ────────────────────────

function parseAlternatives(
  meta: LayerAlternativesMeta,
): {
  kind: AlternativeLayerKind
  candidates: AlternativeCandidate[]
  selectedIndex: number
} | null {
  const rawKind = meta.kind
  let kind: AlternativeLayerKind

  if (rawKind === 'pose') kind = 'pose'
  else if (rawKind === 'speech-bubble' || rawKind === 'bubble') kind = 'bubble'
  else if (rawKind === 'background') kind = 'bg'
  else if (rawKind === 'wordfx') kind = 'wordFx'
  else return null

  const rawList = meta.alternatives ?? []
  if (rawList.length === 0) return null

  const candidates: AlternativeCandidate[] = rawList.map((raw, i) => {
    let label = `후보 ${i + 1}`
    if (kind === 'pose' && raw.poseAction) {
      label = `포즈: ${raw.poseAction}`
    } else if (kind === 'bg' && raw.tone) {
      label = `배경: ${raw.tone}`
    } else if (kind === 'bubble' && raw.shape) {
      label = `말풍선: ${raw.shape}`
    }

    return {
      index: i,
      resourceId: raw.resourceId,
      thumbnail: raw.thumbnail,
      label,
      confidence: raw.confidence,
      reasoning: raw.reasoning,
      poseAction: raw.poseAction,
      characterName: raw.characterName ?? meta.characterName,
      shape: raw.shape,
      tone: raw.tone,
    }
  })

  // 현재 선택 index: resourceId / tone / shape 일치 기준
  let selectedIndex = 0
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]
    if (!c) continue
    if (kind === 'pose' && c.resourceId === meta.resourceId) {
      selectedIndex = i
      break
    }
    if (kind === 'bg' && c.tone === meta.tone) {
      selectedIndex = i
      break
    }
    if (kind === 'bubble' && c.shape === meta.shape) {
      selectedIndex = i
      break
    }
  }

  return { kind, candidates, selectedIndex }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAlternativesStore = create<AlternativesState & AlternativesActions>()(
  immer((set) => ({
    current: null,
    loading: false,
    error: null,

    loadAlternatives(layerId, layerMeta) {
      if (!layerMeta) {
        set((s) => {
          s.current = null
          s.error = null
          s.loading = false
        })
        return
      }

      const sceneIndex = layerMeta.sceneIndex ?? 0
      const parsed = parseAlternatives(layerMeta)

      if (!parsed) {
        set((s) => {
          s.current = null
          s.error = null
          s.loading = false
        })
        return
      }

      set((s) => {
        s.current = {
          layerId,
          layerKind: parsed.kind,
          sceneIndex,
          candidates: parsed.candidates,
          selectedIndex: parsed.selectedIndex,
        }
        s.loading = false
        s.error = null
      })
    },

    selectCandidate(candidateIndex) {
      set((s) => {
        if (!s.current) return
        if (candidateIndex < 0 || candidateIndex >= s.current.candidates.length) return
        s.current.selectedIndex = candidateIndex
      })
    },

    clear() {
      set((s) => {
        s.current = null
        s.error = null
        s.loading = false
      })
    },
  })),
)

// ─── 셀렉터 헬퍼 ─────────────────────────────────────────────────────────────

export const selectCurrentCandidates = (s: AlternativesState): AlternativeCandidate[] =>
  s.current?.candidates ?? []

export const selectSelectedIndex = (s: AlternativesState): number => s.current?.selectedIndex ?? 0

export const selectHasAlternatives = (s: AlternativesState): boolean =>
  (s.current?.candidates.length ?? 0) > 1
