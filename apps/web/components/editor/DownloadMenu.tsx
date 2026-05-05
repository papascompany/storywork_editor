'use client'

// ─────────────────────────────────────────────
// DownloadMenu — PNG/JSON/PDF 다운로드 드롭다운
// ExportMenu 의 기존 동작을 흡수 (PNG/JSON 100% 보존)
// PDF 는 M6 Placeholder (Toast 안내)
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
import { ChevronDown, Download, FileImage, FileJson, FileText } from 'lucide-react'
import React, { useCallback, useState } from 'react'

type DownloadMenuProps = {
  canvas: StoryCanvas | null
  layerTree: LayerTree | null
  fileName?: string
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
}: DownloadMenuProps) {
  const [exporting, setExporting] = useState<'png' | 'json' | null>(null)
  const isDisabled = !canvas

  const safeName = sanitizeFilename(fileName)

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

  const handleExportPdf = useCallback(() => {
    showToast('PDF 다운로드는 M6에서 활성화됩니다.', 'info')
  }, [])

  return (
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

      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>다운로드</DropdownMenuLabel>
        <DropdownMenuSeparator />

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

        {/* PDF 다운로드 (M6 Placeholder) */}
        <DropdownMenuItem
          onSelect={handleExportPdf}
          aria-label="PDF 다운로드 (M6에서 활성화)"
          className="text-[var(--color-text-muted)]"
          data-testid="download-pdf"
        >
          <FileText aria-hidden="true" />
          PDF 출판
          <span className="ml-auto text-[10px] text-[var(--color-text-muted)] opacity-60">M6</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
