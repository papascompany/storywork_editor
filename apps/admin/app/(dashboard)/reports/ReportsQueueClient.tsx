'use client'

/**
 * ReportsQueueClient — 신고 큐 테이블 + 처리 (BOARD-07)
 */
import { REPORT_REASON_LABELS, type ReportReason } from '@storywork/schema'
import * as React from 'react'

interface ReportRow {
  id: string
  targetType: 'showcase' | 'comment'
  targetId: string
  preview: string
  targetHidden: boolean
  reason: ReportReason
  detail: string | null
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
  resolution: string | null
  reporterName: string
  reportCount: number
  createdAt: string
  reviewedAt: string | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  reviewing: '검토 중',
  resolved: '처리됨',
  dismissed: '기각',
}
const STATUS_STYLE: Record<string, React.CSSProperties> = {
  pending: { color: '#e8a000', backgroundColor: '#fff8e8' },
  reviewing: { color: '#1151ff', backgroundColor: '#eef2ff' },
  resolved: { color: '#1a7a3b', backgroundColor: '#e8fff2' },
  dismissed: { color: 'var(--nike-stone)', backgroundColor: 'var(--nike-soft-cloud)' },
}
const TABS = [
  { key: 'pending', label: '대기' },
  { key: 'reviewing', label: '검토 중' },
  { key: 'resolved', label: '처리됨' },
  { key: 'dismissed', label: '기각' },
  { key: 'all', label: '전체' },
] as const

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export function ReportsQueueClient() {
  const [tab, setTab] = React.useState<(typeof TABS)[number]['key']>('pending')
  const [rows, setRows] = React.useState<ReportRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reports?status=${tab}`)
      if (res.ok) {
        const data = (await res.json()) as { data: ReportRow[] }
        setRows(data.data)
      }
    } finally {
      setLoading(false)
    }
  }, [tab])

  React.useEffect(() => {
    void load()
  }, [load])

  async function act(id: string, action: 'hide' | 'dismiss' | 'reviewing') {
    if (
      action === 'hide' &&
      !window.confirm('대상을 숨김 처리하시겠습니까? 공개 갤러리에서 제외됩니다.')
    ) {
      return
    }
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        await load()
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string }
        alert(d.error ?? '처리 실패')
      }
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      {/* 탭 */}
      <div className="flex gap-2 mb-4 flex-wrap" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={tab === t.key ? 'nike-btn-primary' : 'nike-btn-soft'}
            style={{ height: '34px', fontSize: '13px', padding: '0 16px' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="nike-caption-md">불러오는 중...</p>
      ) : rows.length === 0 ? (
        <div
          className="py-16 text-center nike-card"
          style={{ color: 'var(--nike-mute)', fontSize: '14px' }}
        >
          해당 상태의 신고가 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => {
            const isOpen = r.status === 'pending' || r.status === 'reviewing'
            return (
              <div key={r.id} className="nike-card" style={{ padding: '16px 18px' }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      className="flex items-center gap-2 flex-wrap"
                      style={{ marginBottom: '4px' }}
                    >
                      <span
                        className="nike-eyebrow"
                        style={{ color: 'var(--nike-ink)', opacity: 0.55 }}
                      >
                        {r.targetType === 'showcase' ? '작품' : '댓글'}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          ...STATUS_STYLE[r.status],
                        }}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          color: 'var(--nike-sale)',
                        }}
                      >
                        신고 {r.reportCount}건
                      </span>
                      {r.targetHidden && (
                        <span style={{ fontSize: '11px', color: 'var(--nike-mute)' }}>
                          · 숨김됨
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        fontFamily: 'var(--nike-font-text)',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--nike-ink)',
                        margin: '0 0 4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {r.preview}
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--nike-ash)', margin: 0 }}>
                      사유: <strong>{REPORT_REASON_LABELS[r.reason]}</strong>
                      {r.detail ? ` — ${r.detail}` : ''}
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--nike-font-mono)',
                        fontSize: '11px',
                        color: 'var(--nike-stone)',
                        margin: '4px 0 0',
                      }}
                    >
                      {r.reporterName} · {formatDate(r.createdAt)}
                    </p>
                  </div>

                  {isOpen && (
                    <div className="flex gap-2 shrink-0">
                      {r.status === 'pending' && (
                        <button
                          type="button"
                          className="nike-btn-soft"
                          style={{ height: '34px', fontSize: '13px', padding: '0 12px' }}
                          disabled={busyId === r.id}
                          onClick={() => void act(r.id, 'reviewing')}
                        >
                          검토 중
                        </button>
                      )}
                      <button
                        type="button"
                        className="nike-btn-secondary"
                        style={{ height: '34px', fontSize: '13px', padding: '0 12px' }}
                        disabled={busyId === r.id}
                        onClick={() => void act(r.id, 'dismiss')}
                      >
                        기각
                      </button>
                      <button
                        type="button"
                        className="nike-btn-primary"
                        style={{
                          height: '34px',
                          fontSize: '13px',
                          padding: '0 12px',
                          backgroundColor: 'var(--nike-sale)',
                        }}
                        disabled={busyId === r.id}
                        onClick={() => void act(r.id, 'hide')}
                      >
                        {busyId === r.id ? '처리 중...' : '숨김 처리'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
