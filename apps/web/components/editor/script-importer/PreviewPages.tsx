'use client'

/**
 * PreviewPages — Wizard Step 4: 페이지 N개 미리보기 (M4-04 Step 2)
 * React 명시 import: vitest JSX transform 호환
 *
 * compose() 결과 페이지 목록 + 장면 요약 표시.
 * 썸네일은 현재 null (서버 사이드 렌더링 미구현) → 인덱스 라벨로 대체.
 */

import React from 'react'

import type { FullPipelineResponse } from './types'

interface PreviewPagesProps {
  result: FullPipelineResponse
  formatLabel: string
  onOpenEditor: () => void
  onBack: () => void
}

export function PreviewPages({ result, formatLabel, onOpenEditor, onBack }: PreviewPagesProps) {
  const { pages, scenes } = result

  return (
    <div className="flex flex-col gap-6">
      {/* 요약 헤더 */}
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <p className="text-sm font-semibold text-green-800">
          자동 생성 완료 — {pages.length}페이지 / {scenes.length}장면 / 판형: {formatLabel}
        </p>
        <p className="mt-0.5 text-xs text-green-600">
          편집기에서 각 페이지를 자유롭게 수정할 수 있습니다.
        </p>
      </div>

      {/* 페이지 썸네일 그리드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {pages.map((page) => {
          const relatedScene = scenes.find((s) => s.index === page.pageIndex)
          return (
            <div
              key={page.id}
              className="flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
            >
              {/* 썸네일 자리 */}
              <div className="flex aspect-[3/4] items-center justify-center bg-neutral-100">
                <div className="text-center">
                  <p className="text-2xl font-bold text-neutral-300">{page.pageIndex + 1}</p>
                  <p className="text-xs text-neutral-400">페이지</p>
                </div>
              </div>
              {/* 장면 요약 */}
              {relatedScene && (
                <div className="px-2 py-1.5">
                  <p className="truncate text-xs text-neutral-500">{relatedScene.summary}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-neutral-500 hover:text-neutral-700"
        >
          ← 다시 생성
        </button>
        <button
          type="button"
          onClick={onOpenEditor}
          className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          편집기에서 열기 →
        </button>
      </div>
    </div>
  )
}
