'use client'

// ─────────────────────────────────────────────
// DownloadMenu — PNG/JSON/PDF 다운로드 드롭다운
// ExportMenu 의 기존 동작을 흡수 (PNG/JSON 100% 보존)
// PDF — M6-02: 비동기 잡 트리거 + PdfProgressToast
// 웹툰(px 판형) — MODE-05: PDF/PNG 대신 이미지 시퀀스 · 롱 이미지
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import { exportJson, exportPng } from '@storywork/editor-export'
import type { LayerTree } from '@storywork/editor-layers'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  cn,
  showToast,
} from '@storywork/ui'
import {
  ChevronDown,
  Download,
  FileImage,
  FileJson,
  FileText,
  Images,
  ScrollText,
  ShieldCheck,
} from 'lucide-react'
import React, { useCallback, useState } from 'react'

import { PdfProgressToastContainer } from './PdfProgressToast'
import { PreflightModal } from './PreflightModal'
import { runWebtoonExport } from './webtoon/webtoonExport'
import type { WebtoonExportLayout, WebtoonExportSource } from './webtoon/webtoonExport'

import { usePdfJobProgress } from '@/lib/realtime/usePdfJobProgress'

type DownloadMenuProps = {
  canvas: StoryCanvas | null
  layerTree: LayerTree | null
  fileName?: string
  /** 현재 편집 중인 projectId. PDF 비동기 잡 트리거에 사용. */
  projectId?: string | null
  /**
   * 웹툰(px 판형) 프로젝트면 전달 (MODE-05). 있으면 메뉴가 웹툰 출력(이미지 시퀀스 ·
   * 롱 이미지)으로 바뀐다 — PDF·프리플라이트는 인쇄 경로라 px 판형에서 서버가 거부하고,
   * PNG/JSON 은 단일 캔버스 전제라 세그먼트 스트립에는 맞지 않는다.
   */
  webtoon?: WebtoonExportSource | null
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 60) || 'storywork-page'
}

