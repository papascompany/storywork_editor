/**
 * KeypointEditor 컴포넌트 테스트
 *
 * 렌더링 / 추가 모달 / 삭제 / readonly
 */
import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { KeypointEditor } from '../../src/components/keypoint-editor/KeypointEditor'
import type { Keypoint } from '../../src/lib/schemas/resource'

const KEYPOINTS: Keypoint[] = [
  { name: 'head', x: 0.5, y: 0.1 },
  { name: 'mouth', x: 0.5, y: 0.18, inferred: true },
  { name: 'center', x: 0.5, y: 0.5 },
]

describe('KeypointEditor', () => {
  it('키포인트 범례 렌더링', () => {
    const onChange = vi.fn()
    render(
      <KeypointEditor
        imageUrl="https://placehold.co/750x750"
        width={750}
        height={750}
        keypoints={KEYPOINTS}
        onChange={onChange}
      />,
    )
    // 범례에 키포인트 이름 표시 (SVG 텍스트 + 범례 span 두 곳에 출력되므로 getAllByText 사용)
    expect(screen.getAllByText(/머리/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/입/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/중심/).length).toBeGreaterThan(0)
  })

  it('inferred 키포인트에 (추정) 표시', () => {
    render(
      <KeypointEditor
        imageUrl="https://placehold.co/750x750"
        width={750}
        height={750}
        keypoints={KEYPOINTS}
        onChange={vi.fn()}
      />,
    )
    // mouth 는 inferred=true → (추정) 표시
    const inferred = screen.getAllByText('(추정)')
    expect(inferred.length).toBeGreaterThan(0)
  })

  it('readonly 모드에서 편집 힌트 없음', () => {
    render(
      <KeypointEditor
        imageUrl="https://placehold.co/750x750"
        width={750}
        height={750}
        keypoints={KEYPOINTS}
        onChange={vi.fn()}
        readonly
      />,
    )
    expect(screen.queryByText(/드래그로 이동/)).toBeNull()
  })

  it('편집 모드에서 키보드 힌트 표시', () => {
    render(
      <KeypointEditor
        imageUrl="https://placehold.co/750x750"
        width={750}
        height={750}
        keypoints={KEYPOINTS}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByText(/드래그로 이동/)).toBeDefined()
  })

  it('키포인트 좌표 정보 표시', () => {
    render(
      <KeypointEditor
        imageUrl="https://placehold.co/750x750"
        width={750}
        height={750}
        keypoints={[{ name: 'head', x: 0.5, y: 0.1 }]}
        onChange={vi.fn()}
      />,
    )
    // x=0.5 → "50.0%", y=0.1 → "10.0%"
    expect(screen.getByText(/50\.0%/)).toBeDefined()
    expect(screen.getByText(/10\.0%/)).toBeDefined()
  })

  it('빈 키포인트 목록에서 정보 테이블 없음', () => {
    render(
      <KeypointEditor
        imageUrl="https://placehold.co/750x750"
        width={750}
        height={750}
        keypoints={[]}
        onChange={vi.fn()}
      />,
    )
    expect(screen.queryByText(/머리/)).toBeNull()
  })
})
