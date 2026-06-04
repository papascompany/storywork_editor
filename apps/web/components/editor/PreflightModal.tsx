'use client'

/**
 * PreflightModal — 프리플라이트 검증 결과 모달
 *
 * DownloadMenu 에서 "프리플라이트 검사" 클릭 시 표시.
 * preflight() 결과를 프로필별 탭으로 나누어 표시.
 * error/warning/info 색상 구분 + 페이지/레이어 위치 표시.
 */

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  cn,
  showToast,
} from '@storywork/ui'
import { AlertCircle, AlertTriangle, CheckCircle, Info, Loader2, ShieldCheck } from 'lucide-react'
import React, { useCallback, useState } from 'react'

// ─── 타입 (pdf-engine 타입 로컬 미러) ────────────────────────────────────────

interface PreflightViolation {
  rule: string
  severity: 'error' | 'warning' | 'info'
  pageIndex?: number
  layerId?: string
  message: string
  suggestion?: string
}

interface PreflightReport {
  profileId: string
  profileName: string
  ok: boolean
  errors: PreflightViolation[]
  warnings: PreflightViolation[]
  infos: PreflightViolation[]
  metadata: {
    totalPages: number
    checkedAt: string
  }
}

interface PreflightSummary {
  totalErrors: number
  totalWarnings: number
  allPassed: boolean
}

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function SeverityIcon({
  severity,
  className,
}: {
  severity: PreflightViolation['severity']
  className?: string
}) {
  switch (severity) {
    case 'error':
      return <AlertCircle className={cn('text-red-500', className)} />
    case 'warning':
      return <AlertTriangle className={cn('text-amber-500', className)} />
    case 'info':
      return <Info className={cn('text-blue-500', className)} />
  }
}

