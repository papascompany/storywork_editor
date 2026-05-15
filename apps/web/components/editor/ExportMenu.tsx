'use client'

// ─────────────────────────────────────────────
// ExportMenu — PNG / JSON 다운로드 버튼
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import { exportJson, exportPng } from '@storywork/editor-export'
import type { LayerTree } from '@storywork/editor-layers'
import { Button } from '@storywork/ui'
import { Download, FileImage, FileJson } from 'lucide-react'
import { useCallback, useState } from 'react'

type ExportMenuProps = {
  canvas: StoryCanvas | null
  layerTree: LayerTree | null
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}

/**
 * ExportMenu
 *
 * - PNG: exportPng(canvas) → Blob → ObjectURL → download
 * - JSON: exportJson(canvas, layerTree) → JSON string → DataURL → download
 */
export function ExportMenu({ canvas, layerTree }: ExportMenuProps) {
  const [exporting, setExporting] = useState<'png' | 'json' | null>(null)

  const handleExportPng = useCallback(async () => {
    if (!canvas || exporting) return
    setExporting('png')
    try {
      const result = await exportPng(canvas, { scale: 2, background: '#ffffff' })
      const url = URL.createObjectURL(result.blob)
      triggerDownload(url, 'storywork-page.png')
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      console.error('[ExportMenu] PNG 내보내기 실패:', err)
    } finally {
      setExporting(null)
    }
  }, [canvas, exporting])

  const handleExportJson = useCallback(() => {
    if (!canvas || exporting) return
    setExporting('json')
    try {
      const result = exportJson(canvas, layerTree ?? undefined)
      const json = JSON.stringify(result, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      triggerDownload(url, 'storywork-page.json')
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      console.error('[ExportMenu] JSON 내보내기 실패:', err)
    } finally {
      setExporting(null)
    }
  }, [canvas, layerTree, exporting])

  const isDisabled = !canvas

  return (
    <div className="flex items-center gap-1" role="group" aria-label="내보내기">
      {/* PNG */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          void handleExportPng()
        }}
        disabled={isDisabled || exporting === 'png'}
        aria-label="PNG 내보내기"
        title="PNG 내보내기"
        data-testid="export-png-btn"
      >
        <FileImage />
      </Button>

      {/* JSON */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleExportJson}
        disabled={isDisabled || exporting === 'json'}
        aria-label="JSON 내보내기"
        title="JSON 내보내기"
        data-testid="export-json-btn"
      >
        <FileJson />
      </Button>

      {/* 내보내기 진행 중 시각 피드백 */}
      {exporting && (
        <span className="text-xs text-[var(--color-text-muted)]" aria-live="polite">
          <Download className="size-3 animate-bounce" />
        </span>
      )}
    </div>
  )
}
