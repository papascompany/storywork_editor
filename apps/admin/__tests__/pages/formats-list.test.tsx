/**
 * formats-list.test.tsx
 *
 * FormatListClient 컴포넌트 — DataTable 렌더링 + 라우팅 테스트.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

const mockRouterPush = vi.fn()
const mockRouterRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    refresh: mockRouterRefresh,
  }),
}))

global.fetch = vi.fn()

import { FormatListClient } from '../../app/(dashboard)/formats/FormatListClient'

const MOCK_FORMATS = [
  {
    id: 'fmt-1',
    name: 'B5 단행본',
    widthMm: 130,
    heightMm: 200,
    dpi: 300,
    bleedMm: 3,
    safeMm: 5,
    templateCount: 2,
    createdAt: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'fmt-2',
    name: 'A5 작품집',
    widthMm: 148,
    heightMm: 210,
    dpi: 300,
    bleedMm: 3,
    safeMm: 5,
    templateCount: 0,
    createdAt: new Date('2026-01-02').toISOString(),
  },
]

describe('FormatListClient', () => {
  it('목록이 렌더링된다', () => {
    render(<FormatListClient initialData={MOCK_FORMATS} userRole="superadmin" />)
    // DataTable 이 데스크탑+모바일 두 뷰를 모두 렌더링하므로 getAllByText 사용
    expect(screen.getAllByText('B5 단행본').length).toBeGreaterThan(0)
    expect(screen.getAllByText('A5 작품집').length).toBeGreaterThan(0)
  })

  it('크기 컬럼이 widthMm × heightMm mm 형식으로 표시된다', () => {
    render(<FormatListClient initialData={MOCK_FORMATS} userRole="curator" />)
    expect(screen.getAllByText('130 × 200 mm').length).toBeGreaterThan(0)
  })

  it('새 판형 버튼이 있다', () => {
    render(<FormatListClient initialData={MOCK_FORMATS} userRole="superadmin" />)
    expect(screen.getByText('새 판형')).toBeDefined()
  })

  it('superadmin 은 체크박스(선택)가 노출된다', () => {
    render(<FormatListClient initialData={MOCK_FORMATS} userRole="superadmin" />)
    // selectable 모드에서 전체 선택 체크박스가 생성됨
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(0)
  })

  it('curator 는 체크박스가 없다', () => {
    render(<FormatListClient initialData={MOCK_FORMATS} userRole="curator" />)
    const checkboxes = screen.queryAllByRole('checkbox')
    expect(checkboxes).toHaveLength(0)
  })

  it('행 클릭 시 /formats/[id] 로 라우팅된다', () => {
    render(<FormatListClient initialData={MOCK_FORMATS} userRole="superadmin" />)
    // 데스크탑 테이블의 첫번째 B5 단행본 td 를 찾아 tr 클릭
    const cells = screen.getAllByText('B5 단행본')
    const tableCell = cells.find((el) => el.closest('tr'))
    const row = tableCell?.closest('tr')
    if (row) fireEvent.click(row)
    expect(mockRouterPush).toHaveBeenCalledWith('/formats/fmt-1')
  })

  it('빈 데이터일 때 빈 상태 메시지가 표시된다', () => {
    render(<FormatListClient initialData={[]} userRole="superadmin" />)
    expect(screen.getByText('등록된 판형이 없습니다')).toBeDefined()
  })
})
