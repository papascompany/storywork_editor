'use client'

/**
 * CharacterMappingTable — Wizard Step 3: 캐릭터 매핑 (M4-04 Step 2)
 * React 명시 import: vitest JSX transform 호환
 *
 * 대본에서 추출된 화자명 → DB Character 매핑.
 * 1차: 더미맨(system) 기본, 향후 Character 선택 드롭다운으로 확장 가능.
 */

import React from 'react'

import type { CharacterMapEntry } from './types'

interface CharacterMappingTableProps {
  entries: CharacterMapEntry[]
  onBack: () => void
  onNext: () => void
}

export function CharacterMappingTable({ entries, onBack, onNext }: CharacterMappingTableProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-neutral-700">캐릭터 매핑</h3>
        <p className="text-xs text-neutral-500">
          대본에서 추출된 화자를 캐릭터에 연결합니다. 현재는 모두 기본 캐릭터(더미맨)로 설정됩니다.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 py-8 text-center text-sm text-neutral-400">
          화자가 감지되지 않았습니다. 대화 형식 대본인지 확인해 주세요.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-neutral-500">
                  대본 화자명
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-neutral-500">
                  매핑 캐릭터
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {entries.map((entry) => (
                <tr key={entry.scriptName} className="bg-white">
                  <td className="px-4 py-3 font-mono font-medium text-neutral-800">
                    {entry.scriptName}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                      기본 캐릭터 (더미맨)
                    </span>
                    <span className="ml-2 text-xs text-neutral-400">— 향후 직접 선택 가능</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-neutral-500 hover:text-neutral-700"
        >
          ← 이전
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          자동 생성 →
        </button>
      </div>
    </div>
  )
}
