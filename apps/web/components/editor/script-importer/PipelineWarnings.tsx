'use client'

/**
 * PipelineWarnings — full-pipeline API 응답 warnings 표시 (M4-04 Step 2)
 * React 명시 import: vitest JSX transform 호환
 *
 * lowDpi 경고, 슬롯 미배치 경고 등을 사용자 친화적으로 표시.
 */

import React from 'react'

interface PipelineWarningsProps {
  warnings: string[]
}

const WARNING_LABELS: Record<string, string> = {
  '[lowDpi]': '저해상도',
  '[slot-empty]': '슬롯 미배치',
  '[safe-area]': '안전 영역',
}

function getWarningKind(warning: string): string {
  for (const [key, label] of Object.entries(WARNING_LABELS)) {
    if (warning.includes(key)) return label
  }
  return '알림'
}

export function PipelineWarnings({ warnings }: PipelineWarningsProps) {
  if (warnings.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="mb-2 text-sm font-semibold text-amber-800">
        배치 시 {warnings.length}개 주의 사항
      </p>
      <ul className="flex flex-col gap-1">
        {warnings.map((warning, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-amber-700">
            <span className="mt-px inline-block shrink-0 rounded bg-amber-200 px-1.5 py-0.5 text-amber-900">
              {getWarningKind(warning)}
            </span>
            <span className="leading-relaxed">{warning}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
