'use client'

/**
 * AuditDiffViewer — JSON before/after diff 뷰어
 *
 * payload.diff = { [field]: { before, after } } 형태를 렌더링.
 * 추가(녹색) / 삭제(빨강) / 변경(파랑) 색상 강조.
 * 외부 라이브러리 없이 자체 구현 (가벼운 <pre> + 색상).
 */

import { cn } from '@storywork/ui'
import * as React from 'react'

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface DiffField {
  before: unknown
  after: unknown
}

export interface AuditDiffViewerProps {
  /** payload.diff 객체 */
  diff?: Record<string, DiffField>
  /** payload.meta 객체 (diff 없을 때 폴백 표시) */
  meta?: Record<string, unknown>
  className?: string
}

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function serialize(v: unknown): string {
  if (v === undefined) return '(없음)'
  if (v === null) return 'null'
  if (typeof v === 'string') return v
  return JSON.stringify(v, null, 2)
}

function DiffRow({ field, before, after }: { field: string; before: unknown; after: unknown }) {
  const beforeStr = serialize(before)
  const afterStr = serialize(after)
  const isCreate = before === undefined || before === null
  const isDelete = after === undefined || after === null

  return (
    <div
      className="last:border-b-0 py-2"
      style={{ borderBottom: '1px solid var(--nike-hairline)' }}
    >
      <div
        style={{
          fontFamily: 'var(--nike-font-mono)',
          fontSize: '10px',
          fontWeight: 400,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          color: 'var(--nike-ink)',
          opacity: 0.4,
          marginBottom: '4px',
        }}
      >
        {field}
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
        {/* before */}
        {!isCreate && (
          <pre
            className={cn(
              'flex-1 px-3 py-1.5 text-xs font-mono whitespace-pre-wrap break-all',
              isDelete ? 'bg-red-50 text-red-700 line-through' : 'bg-red-50 text-red-700',
            )}
            style={{ borderRadius: 'var(--nike-admin-rounded-sm)' }}
            aria-label={`${field} 이전 값`}
          >
            {beforeStr}
          </pre>
        )}
        {/* after */}
        {!isDelete && (
          <pre
            className={cn(
              'flex-1 px-3 py-1.5 text-xs font-mono whitespace-pre-wrap break-all',
              isCreate ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700',
            )}
            style={{ borderRadius: 'var(--nike-admin-rounded-sm)' }}
            aria-label={`${field} 이후 값`}
          >
            {afterStr}
          </pre>
        )}
      </div>
    </div>
  )
}

// ─── 본체 ────────────────────────────────────────────────────────────────────

export function AuditDiffViewer({ diff, meta, className }: AuditDiffViewerProps) {
  const hasDiff = diff && Object.keys(diff).length > 0
  const hasMeta = meta && Object.keys(meta).length > 0

  if (!hasDiff && !hasMeta) {
    return (
      <div
        className={cn('px-4 py-3', className)}
        style={{
          borderRadius: 'var(--nike-admin-rounded-md)',
          border: '1px solid var(--nike-hairline)',
          fontFamily: 'var(--nike-font-text)',
          fontSize: '13px',
          color: 'var(--nike-ink)',
          opacity: 0.55,
        }}
      >
        변경 내역이 없습니다.
      </div>
    )
  }

  return (
    <div
      className={cn('px-4 py-3', className)}
      style={{
        borderRadius: 'var(--nike-admin-rounded-md)',
        border: '1px solid var(--nike-hairline)',
      }}
    >
      {hasDiff && (
        <div>
          <div
            className="flex items-center gap-2 mb-2"
            style={{
              fontFamily: 'var(--nike-font-mono)',
              fontSize: '10px',
              fontWeight: 400,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              color: 'var(--nike-ink)',
              opacity: 0.4,
            }}
          >
            <span>변경 필드</span>
            <span className="text-green-600">추가</span>
            <span className="text-red-600">삭제</span>
            <span className="text-blue-600">수정</span>
          </div>
          <div className="flex flex-col">
            {Object.entries(diff).map(([field, { before, after }]) => (
              <DiffRow key={field} field={field} before={before} after={after} />
            ))}
          </div>
        </div>
      )}

      {!hasDiff && hasMeta && (
        <div>
          <div
            style={{
              fontFamily: 'var(--nike-font-mono)',
              fontSize: '10px',
              fontWeight: 400,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              color: 'var(--nike-ink)',
              opacity: 0.4,
              marginBottom: '8px',
            }}
          >
            메타
          </div>
          <pre
            className="text-xs font-mono whitespace-pre-wrap break-all"
            style={{ color: 'var(--nike-ink)' }}
          >
            {JSON.stringify(meta, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

AuditDiffViewer.displayName = 'AuditDiffViewer'
