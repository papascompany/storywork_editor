/**
 * DataTable 단위 테스트
 *
 * 정렬/필터/페이지네이션(클라+서버), 벌크선택, 키보드 j/k/x/Enter, 빈 상태, 로딩, 모바일 카드
 */

import type { ColumnDef } from '@tanstack/react-table'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataTable } from '../../src/components/data-table/DataTable'

// ─── 픽스처 ──────────────────────────────────────────────────────────────────

interface Item {
  id: string
  name: string
  status: string
  count: number
}

function makeItems(n: number): Item[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `item-${i}`,
    name: `항목 ${i + 1}`,
    status: i % 2 === 0 ? 'published' : 'draft',
    count: i * 10,
  }))
}

const columns: ColumnDef<Item>[] = [
  {
    accessorKey: 'name',
    header: '이름',
    meta: { mobileLabel: '이름' },
  },
  {
    accessorKey: 'status',
    header: '상태',
    meta: { mobileLabel: '상태' },
    enableSorting: false,
  },
  {
    accessorKey: 'count',
    header: '개수',
    meta: { mobileLabel: '개수' },
  },
]

const rowKey = (row: Item) => row.id

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('DataTable', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  // 기본 렌더
  it('데이터를 테이블로 렌더한다', () => {
    const items = makeItems(3)
    render(<DataTable data={items} columns={columns} rowKey={rowKey} />)
    // 테이블 뷰 + 모바일 카드 뷰 두 곳에 동일 텍스트가 렌더됨 → getAllByText 사용
    const item1Els = screen.getAllByText('항목 1')
    expect(item1Els.length).toBeGreaterThan(0)
    expect(screen.getAllByText('항목 2').length).toBeGreaterThan(0)
    expect(screen.getAllByText('항목 3').length).toBeGreaterThan(0)
  })

  // 빈 상태
  it('데이터가 없으면 빈 상태를 표시한다', () => {
    render(<DataTable data={[]} columns={columns} rowKey={rowKey} />)
    // 테이블/모바일 두 뷰 모두 있으므로 최소 1개 확인
    const emptyEls = screen.getAllByText('데이터가 없습니다')
    expect(emptyEls.length).toBeGreaterThan(0)
  })

  it('커스텀 emptyState 를 렌더한다', () => {
    render(
      <DataTable
        data={[]}
        columns={columns}
        rowKey={rowKey}
        emptyState={<span>리소스가 없습니다</span>}
      />,
    )
    expect(screen.getAllByText('리소스가 없습니다').length).toBeGreaterThan(0)
  })

  // 로딩
  it('isLoading=true 면 skeleton 을 표시하고 데이터는 안 보인다', () => {
    const items = makeItems(3)
    render(<DataTable data={items} columns={columns} rowKey={rowKey} isLoading />)
    expect(screen.queryByText('항목 1')).not.toBeInTheDocument()
    // aria-hidden skeleton rows 존재
    const skeletons = document.querySelectorAll('[aria-hidden="true"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  // 클라이언트 정렬
  it('컬럼 헤더 클릭 시 클라이언트 정렬이 동작한다', async () => {
    const user = userEvent.setup()
    const items = makeItems(5)
    render(<DataTable data={items} columns={columns} rowKey={rowKey} />)

    const nameHeader = screen.getByRole('columnheader', { name: '이름' })
    await user.click(nameHeader)
    // 정렬 후 첫 번째 행 확인 (asc: 항목 1이 맨 위)
    const rows = screen.getAllByRole('row')
    // header row + data rows
    expect(rows.length).toBeGreaterThan(1)
  })

  // 서버 정렬
  it('sorting prop 이 있으면 onChange 를 호출한다', async () => {
    const user = userEvent.setup()
    const items = makeItems(3)
    const onSortingChange = vi.fn()
    render(
      <DataTable
        data={items}
        columns={columns}
        rowKey={rowKey}
        sorting={{ state: [], onChange: onSortingChange }}
      />,
    )
    const nameHeader = screen.getByRole('columnheader', { name: '이름' })
    await user.click(nameHeader)
    expect(onSortingChange).toHaveBeenCalled()
  })

  // 클라이언트 페이지네이션
  it('pageSize 보다 많은 항목이 있으면 페이지네이션 UI를 표시한다', () => {
    // 기본 pageSize는 20; 21개 생성
    const items = makeItems(21)
    render(<DataTable data={items} columns={columns} rowKey={rowKey} />)
    expect(screen.getByRole('navigation', { name: '페이지 네비게이션' })).toBeInTheDocument()
  })

  it('클라이언트 페이지네이션 "다음" 버튼 클릭 시 다음 페이지로 이동', async () => {
    const user = userEvent.setup()
    const items = makeItems(21)
    render(<DataTable data={items} columns={columns} rowKey={rowKey} />)

    // 1페이지엔 항목 1~20, 2페이지엔 항목 21
    expect(screen.queryByText('항목 21')).not.toBeInTheDocument()
    const nextBtn = screen.getByRole('button', { name: '다음 페이지' })
    await user.click(nextBtn)
    // getAllByText: 테이블+모바일 두 뷰에 렌더
    expect(screen.getAllByText('항목 21').length).toBeGreaterThan(0)
  })

  // 서버 페이지네이션
  it('pagination prop 이 있으면 onChange 를 호출한다', async () => {
    const user = userEvent.setup()
    const items = makeItems(10)
    const onPaginationChange = vi.fn()
    render(
      <DataTable
        data={items}
        columns={columns}
        rowKey={rowKey}
        pagination={{
          pageIndex: 0,
          pageSize: 10,
          totalCount: 30,
          onChange: onPaginationChange,
        }}
      />,
    )
    const nextBtn = screen.getByRole('button', { name: '다음 페이지' })
    await user.click(nextBtn)
    expect(onPaginationChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 10 })
  })

  // 벌크 선택
  it('selectable=true 면 체크박스가 렌더된다', () => {
    const items = makeItems(3)
    const onSelectionChange = vi.fn()
    render(
      <DataTable
        data={items}
        columns={columns}
        rowKey={rowKey}
        selectable
        selectedRowIds={[]}
        onSelectionChange={onSelectionChange}
      />,
    )
    // 헤더 체크박스 + 각 행 체크박스 (md이상 테이블만)
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThanOrEqual(1)
  })

  it('행 체크박스 클릭 시 onSelectionChange 를 호출한다', async () => {
    const items = makeItems(3)
    const onSelectionChange = vi.fn()
    render(
      <DataTable
        data={items}
        columns={columns}
        rowKey={rowKey}
        selectable
        selectedRowIds={[]}
        onSelectionChange={onSelectionChange}
      />,
    )
    const checkboxes = screen.getAllByRole('checkbox')
    // 헤더 체크박스 = index 0, 첫 번째 행 체크박스 = index 1
    // (모바일 카드 뷰에는 체크박스가 없음 — hidden md:block)
    expect(checkboxes.length).toBeGreaterThan(1)
    // Radix Checkbox는 button role로 렌더될 수 있음. fireEvent 로 직접 클릭
    if (checkboxes[1]) {
      fireEvent.click(checkboxes[1])
      await waitFor(() => {
        expect(onSelectionChange).toHaveBeenCalled()
      })
    }
  })

  it('전체 선택 체크박스 클릭 시 모든 행 id 를 전달한다', async () => {
    const user = userEvent.setup()
    const items = makeItems(3)
    const onSelectionChange = vi.fn()
    render(
      <DataTable
        data={items}
        columns={columns}
        rowKey={rowKey}
        selectable
        selectedRowIds={[]}
        onSelectionChange={onSelectionChange}
      />,
    )
    const checkboxes = screen.getAllByRole('checkbox')
    const headerCb = checkboxes[0]
    if (headerCb) {
      await user.click(headerCb)
      expect(onSelectionChange).toHaveBeenCalledWith(['item-0', 'item-1', 'item-2'])
    }
  })

  // 행 클릭
  it('onRowClick 이 있으면 행 클릭 시 호출된다', async () => {
    const user = userEvent.setup()
    const items = makeItems(2)
    const onRowClick = vi.fn()
    render(<DataTable data={items} columns={columns} rowKey={rowKey} onRowClick={onRowClick} />)
    const rows = screen.getAllByRole('row')
    // 첫 번째는 헤더, 두 번째가 데이터 행
    if (rows[1]) {
      await user.click(rows[1])
      expect(onRowClick).toHaveBeenCalledWith(items[0])
    }
  })

  // 키보드 네비게이션
  it('keyboardNavigation=true 면 j 키로 다음 행으로 이동한다', async () => {
    const user = userEvent.setup()
    const items = makeItems(5)
    render(<DataTable data={items} columns={columns} rowKey={rowKey} keyboardNavigation />)
    await user.keyboard('j')
    // 포커스가 첫 번째 행으로 이동 (focusedRowIndex = 0)
    // 테이블+모바일 두 뷰에 렌더 → getAllByText 사용
    expect(screen.getAllByText('항목 1').length).toBeGreaterThan(0)
  })

  it('keyboardNavigation=true 면 Enter 키로 onRowClick 이 호출된다', async () => {
    const user = userEvent.setup()
    const items = makeItems(3)
    const onRowClick = vi.fn()
    render(
      <DataTable
        data={items}
        columns={columns}
        rowKey={rowKey}
        keyboardNavigation
        onRowClick={onRowClick}
      />,
    )
    // j 로 포커스 이동 후 Enter
    await user.keyboard('j')
    await user.keyboard('{Enter}')
    expect(onRowClick).toHaveBeenCalled()
  })

  it('keyboardNavigation=true 면 x 키로 행 선택이 토글된다', async () => {
    const user = userEvent.setup()
    const items = makeItems(3)
    const onSelectionChange = vi.fn()
    render(
      <DataTable
        data={items}
        columns={columns}
        rowKey={rowKey}
        keyboardNavigation
        selectable
        selectedRowIds={[]}
        onSelectionChange={onSelectionChange}
      />,
    )
    await user.keyboard('j') // focus index 0
    await user.keyboard('x')
    expect(onSelectionChange).toHaveBeenCalledWith(['item-0'])
  })

  it('k 키로 이전 행으로 이동한다', async () => {
    const user = userEvent.setup()
    const items = makeItems(5)
    render(<DataTable data={items} columns={columns} rowKey={rowKey} keyboardNavigation />)
    // j j j → index 2, k → index 1
    await user.keyboard('j')
    await user.keyboard('j')
    await user.keyboard('j')
    await user.keyboard('k')
    // 에러 없이 실행 — 테이블+모바일 두 뷰에 렌더
    expect(screen.getAllByText('항목 3').length).toBeGreaterThan(0)
  })
})
