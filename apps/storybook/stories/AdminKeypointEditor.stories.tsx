/**
 * Admin / Resources / KeypointEditor 스토리
 *
 * M3-04 키포인트 보정 편집기 — SVG 드래그 데모
 */

import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'

import { KeypointEditor } from '../../admin/src/components/keypoint-editor/KeypointEditor'
import type { Keypoint } from '../../admin/src/lib/schemas/resource'

// ─── 픽스처 ──────────────────────────────────────────────────────────────────

const INITIAL_KEYPOINTS: Keypoint[] = [
  { name: 'head', x: 0.5, y: 0.08, inferred: false },
  { name: 'mouth', x: 0.5, y: 0.14, inferred: true },
  { name: 'center', x: 0.5, y: 0.5, inferred: true },
]

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Admin/Resources/KeypointEditor',
  component: KeypointEditor,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '키포인트 SVG 오버레이 편집기. 드래그로 이동, 방향키로 미세 조정, 더블클릭으로 추가, 우클릭으로 삭제. inferred=true 인 키포인트는 점선 원으로 표시.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof KeypointEditor>

export default meta
type Story = StoryObj<typeof meta>

// ─── 스토리 1: 기본 (편집 가능) ──────────────────────────────────────────────

export const Editable: Story = {
  name: 'Editable — head/mouth/center 드래그 가능',
  render: () => {
    const [keypoints, setKeypoints] = React.useState<Keypoint[]>(INITIAL_KEYPOINTS)
    const [log, setLog] = React.useState<string[]>([])

    return (
      <div className="p-4 max-w-lg flex flex-col gap-6">
        <div>
          <h3 className="text-base font-semibold text-[var(--color-text)] mb-2">키포인트 편집기</h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            점선 원 = 자동 추정값 · 실선 원 = 사람이 보정한 값
          </p>
          <KeypointEditor
            imageUrl="https://placehold.co/750x1000/f0f0ff/6366f1?text=포즈+이미지"
            width={750}
            height={1000}
            keypoints={keypoints}
            onChange={(next) => {
              setKeypoints(next)
              setLog((prev) =>
                [`키포인트 업데이트: ${next.map((k) => k.name).join(', ')}`, ...prev].slice(0, 5),
              )
            }}
          />
        </div>

        {log.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">변경 로그</p>
            <ul className="space-y-1">
              {log.map((entry, i) => (
                <li key={i} className="text-xs text-[var(--color-text-muted)]">
                  {entry}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  },
}

// ─── 스토리 2: readonly ────────────────────────────────────────────────────────

export const Readonly: Story = {
  name: 'Readonly — 편집 불가',
  render: () => (
    <div className="p-4 max-w-lg">
      <h3 className="text-base font-semibold text-[var(--color-text)] mb-2">
        키포인트 (읽기 전용)
      </h3>
      <KeypointEditor
        imageUrl="https://placehold.co/750x1000/f0f0ff/6366f1?text=포즈+이미지"
        width={750}
        height={1000}
        keypoints={INITIAL_KEYPOINTS}
        onChange={() => {}}
        readonly
      />
    </div>
  ),
}

// ─── 스토리 3: 모든 키포인트 ──────────────────────────────────────────────────

export const AllKeypoints: Story = {
  name: 'All Keypoints — 10종 표시',
  render: () => {
    const fullKeypoints: Keypoint[] = [
      { name: 'head', x: 0.5, y: 0.08 },
      { name: 'mouth', x: 0.5, y: 0.13 },
      { name: 'left-shoulder', x: 0.35, y: 0.28 },
      { name: 'right-shoulder', x: 0.65, y: 0.28 },
      { name: 'center', x: 0.5, y: 0.45 },
      { name: 'waist', x: 0.5, y: 0.55 },
      { name: 'left-hand', x: 0.2, y: 0.65 },
      { name: 'right-hand', x: 0.8, y: 0.65 },
      { name: 'left-foot', x: 0.38, y: 0.95 },
      { name: 'right-foot', x: 0.62, y: 0.95 },
    ]
    const [kps, setKps] = React.useState<Keypoint[]>(fullKeypoints)
    return (
      <div className="p-4 max-w-lg">
        <h3 className="text-base font-semibold text-[var(--color-text)] mb-2">
          모든 키포인트 (10종)
        </h3>
        <KeypointEditor
          imageUrl="https://placehold.co/750x1000/f0f0ff/6366f1?text=포즈+이미지"
          width={750}
          height={1000}
          keypoints={kps}
          onChange={setKps}
        />
      </div>
    )
  },
}

// ─── 스토리 4: 빈 키포인트 ────────────────────────────────────────────────────

export const EmptyKeypoints: Story = {
  name: 'Empty — 키포인트 없음 (더블클릭으로 추가)',
  render: () => {
    const [kps, setKps] = React.useState<Keypoint[]>([])
    return (
      <div className="p-4 max-w-lg">
        <h3 className="text-base font-semibold text-[var(--color-text)] mb-2">
          빈 키포인트 — 더블클릭으로 추가
        </h3>
        <KeypointEditor
          imageUrl="https://placehold.co/750x1000/f0f0ff/6366f1?text=포즈+이미지"
          width={750}
          height={1000}
          keypoints={kps}
          onChange={setKps}
        />
      </div>
    )
  },
}
