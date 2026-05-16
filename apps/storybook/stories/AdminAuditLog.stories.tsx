/**
 * Admin / Audit Log 스토리
 *
 * M3-06 AuditListClient + AuditDiffViewer 컴포넌트 데모.
 */

import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'

import { AuditListClient } from '../../admin/app/(dashboard)/audit/AuditListClient'
import type { AuditLogRow } from '../../admin/app/api/audit/route'
import { AuditDiffViewer } from '../../admin/src/components/audit-diff-viewer/AuditDiffViewer'

// ─── 픽스처 ──────────────────────────────────────────────────────────────────

function makeLog(overrides?: Partial<AuditLogRow>): AuditLogRow {
  return {
    id: 'audit-default',
    actorId: 'user-1',
    actorEmail: 'superadmin@storywork.io',
    action: 'create',
    entityType: 'format',
    entityId: 'fmt-b5',
    target: 'format:fmt-b5',
    payload: { meta: { name: 'B5 단행본', widthMm: 130, heightMm: 200 } },
    createdAt: new Date(Date.now() - 300000).toISOString(), // 5분 전
    ...overrides,
  }
}

function makeLogs(n: number): AuditLogRow[] {
  const actions = ['create', 'update', 'delete', 'publish', 'reject'] as const
  const entityTypes = ['format', 'resource', 'template', 'templateset', 'user']
  const actors = [
    { id: 'u1', email: 'superadmin@storywork.io' },
    { id: 'u2', email: 'curator@storywork.io' },
    { id: 'u3', email: 'support@storywork.io' },
  ]

  const diffs = [
    { diff: { name: { before: '구 이름', after: '새 이름' } } },
    { diff: { status: { before: 'draft', after: 'published' } } },
    { diff: { widthMm: { before: 130, after: 148 }, heightMm: { before: 200, after: 210 } } },
    { meta: { name: '01-seogi-01', kind: 'pose' } },
    {},
  ]

  return Array.from({ length: n }, (_, i) => {
    const action = actions[i % actions.length] ?? 'create'
    const entityType = entityTypes[i % entityTypes.length] ?? 'format'
    const actor = actors[i % actors.length] ?? { id: 'u1', email: 'superadmin@storywork.io' }
    const payloadBase = diffs[i % diffs.length] ?? {}
    return {
      id: `audit-${i}`,
      actorId: actor.id,
      actorEmail: actor.email,
      action,
      entityType,
      entityId: `${entityType}-${i}`,
      target: `${entityType}:${entityType}-${i}`,
      payload: payloadBase,
      createdAt: new Date(Date.now() - i * 180000).toISOString(),
    }
  })
}

// ─── Audit / List ─────────────────────────────────────────────────────────────

const listMeta = {
  title: 'Admin/Audit/List',
  component: AuditListClient,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '감사 로그 목록. 서버 페이지네이션 + 필터 사이드바 + JSON diff 펼침 뷰어. read-only.',
      },
    },
  },
  tags: ['autodocs'],
  // render() 전용 스토리 — args 는 story 레벨에서 직접 제공하므로 기본값은 빈 객체
  args: {} as { initialData: AuditLogRow[]; initialTotalCount: number },
} satisfies Meta<typeof AuditListClient>

export default listMeta
type ListStory = StoryObj<typeof listMeta>

export const WithData: ListStory = {
  name: 'List — 30건 mock',
  render: () => {
    // fetch mock — 필터/페이지 변경 시 같은 데이터 반환
    const logs = makeLogs(30)
    const mockResponse = {
      data: logs,
      totalCount: 87,
      facets: { byActor: {}, byEntityType: {}, byAction: {} },
    }
    global.fetch = () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      }) as unknown as Promise<Response>

    return (
      <div style={{ minHeight: '100vh' }}>
        <AuditListClient initialData={logs} initialTotalCount={87} />
      </div>
    )
  },
}

export const EmptyState: ListStory = {
  name: 'List — 빈 상태',
  render: () => (
    <div style={{ minHeight: '100vh' }}>
      <AuditListClient initialData={[]} initialTotalCount={0} />
    </div>
  ),
}

export const SingleLogWithDiff: ListStory = {
  name: 'List — diff 펼침 미리보기',
  render: () => {
    const log = makeLog({
      action: 'update',
      payload: {
        diff: {
          name: { before: 'B5 단행본', after: 'B5 소설집' },
          widthMm: { before: 128, after: 130 },
          dpi: { before: 150, after: 300 },
        },
      },
    })
    return (
      <div style={{ minHeight: '100vh' }}>
        <AuditListClient initialData={[log]} initialTotalCount={1} />
      </div>
    )
  },
}

// ─── Audit / DiffViewer ───────────────────────────────────────────────────────

export const DiffViewerCreate: ListStory = {
  name: 'DiffViewer — create (필드 추가)',
  render: () => (
    <div className="p-8 max-w-2xl">
      <h2 className="text-lg font-semibold mb-4 text-[var(--color-text)]">생성 액션 diff</h2>
      <AuditDiffViewer
        diff={{
          name: { before: undefined, after: 'B5 단행본' },
          widthMm: { before: undefined, after: 130 },
          heightMm: { before: undefined, after: 200 },
          dpi: { before: undefined, after: 300 },
        }}
      />
    </div>
  ),
}

export const DiffViewerUpdate: ListStory = {
  name: 'DiffViewer — update (필드 수정)',
  render: () => (
    <div className="p-8 max-w-2xl">
      <h2 className="text-lg font-semibold mb-4 text-[var(--color-text)]">수정 액션 diff</h2>
      <AuditDiffViewer
        diff={{
          name: { before: 'B5 단행본', after: 'B5 소설집' },
          status: { before: 'draft', after: 'published' },
          tags: { before: ['포즈', '인물'], after: ['포즈', '인물', '측면'] },
        }}
      />
    </div>
  ),
}

export const DiffViewerDelete: ListStory = {
  name: 'DiffViewer — delete (필드 삭제)',
  render: () => (
    <div className="p-8 max-w-2xl">
      <h2 className="text-lg font-semibold mb-4 text-[var(--color-text)]">삭제 액션 diff</h2>
      <AuditDiffViewer
        diff={{
          slug: { before: '01-seogi-01', after: null },
        }}
      />
    </div>
  ),
}

export const DiffViewerMetaOnly: ListStory = {
  name: 'DiffViewer — meta only (diff 없음)',
  render: () => (
    <div className="p-8 max-w-2xl">
      <h2 className="text-lg font-semibold mb-4 text-[var(--color-text)]">메타만 있는 경우</h2>
      <AuditDiffViewer
        meta={{
          name: '01-seogi-01',
          kind: 'pose',
          action: 'bulk-upload',
          count: 42,
        }}
      />
    </div>
  ),
}

export const DiffViewerEmpty: ListStory = {
  name: 'DiffViewer — 빈 payload',
  render: () => (
    <div className="p-8 max-w-2xl">
      <h2 className="text-lg font-semibold mb-4 text-[var(--color-text)]">payload 없음</h2>
      <AuditDiffViewer />
    </div>
  ),
}