export function DownloadMenu({
  canvas,
  layerTree,
  fileName = 'storywork-page',
  projectId = null,
  webtoon = null,
}: DownloadMenuProps) {
  const [exporting, setExporting] = useState<'png' | 'json' | WebtoonExportLayout | null>(null)
  const [pdfJobId, setPdfJobId] = useState<string | null>(null)
  const [preflightOpen, setPreflightOpen] = useState(false)
  // 웹툰 스트립은 단일 편집 캔버스가 없다 — 저장본만으로 렌더하므로 canvas 없이도 활성
  const isDisabled = webtoon ? false : !canvas

  const safeName = sanitizeFilename(fileName)

  // PDF 잡 진행률 구독
  const { progress, status, pdfUrl, message, error } = usePdfJobProgress(pdfJobId)

  const handleExportPng = useCallback(async () => {
    if (!canvas || exporting) return
    setExporting('png')
    try {
      const result = await exportPng(canvas, { scale: 2, background: '#ffffff' })
      const url = URL.createObjectURL(result.blob)
      triggerDownload(url, `${safeName}.png`)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      console.error('[DownloadMenu] PNG 내보내기 실패:', err)
      showToast('PNG 내보내기에 실패했습니다.', 'error')
    } finally {
      setExporting(null)
    }
  }, [canvas, exporting, safeName])

  const handleExportJson = useCallback(() => {
    if (!canvas || exporting) return
    setExporting('json')
    try {
      const result = exportJson(canvas, layerTree ?? undefined)
      const json = JSON.stringify(result, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      triggerDownload(url, `${safeName}.json`)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      console.error('[DownloadMenu] JSON 내보내기 실패:', err)
      showToast('JSON 내보내기에 실패했습니다.', 'error')
    } finally {
      setExporting(null)
    }
  }, [canvas, layerTree, exporting, safeName])

  // ── 웹툰 이미지 (MODE-05) ─────────────────────────────────────────────────

  const handleExportWebtoon = useCallback(
    async (layout: WebtoonExportLayout) => {
      if (!webtoon || exporting) return
      setExporting(layout)
      try {
        const { imageCount } = await runWebtoonExport(webtoon, layout, safeName)
        showToast(
          imageCount > 1
            ? `이미지 ${imageCount}장을 ZIP 으로 내려받았습니다.`
            : '이미지를 내려받았습니다.',
          'success',
        )
      } catch (err) {
        console.error('[DownloadMenu] 웹툰 이미지 내보내기 실패:', err)
        showToast('웹툰 이미지 내보내기에 실패했습니다.', 'error')
      } finally {
        setExporting(null)
      }
    },
    [webtoon, exporting, safeName],
  )

  // ── PDF 비동기 다운로드 ────────────────────────────────────────────────────

  const handleExportPdf = useCallback(async () => {
    if (!projectId) {
      showToast('프로젝트를 저장한 후 PDF 출판을 시도하세요.', 'info')
      return
    }

    // 이미 진행 중이면 무시
    if (pdfJobId && (status === 'queued' || status === 'running')) {
      showToast('PDF 생성이 이미 진행 중입니다.', 'info')
      return
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ async: true }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        showToast(data.error ?? 'PDF 출판 요청에 실패했습니다.', 'error')
        return
      }

      const data = (await res.json()) as { jobId: string; status: string }
      setPdfJobId(data.jobId)
    } catch (err) {
      console.error('[DownloadMenu] PDF 출판 요청 오류:', err)
      showToast('PDF 출판 요청 중 오류가 발생했습니다.', 'error')
    }
  }, [projectId, pdfJobId, status])

  return (
    <>
      <DropdownMenu>
        <Tooltip content="다운로드" side="bottom">
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isDisabled}
              aria-label="다운로드 메뉴 열기"
              className={cn(
                'gap-1 px-2',
                // 터치 타겟 ≥ 44px
                'min-h-[2.75rem]',
                '[&_svg]:size-4',
              )}
              data-testid="download-menu-trigger"
            >
              <Download aria-hidden="true" />
              <ChevronDown aria-hidden="true" className="!size-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>다운로드</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {webtoon ? (
            <>
              {/* 웹툰 — 세그먼트(컷 묶음)별 이미지 */}
              <DropdownMenuItem
                onSelect={() => {
                  void handleExportWebtoon('sequence')
                }}
                disabled={exporting !== null}
                aria-label="세그먼트별 이미지로 다운로드 (ZIP)"
                data-testid="download-webtoon-sequence"
              >
                <Images aria-hidden="true" />
                이미지 시퀀스
                <span className="ml-auto text-xs text-[var(--color-text-muted)]">
                  {exporting === 'sequence' ? '처리 중...' : 'ZIP'}
                </span>
              </DropdownMenuItem>

              {/* 웹툰 — 세로로 이은 롱 이미지 (상한 초과 시 자동 분할) */}
              <DropdownMenuItem
                onSelect={() => {
                  void handleExportWebtoon('long')
                }}
                disabled={exporting !== null}
                aria-label="세로로 이은 롱 이미지로 다운로드"
                data-testid="download-webtoon-long"
              >
                <ScrollText aria-hidden="true" />롱 이미지
                {exporting === 'long' && (
                  <span className="ml-auto text-xs text-[var(--color-text-muted)]">처리 중...</span>
                )}
              </DropdownMenuItem>
            </>
          ) : (
            <>
              {/* PNG 다운로드 */}
              <DropdownMenuItem
                onSelect={() => {
                  void handleExportPng()
                }}
                disabled={isDisabled || exporting === 'png'}
                aria-label="PNG 이미지로 다운로드"
                data-testid="download-png"
              >
                <FileImage aria-hidden="true" />
                PNG 이미지
                {exporting === 'png' && (
                  <span className="ml-auto text-xs text-[var(--color-text-muted)]">처리 중...</span>
                )}
              </DropdownMenuItem>

              {/* JSON 다운로드 */}
              <DropdownMenuItem
                onSelect={handleExportJson}
                disabled={isDisabled || exporting === 'json'}
                aria-label="JSON 파일로 다운로드"
                data-testid="download-json"
              >
                <FileJson aria-hidden="true" />
                JSON 파일
                {exporting === 'json' && (
                  <span className="ml-auto text-xs text-[var(--color-text-muted)]">처리 중...</span>
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* PDF 출판 (비동기) */}
              <DropdownMenuItem
                onSelect={() => {
                  void handleExportPdf()
                }}
                disabled={
                  isDisabled ||
                  !projectId ||
                  (pdfJobId !== null && (status === 'queued' || status === 'running'))
                }
                aria-label="PDF 출판 (비동기 처리)"
                data-testid="download-pdf"
              >
                <FileText aria-hidden="true" />
                PDF 출판
                {pdfJobId && (status === 'queued' || status === 'running') && (
                  <span className="ml-auto text-xs text-[var(--color-info-500)]">{progress}%</span>
                )}
                {pdfJobId && status === 'succeeded' && (
                  <span className="ml-auto text-xs text-[var(--color-success-500)]">완료</span>
                )}
                {!projectId && (
                  <span className="ml-auto text-[10px] text-[var(--color-text-muted)] opacity-60">
                    저장 필요
                  </span>
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* 프리플라이트 검사 */}
              <DropdownMenuItem
                onSelect={() => setPreflightOpen(true)}
                disabled={!projectId}
                aria-label="인쇄소 프리플라이트 검사"
                data-testid="preflight-check"
              >
                <ShieldCheck aria-hidden="true" />
                프리플라이트 검사
                {!projectId && (
                  <span className="ml-auto text-[10px] text-[var(--color-text-muted)] opacity-60">
                    저장 필요
                  </span>
                )}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* PDF 진행률 Toast (fixed 위치, 잡 진행 중/완료 시만 표시) */}
      <PdfProgressToastContainer
        jobId={pdfJobId}
        progress={progress}
        status={status}
        pdfUrl={pdfUrl}
        message={message}
        error={error}
        onDismiss={() => setPdfJobId(null)}
      />

      {/* 프리플라이트 모달 */}
      <PreflightModal
        projectId={projectId}
        open={preflightOpen}
        onClose={() => setPreflightOpen(false)}
      />
    </>
  )
}
