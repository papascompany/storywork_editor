/**
 * useAlternativesStore — M4-05 단위 테스트
 *
 * 검증:
 *   1. loadAlternatives: 유효한 meta → current 로드
 *   2. loadAlternatives: alternatives 없는 meta → current null
 *   3. loadAlternatives: null meta → current null
 *   4. loadAlternatives: 배경 후보 tone 매핑
 *   5. loadAlternatives: 말풍선 후보 shape 매핑
 *   6. selectCandidate: index 변경
 *   7. selectCandidate: 범위 초과 index → 무시
 *   8. selectCandidate: current null 시 → 무시
 *   9. loadAlternatives: 현재 적용된 resourceId 로 selectedIndex 설정
 *  10. clear: 상태 초기화
 */

import { beforeEach, describe, expect, it } from 'vitest'

import type { LayerAlternativesMeta } from '../../components/editor/store/useAlternativesStore'
import {
  selectCurrentCandidates,
  selectHasAlternatives,
  selectSelectedIndex,
  useAlternativesStore,
} from '../../components/editor/store/useAlternativesStore'

// 매 테스트 전 store 초기화
beforeEach(() => {
  useAlternativesStore.getState().clear()
})

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

function buildPoseMeta(overrides?: Partial<LayerAlternativesMeta>): LayerAlternativesMeta {
  return {
    kind: 'pose',
    sceneIndex: 0,
    characterName: 'Hero',
    resourceId: 'r-001',
    alternatives: [
      { resourceId: 'r-001', poseAction: '걷기', confidence: 0.9, reasoning: 'outdoor' },
      { resourceId: 'r-002', poseAction: '달리기', confidence: 0.7 },
      { resourceId: 'r-003', poseAction: '서기', confidence: 0.6 },
    ],
    ...overrides,
  }
}

function buildBgMeta(): LayerAlternativesMeta {
  return {
    kind: 'background',
    sceneIndex: 1,
    tone: 'cream',
    alternatives: [
      { tone: 'cream', confidence: 0.85 },
      { tone: 'mint', confidence: 0.6 },
      { tone: 'navy', confidence: 0.4 },
    ],
  }
}

function buildBubbleMeta(): LayerAlternativesMeta {
  return {
    kind: 'speech-bubble',
    sceneIndex: 2,
    shape: 'rounded',
    alternatives: [
      { shape: 'rounded', confidence: 0.9 },
      { shape: 'cloud', confidence: 0.5 },
    ],
  }
}

// ── 테스트 ─────────────────────────────────────────────────────────────────────

describe('useAlternativesStore', () => {
  it('1. 유효한 포즈 meta 로드 시 candidates 가 채워진다', () => {
    const { loadAlternatives } = useAlternativesStore.getState()
    loadAlternatives('layer-1', buildPoseMeta())

    const state = useAlternativesStore.getState()
    expect(state.current).not.toBeNull()
    expect(state.current?.layerId).toBe('layer-1')
    expect(state.current?.layerKind).toBe('pose')
    expect(state.current?.candidates).toHaveLength(3)
    expect(state.current?.candidates[0]?.label).toBe('포즈: 걷기')
  })

  it('2. alternatives 없는 meta → current null', () => {
    const { loadAlternatives } = useAlternativesStore.getState()
    loadAlternatives('layer-1', buildPoseMeta({ alternatives: [] }))

    expect(useAlternativesStore.getState().current).toBeNull()
  })

  it('3. null meta → current null', () => {
    const { loadAlternatives } = useAlternativesStore.getState()
    loadAlternatives('layer-1', null)

    expect(useAlternativesStore.getState().current).toBeNull()
  })

  it('4. 배경 후보 tone 매핑이 올바르다', () => {
    const { loadAlternatives } = useAlternativesStore.getState()
    loadAlternatives('layer-bg', buildBgMeta())

    const state = useAlternativesStore.getState()
    expect(state.current?.layerKind).toBe('bg')
    expect(state.current?.candidates[0]?.label).toBe('배경: cream')
    expect(state.current?.candidates[1]?.label).toBe('배경: mint')
  })

  it('5. 말풍선 후보 shape 매핑이 올바르다', () => {
    const { loadAlternatives } = useAlternativesStore.getState()
    loadAlternatives('layer-bubble', buildBubbleMeta())

    const state = useAlternativesStore.getState()
    expect(state.current?.layerKind).toBe('bubble')
    expect(state.current?.candidates[0]?.label).toBe('말풍선: rounded')
  })

  it('6. selectCandidate 로 selectedIndex 가 변경된다', () => {
    const store = useAlternativesStore.getState()
    store.loadAlternatives('layer-1', buildPoseMeta())
    store.selectCandidate(2)

    expect(useAlternativesStore.getState().current?.selectedIndex).toBe(2)
  })

  it('7. 범위 초과 index 는 무시된다', () => {
    const store = useAlternativesStore.getState()
    store.loadAlternatives('layer-1', buildPoseMeta())
    store.selectCandidate(99)

    // selectedIndex 는 변경되지 않음 (0 유지)
    expect(useAlternativesStore.getState().current?.selectedIndex).toBe(0)
  })

  it('8. current null 시 selectCandidate 는 무시된다', () => {
    const store = useAlternativesStore.getState()
    // loadAlternatives 미호출
    expect(() => store.selectCandidate(1)).not.toThrow()
    expect(useAlternativesStore.getState().current).toBeNull()
  })

  it('9. 현재 적용된 resourceId 로 selectedIndex 가 올바르게 설정된다', () => {
    const { loadAlternatives } = useAlternativesStore.getState()
    // 현재 적용 resourceId = r-002 (index 1)
    loadAlternatives(
      'layer-1',
      buildPoseMeta({
        resourceId: 'r-002',
      }),
    )

    expect(useAlternativesStore.getState().current?.selectedIndex).toBe(1)
  })

  it('10. clear 후 상태가 초기화된다', () => {
    const store = useAlternativesStore.getState()
    store.loadAlternatives('layer-1', buildPoseMeta())
    store.clear()

    const state = useAlternativesStore.getState()
    expect(state.current).toBeNull()
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('셀렉터: selectCurrentCandidates 는 candidates 배열을 반환한다', () => {
    useAlternativesStore.getState().loadAlternatives('layer-1', buildPoseMeta())
    const candidates = selectCurrentCandidates(useAlternativesStore.getState())
    expect(candidates).toHaveLength(3)
  })

  it('셀렉터: selectSelectedIndex 는 현재 selectedIndex 를 반환한다', () => {
    useAlternativesStore.getState().loadAlternatives('layer-1', buildPoseMeta())
    expect(selectSelectedIndex(useAlternativesStore.getState())).toBe(0)
  })

  it('셀렉터: selectHasAlternatives 는 후보 2개 이상이면 true', () => {
    useAlternativesStore.getState().loadAlternatives('layer-1', buildPoseMeta())
    expect(selectHasAlternatives(useAlternativesStore.getState())).toBe(true)
  })

  it('셀렉터: selectHasAlternatives 는 후보 1개면 false', () => {
    useAlternativesStore
      .getState()
      .loadAlternatives(
        'layer-1',
        buildPoseMeta({
          alternatives: [{ resourceId: 'r-001', poseAction: '걷기', confidence: 1.0 }],
        }),
      )
    expect(selectHasAlternatives(useAlternativesStore.getState())).toBe(false)
  })
})
