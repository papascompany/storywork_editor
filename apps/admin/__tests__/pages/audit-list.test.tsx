/**
 * audit-list.test.tsx
 *
 * AuditListClient + AuditDiffViewer 컴포넌트 테스트.
 * DataTable 렌더링 + 필터 + 펼침 diff 뷰어.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

// fetch mock — 필터 변경 시 빈 응답 반환 (상태 업데이트 방지)
const mockFetch = vi.fn().mockResolvedValue({
  ok: false,
  json: vi.fn().mockResolvedValue({ data: [], totalCount: 0, facets: {} }),
})
global.fetch = mockFetch

import { AuditListClient } from '../../app/(dashboard)/audit/AuditListClient'
import type { AuditLogRow } from '../../app/api/audit/route'
import { AuditDiffViewer } from '../../src/components/audit-diff-viewer/AuditDiffViewer'

// ─── 픽스처 ──────────────────────────────────────────────────────────────────

function makeLog(overrides?: Partial<AuditLogRow>): AuditLogRow {
  return {
    id: 'audit-1',
    actorId: 'user-1',
    actorEmail: 'admin@test.com',
    action: 'create',
    entityType: 'format',
    entityId: 'fmt-1',
    target: 'format:fmt-1',
    payload: { meta: { name: 'B5 단행본' } },
    createdAt: new Date('2026-01-01T10:00:00Z').toISOString(),
    ...overrides,
  }
}

function makeLogs(n: number): AuditLogRow[] {
  const actions = ['create', 'update', 'delete', 'publish', 'reject']
  const entityTypes = ['format', 'resource', 'template']
  return Array.from({ length: n }, (_, i) => ({
    id: `audit-${i}`,
    actorId: `user-${i % 3}`,
    actorEmail: `user${i % 3}@test.com`,
    action: actions[i % actions.length] ?? 'create',
    entityType: entityTypes[i % entityTypes.length] ?? 'format',
    entityId: `entity-${i}`,
    target: `${entityTypes[i % entityTypes.length] ?? 'format'}:entity-${i}`,
    payload: { meta: { name: `항목 ${i}` } },
    createdAt: new Date(Date.now() - i * 60000).toISOString(),
  }))
}

// ─── AuditDiffViewer 테스트 ───────────────────────────────────────────────────

describe('AuditDiffViewer', () => {
  it('diff 필드가 렌더링된다', () => {
    render(
      <AuditDiffViewer
        diff={{
          name: { before: '구 이름', after: '새 이름' },
        }}
      />,
    )
    expect(screen.getByText('name')).toBeDefined()
    expect(screen.getByText('구 이름')).toBeDefined()
    expect(screen.getByText('새 이름')).toBeDefined()
  })

  it('diff 없으면 meta 를 JSON 으로 표시한다', () => {
    render(<AuditDiffViewer meta={{ key: 'value' }} />)
    expect(screen.getByText('메타')).toBeDefined()
    // JSON stringify 된 내용이 pre 에 표시됨
    expect(screen.getByText(/value/)).toBeDefined()
  })

  it('diff 도 meta 도 없으면 "변경 내역이 없습니다" 표시', () => {
    render(<AuditDiffViewer />)
    expect(screen.getByText('변경 내역이 없습니다.')).toBeDefined()
  })

  it('create 액션은 before 없이 after(녹색)만 표시한다', () => {
    render(
      <AuditDiffViewer
        diff={{
          status: { before: undefined, after: 'published' },
        }}
      />,
    )
    // after 값이 렌더링됨
    expect(screen.getByText('published')).toBeDefined()
    // before 가 undefined 이면 before pre 가 없어야 함
    const beforeEl = screen.queryByLabelText('status 이전 값')
    expect(beforeEl).toBeNull()
  })

  it('delete 액션은 after 없이 before(빨강)만 표시한다', () => {
    render(
      <AuditDiffViewer
        diff={{
          slug: { before: 'old-slug', after: null },
        }}
      />,
    )
    expect(screen.getByText('old-slug')).toBeDefined()
    const afterEl = screen.queryByLabelText('slug 이후 값')
    expect(afterEl).toBeNull()
  })

  it('여러 필드가 모두 렌더링된다', () => {
    render(
      <AuditDiffViewer
        diff={{
          name: { before: 'A', after: 'B' },
          status: { before: 'draft', after: 'published' },
        }}
      />,
    )
    expect(screen.getByText('name')).toBeDefined()
    expect(screen.getByText('status')).toBeDefined()
  })
})

// ─── AuditListClient 테스트 ───────────────────────────────────────────────────

describe('AuditListClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('30건 목록이 렌더링된다', () => {
    const logs = makeLogs(30)
    render(<AuditListClient initialData={logs} initialTotalCount={30} />)
    // 헤더가 렌더링됨
    expect(screen.getByText('감사 로그')).toBeDefined()
    expect(screen.getByText(/총/)).toBeDefined()
  })

  it('액션 배지가 표시된다', () => {
    const logs = [
      makeLog({ action: 'create' }),
      makeLog({ id: 'audit-2', action: 'delete', entityId: 'fmt-2', target: 'format:fmt-2' }),
    ]
    render(<AuditListClient initialData={logs} initialTotalCount={2} />)
    // DataTable 이 데스크탑+모바일 두 뷰를 렌더링하므로 getAllBy 사용
    expect(screen.getAllByText('생성').length).toBeGreaterThan(0)
    expect(screen.getAllByText('삭제').length).toBeGreaterThan(0)
  })

  it('빈 데이터일 때 빈 상태 메시지가 표시된다', () => {
    render(<AuditListClient initialData={[]} initialTotalCount={0} />)
    // DataTable 이 데스크탑+모바일 두 뷰를 렌더링하므로 getAllBy 사용
    expect(screen.getAllByText('감사 로그가 없습니다').length).toBeGreaterThan(0)
  })

  it('펼침 버튼 클릭 시 diff viewer 가 노출된다', () => {
    const log = makeLog({
      payload: {
        diff: { name: { before: '구 이름', after: '새 이름' } },
      },
    })
    render(<AuditListClient initialData={[log]} initialTotalCount={1} />)

    // 펼침 버튼 클릭 (data table 의 expand 컬럼)
    const expandBtn = screen.getAllByLabelText('펼치기')[0]
    if (expandBtn) fireEvent.click(expandBtn)

    // diff viewer 가 나타남
    expect(screen.getByText('변경 상세 —')).toBeDefined()
    // diff 필드명 'name' 이 여러 곳에 있을 수 있으므로 getAllBy 사용
    expect(screen.getAllByText(/name/).length).toBeGreaterThan(0)
  })

  it('펼침 버튼 재클릭 시 diff viewer 가 숨겨진다', () => {
    const log = makeLog()
    render(<AuditListClient initialData={[log]} initialTotalCount={1} />)

    const expandBtn = screen.getAllByLabelText('펼치기')[0]
    if (expandBtn) {
      fireEvent.click(expandBtn)
      // 이제 접기 버튼으로 바뀜
      const collapseBtn = screen.getAllByLabelText('접기')[0]
      if (collapseBtn) fireEvent.click(collapseBtn)
    }
    expect(screen.queryByText('변경 상세 —')).toBeNull()
  })

  it('필터 초기화 버튼이 활성 필터 있을 때만 노출된다', () => {
    render(<AuditListClient initialData={[makeLog()]} initialTotalCount={1} />)
    // 초기에는 초기화 버튼 없음
    expect(screen.queryByText(/필터 초기화/)).toBeNull()

    // 액션 필터 클릭
    const createBtn = screen.getByRole('button', { name: '생성' })
    fireEvent.click(createBtn)

    // 이제 초기화 버튼 나타남
    expect(screen.getByText(/필터 초기화/)).toBeDefined()
  })

  it('날짜 프리셋 버튼이 4개 렌더링된다', () => {
    render(<AuditListClient initialData={[]} initialTotalCount={0} />)
    expect(screen.getByRole('button', { name: '전체' })).toBeDefined()
    expect(screen.getByRole('button', { name: '최근 24시간' })).toBeDefined()
    expect(screen.getByRole('button', { name: '최근 7일' })).toBeDefined()
    expect(screen.getByRole('button', { name: '최근 30일' })).toBeDefined()
  })

  it('entityType 필터 버튼이 5개 렌더링된다', () => {
    render(<AuditListClient initialData={[]} initialTotalCount={0} />)
    expect(screen.getByRole('button', { name: 'Format' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Resource' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Template' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'TemplateSet' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'User' })).toBeDefined()
  })

  it('actorEmail 이 테이블에 표시된다', () => {
    const log = makeLog({ actorEmail: 'curator@test.com', actorId: 'user-curator' })
    render(<AuditListClient initialData={[log]} initialTotalCount={1} />)
    // 데스크탑+모바일 두 뷰에 모두 표시되므로 getAllBy 사용
    expect(screen.getAllByText('curator@test.com').length).toBeGreaterThan(0)
  })

  it('총 건수가 표시된다', () => {
    render(<AuditListClient initialData={makeLogs(5)} initialTotalCount={120} />)
    // 여러 곳에 120 이 나올 수 있으므로 getAllBy 사용
    expect(screen.getAllByText(/120/).length).toBeGreaterThan(0)
  })
})