function ViolationItem({ v }: { v: PreflightViolation }) {
  return (
    <div className="flex gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm">
      <SeverityIcon severity={v.severity} className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[var(--color-text-primary)]">{v.message}</p>
        {v.suggestion && (
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{v.suggestion}</p>
        )}
        <div className="mt-1 flex flex-wrap gap-1">
          <span className="rounded border border-[var(--color-border)] px-1 py-0.5 text-[10px] text-[var(--color-text-muted)]">
            {v.rule}
          </span>
          {v.pageIndex !== undefined && (
            <span className="rounded border border-[var(--color-border)] px-1 py-0.5 text-[10px] text-[var(--color-text-muted)]">
              p{v.pageIndex + 1}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function ProfileTab({
  report,
  isActive,
  onClick,
}: {
  report: PreflightReport
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors',
        isActive
          ? 'bg-[var(--color-primary-500)] text-white'
          : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]',
      )}
    >
      {report.ok ? (
        <CheckCircle className="size-3 text-green-400" />
      ) : (
        <AlertCircle className="size-3 text-red-400" />
      )}
      {report.profileName}
      {!report.ok && (
        <span className="ml-1 rounded-full bg-red-500 px-1 text-[10px] text-white">
          {report.errors.length}
        </span>
      )}
    </button>
  )
}

// ─── 인쇄소 선택 드롭다운 ────────────────────────────────────────────────────

interface PrinterOption {
  id: string
  name: string
}

function PrinterSelect({
  options,
  value,
  onChange,
  disabled,
}: {
  options: PrinterOption[]
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
      aria-label="인쇄소 선택"
    >
      <option value="">전체 인쇄소 검증</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

interface PreflightModalProps {
  projectId: string | null
  open: boolean
  onClose: () => void
}

export function PreflightModal({ projectId, open, onClose }: PreflightModalProps) {
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState<PreflightReport[] | null>(null)
  const [summary, setSummary] = useState<PreflightSummary | null>(null)
  const [activeProfileIdx, setActiveProfileIdx] = useState(0)
  const [printerOptions, setPrinterOptions] = useState<PrinterOption[]>([])
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('')

  // 인쇄소 목록 로드 (모달 오픈 시)
  React.useEffect(() => {
    if (!open) return
    fetch('/api/printers')
      .then((r) => r.json())
      .then((data: unknown) => {
        if (
          data !== null &&
          typeof data === 'object' &&
          'data' in data &&
          Array.isArray((data as { data: unknown }).data)
        ) {
          const rows = (data as { data: Array<{ id: string; name: string }> }).data
          setPrinterOptions(rows.map((r) => ({ id: r.id, name: r.name })))
        }
      })
      .catch(() => {
        // 목록 로드 실패 시 전체 검증만 제공
      })
  }, [open])

  const runPreflight = useCallback(async () => {
    if (!projectId) {
      showToast('프로젝트를 저장한 후 프리플라이트를 실행하세요.', 'info')
      return
    }
    setLoading(true)
    setReports(null)
    setSummary(null)
    try {
      const body: { embedFonts: boolean; profileId?: string } = { embedFonts: true }
      if (selectedPrinterId) body.profileId = selectedPrinterId

      const res = await fetch(`/api/projects/${projectId}/preflight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        showToast(data.error ?? '프리플라이트 검증에 실패했습니다.', 'error')
        return
      }
      const data = (await res.json()) as {
        reports: PreflightReport[]
        summary: PreflightSummary
      }
      setReports(data.reports)
      setSummary(data.summary)
      setActiveProfileIdx(0)
    } catch (err) {
      console.error('[PreflightModal] 검증 오류:', err)
      showToast('프리플라이트 검증 중 오류가 발생했습니다.', 'error')
    } finally {
      setLoading(false)
    }
  }, [projectId, selectedPrinterId])

  const activeReport = reports?.[activeProfileIdx]

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="flex max-h-[80vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-[var(--color-border)] px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-5 text-[var(--color-primary-500)]" />
            인쇄소 프리플라이트 검사
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 overflow-y-auto p-4">
          {/* 실행 버튼 */}
          {!reports && (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm text-[var(--color-text-secondary)]">
                등록된 인쇄소 사양을 자동으로 검증합니다.
              </p>
              {printerOptions.length > 0 && (
                <PrinterSelect
                  options={printerOptions}
                  value={selectedPrinterId}
                  onChange={setSelectedPrinterId}
                  disabled={loading}
                />
              )}
              <Button
                onClick={() => {
                  void runPreflight()
                }}
                disabled={loading || !projectId}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    검증 중...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" />
                    검증 시작
                  </>
                )}
              </Button>
              {!projectId && (
                <p className="text-xs text-[var(--color-text-muted)]">
                  프로젝트를 먼저 저장하세요.
                </p>
              )}
            </div>
          )}

          {/* 결과 요약 */}
          {summary && (
            <div
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3',
                summary.allPassed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50',
              )}
            >
              {summary.allPassed ? (
                <CheckCircle className="size-6 text-green-600" />
              ) : (
                <AlertCircle className="size-6 text-red-600" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {summary.allPassed ? '모든 프로필 통과' : `오류 ${summary.totalErrors}건 발견`}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  경고 {summary.totalWarnings}건
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => {
                  void runPreflight()
                }}
                disabled={loading}
              >
                재검증
              </Button>
            </div>
          )}

          {/* 프로필 탭 */}
          {reports && (
            <>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {reports.map((report, idx) => (
                  <ProfileTab
                    key={report.profileId}
                    report={report}
                    isActive={idx === activeProfileIdx}
                    onClick={() => setActiveProfileIdx(idx)}
                  />
                ))}
              </div>

              {/* 활성 프로필 상세 */}
              {activeReport && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {activeReport.metadata.totalPages}페이지 ·{' '}
                    {new Date(activeReport.metadata.checkedAt).toLocaleTimeString('ko')} 기준
                  </p>

                  {/* 에러 */}
                  {activeReport.errors.length > 0 && (
                    <section>
                      <h3 className="mb-1.5 text-xs font-semibold text-red-600">
                        오류 ({activeReport.errors.length})
                      </h3>
                      <div className="flex flex-col gap-1.5">
                        {activeReport.errors.map((v, i) => (
                          <ViolationItem key={`e-${i}`} v={v} />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* 경고 */}
                  {activeReport.warnings.length > 0 && (
                    <section>
                      <h3 className="mb-1.5 text-xs font-semibold text-amber-600">
                        경고 ({activeReport.warnings.length})
                      </h3>
                      <div className="flex flex-col gap-1.5">
                        {activeReport.warnings.map((v, i) => (
                          <ViolationItem key={`w-${i}`} v={v} />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Info */}
                  {activeReport.infos.length > 0 && (
                    <section>
                      <h3 className="mb-1.5 text-xs font-semibold text-blue-600">
                        참고 ({activeReport.infos.length})
                      </h3>
                      <div className="flex flex-col gap-1.5">
                        {activeReport.infos.map((v, i) => (
                          <ViolationItem key={`i-${i}`} v={v} />
                        ))}
                      </div>
                    </section>
                  )}

                  {activeReport.ok && (
                    <div className="flex items-center gap-2 rounded bg-green-50 p-3 text-sm text-green-700">
                      <CheckCircle className="size-4" />
                      {activeReport.profileName} 사양 통과
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
