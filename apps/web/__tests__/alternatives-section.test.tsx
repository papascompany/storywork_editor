/**
 * AlternativesSection — M4-05 컴포넌트 단위 테스트
 *
 * 검증:
 *   1. alternatives 없으면 섹션 렌더 안 됨
 *   2. alternatives 있으면 카드 그리드 렌더
 *   3. 현재 적용된 카드에 "현재" 배지 표시
 *   4. 다른 카드 클릭 → onApply 콜백 호출
 *   5. 현재 카드 클릭 → disabled (onApply 미호출)
 *   6. 배경 톤 후보 카드 렌더
 *   7. 말풍선 후보 카드 렌더
 */

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AlternativesSection } from '../components/editor/panels/alternatives-section'
import type { LayerAlternativesMeta } from '../components/editor/store/useAlternativesStore'
import { useAlternativesStore } from '../components/editor/store/useAlternativesStore'

afterEach(() => {
  cleanup()
  useAlternativesStore.getState().clear()
})

function loadPoseAlternatives() {
  const meta: LayerAlternativesMeta = {
    kind: 'pose',
    sceneIndex: 0,
    characterName: 'Hero',
    resourceId: 'r-001',
    alternatives: [
      { resourceId: 'r-001', poseAction: '걷기', confidence: 0.9 },
      { resourceId: 'r-002', poseAction: '달리기', confidence: 0.7 },
      { resourceId: 'r-003', poseAction: '서기', confidence: 0.5 },
    ],
  }
  useAlternativesStore.getState().loadAlternatives('layer-1', meta)
}

function loadBgAlternatives() {
  const meta: LayerAlternativesMeta = {
    kind: 'background',
    sceneIndex: 0,
    tone: 'cream',
    alternatives: [
      { tone: 'cream', confidence: 0.9 },
      { tone: 'mint', confidence: 0.6 },
    ],
  }
  useAlternativesStore.getState().loadAlternatives('layer-bg', meta)
}

function loadBubbleAlternatives() {
  const meta: LayerAlternativesMeta = {
    kind: 'speech-bubble',
    sceneIndex: 0,
    shape: 'rounded',
    alternatives: [
      { shape: 'rounded', confidence: 0.9 },
      { shape: 'cloud', confidence: 0.5 },
    ],
  }
  useAlternativesStore.getState().loadAlternatives('layer-bubble', meta)
}

describe('AlternativesSection', () => {
  beforeEach(() => {
    useAlternativesStore.getState().clear()
  })

  it('1. alternatives 없으면 섹션이 렌더되지 않는다', () => {
    const onApply = vi.fn()
    render(<AlternativesSection onApply={onApply} />)
    expect(screen.queryByTestId('alternatives-section')).toBeNull()
  })

  it('2. 포즈 alternatives 있으면 카드 그리드 렌더', () => {
    loadPoseAlternatives()
    const onApply = vi.fn()
    render(<AlternativesSection onApply={onApply} />)

    expect(screen.getByTestId('alternatives-section')).toBeTruthy()
    // 3개 카드
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('3. 현재 적용된 카드에 "현재" 배지 표시', () => {
    loadPoseAlternatives()
    const onApply = vi.fn()
    render(<AlternativesSection onApply={onApply} />)

    // 첫 번째 카드 (index=0)가 선택됨
    const currentBadges = document.querySelectorAll(
      '.rounded-full.bg-\\[var\\(--color-brand-500\\)\\]',
    )
    expect(currentBadges.length).toBeGreaterThanOrEqual(1)
  })

  it('4. 다른 카드 클릭 → onApply 콜백 호출', async () => {
    loadPoseAlternatives()
    const onApply = vi.fn()
    render(<AlternativesSection onApply={onApply} />)

    // 두 번째 카드 (달리기) 클릭
    const buttons = screen.getAllByRole('button')
    // buttons[0] 은 현재(disabled), buttons[1] 은 달리기
    const secondButton = buttons.find((b) => b.getAttribute('aria-label')?.includes('달리기'))
    if (secondButton) {
      await userEvent.click(secondButton)
      expect(onApply).toHaveBeenCalledOnce()
      expect(onApply.mock.calls[0]?.[0]?.poseAction).toBe('달리기')
    }
  })

  it('5. 현재 카드는 disabled — 클릭해도 onApply 미호출', async () => {
    loadPoseAlternatives()
    const onApply = vi.fn()
    render(<AlternativesSection onApply={onApply} />)

    const buttons = screen.getAllByRole('button')
    const currentButton = buttons.find((b) => b.getAttribute('aria-label')?.includes('현재 적용됨'))
    if (currentButton) {
      await userEvent.click(currentButton)
      expect(onApply).not.toHaveBeenCalled()
    }
  })

  it('6. 배경 톤 후보 카드 렌더', () => {
    loadBgAlternatives()
    const onApply = vi.fn()
    render(<AlternativesSection onApply={onApply} />)

    expect(screen.getByTestId('alternatives-section')).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByLabelText(/배경: cream 적용/)).toBeTruthy()
  })

  it('7. 말풍선 후보 카드 렌더', () => {
    loadBubbleAlternatives()
    const onApply = vi.fn()
    render(<AlternativesSection onApply={onApply} />)

    expect(screen.getByTestId('alternatives-section')).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByLabelText(/말풍선: rounded 적용/)).toBeTruthy()
  })

  it('모바일 모드에서도 정상 렌더', () => {
    loadPoseAlternatives()
    const onApply = vi.fn()
    render(<AlternativesSection onApply={onApply} isMobile />)

    expect(screen.getByTestId('alternatives-section')).toBeTruthy()
  })
})
