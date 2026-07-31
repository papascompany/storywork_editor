/**
 * ContiBoard.stories — 콘티 확정 단계 컷 리스트 (CONTI-03)
 *
 * 마법사의 "대본 → 콘티 확정 → 페이지 생성" 중간 단계.
 * 무영속 분석 결과를 컷 카드로 보여주고 제외/재생성/확정을 제공한다.
 */

import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'

import { ContiBoard } from '../../web/components/editor/script-importer/ContiBoard'
import type { ContiAnalyzeResponse } from '../../web/components/editor/script-importer/types'

// ─── 픽스처 ──────────────────────────────────────────────────────────────────

const SAMPLE_CONTI: ContiAnalyzeResponse = {
  scenes: [
    {
      index: 0,
      slug: 'scene-01',
      summary: '철수가 오래된 카페 앞에 서서 깊게 숨을 들이마신다.',
      lines: [
        { index: 0, speaker: '철수', text: '오랜만이네, 이 동네.' },
        { index: 1, text: '나무 간판이 바람에 흔들렸다.' },
      ],
      characters: ['철수'],
      meta: { emotion: 'calm' },
    },
    {
      index: 1,
      slug: 'scene-02',
      summary: '카페 안 — 영희가 창가 자리에서 머그컵을 감싸 쥐고 있다.',
      lines: [
        { index: 0, speaker: '영희', text: '늦었어.' },
        { index: 1, speaker: '철수', text: '미안해. 버스가 늦었어.' },
        { index: 2, speaker: '영희', text: '항상 그렇게 말하지.' },
        { index: 3, speaker: '철수', text: '이번엔 진짜야.' },
      ],
      characters: ['철수', '영희'],
      meta: { emotion: 'tense' },
    },
    {
      index: 2,
      slug: 'scene-03',
      summary: '그날 저녁, 민수가 공원 벤치에 앉아 전화를 기다린다.',
      lines: [{ index: 0, speaker: '민수', text: '다들 잘 지내?' }],
      characters: ['민수'],
      meta: { emotion: 'sad' },
    },
  ],
  characters: [
    { name: '철수', mentionCount: 3 },
    { name: '영희', mentionCount: 2 },
    { name: '민수', mentionCount: 1 },
  ],
  seed: 0,
  modelVersion: 'rule-only',
}

// ─── 메타 ────────────────────────────────────────────────────────────────────

const meta: Meta<typeof ContiBoard> = {
  title: 'Web/ScriptImporter/ContiBoard',
  component: ContiBoard,
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof ContiBoard>

// ─── 스토리 ──────────────────────────────────────────────────────────────────

function InteractiveTemplate({
  isGenerating = false,
  showRegenerate = false,
}: {
  isGenerating?: boolean
  showRegenerate?: boolean
}) {
  const [excluded, setExcluded] = React.useState<number[]>([])
  const [seed, setSeed] = React.useState(0)

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <ContiBoard
        conti={SAMPLE_CONTI}
        excludedSceneIndices={excluded}
        onToggleExclude={(idx) =>
          setExcluded((prev) =>
            prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
          )
        }
        onRegenerate={() => setSeed((s) => s + 1)}
        showRegenerate={showRegenerate}
        onConfirm={() => undefined}
        onBack={() => undefined}
        isGenerating={isGenerating}
        seed={seed}
      />
    </div>
  )
}

export const Default: Story = {
  name: 'Default — 3컷 콘티 (rule-only, 재생성 숨김)',
  render: () => <InteractiveTemplate />,
}

export const WithRegenerate: Story = {
  name: 'Regenerate — LLM 분석 모드 (재생성 노출)',
  render: () => <InteractiveTemplate showRegenerate />,
}

export const WithExcluded: Story = {
  name: 'Excluded — 컷 일부 제외',
  render: () => {
    const Wrapper = () => {
      const [excluded, setExcluded] = React.useState<number[]>([1])
      return (
        <div className="mx-auto max-w-2xl rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <ContiBoard
            conti={SAMPLE_CONTI}
            excludedSceneIndices={excluded}
            onToggleExclude={(idx) =>
              setExcluded((prev) =>
                prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
              )
            }
            onRegenerate={() => undefined}
            showRegenerate={false}
            onConfirm={() => undefined}
            onBack={() => undefined}
            isGenerating={false}
            seed={3}
          />
        </div>
      )
    }
    return <Wrapper />
  },
}

export const Generating: Story = {
  name: 'Generating — 페이지 생성 중',
  render: () => <InteractiveTemplate isGenerating />,
}
