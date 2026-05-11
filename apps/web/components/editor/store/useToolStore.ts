/**
 * useToolStore — 편집기 활성 도구 + FeatureSidebar 상태
 *
 * 단방향 의존성: store → UI 컴포넌트 (역방향 없음)
 * React 외부(이벤트 핸들러/훅)에서도 getState() 로 직접 접근 가능.
 */

import { create } from 'zustand'

// ─── 도구 종류 ────────────────────────────────────────────────────────────────

export type ToolId =
  | 'select'
  | 'template'
  | 'pose'
  | 'background'
  | 'bubble'
  | 'wordfx'
  | 'decoration'
  | 'shape'
  | 'text'
  | 'upload'
  | 'ai'

// 현재 M2/M5 에서 실제 동작하는 도구 집합
export const ACTIVE_TOOLS = new Set<ToolId>([
  'select',
  'template', // M5-04 에서 활성화
  'background',
  'shape',
  'pose',
  'text',
  'bubble', // M5-02 에서 활성화
])

// 비활성 도구별 활성화 예정 마일스톤 (Toast 메시지용)
export const TOOL_MILESTONE: Partial<Record<ToolId, string>> = {
  // template: 'M3',  ← M5-04 에서 활성화됨
  // pose: 'M2',  ← M2-05 에서 활성화됨
  // text: 'M5',  ← M5-01 에서 활성화됨 (Phase 2)
  // bubble: 'M5',  ← M5-02 에서 활성화됨
  wordfx: 'M5',
  decoration: 'M3',
  upload: 'M7',
  ai: 'M4',
}

// ─── Store 인터페이스 ─────────────────────────────────────────────────────────

interface ToolStore {
  /** 현재 활성 도구 */
  active: ToolId
  /** FeatureSidebar 열림 여부 */
  sidebarOpen: boolean

  setActive: (tool: ToolId) => void
  setSidebarOpen: (open: boolean) => void
  /**
   * 도구 클릭 시 호출:
   * - 같은 도구 재클릭 → sidebarOpen toggle
   * - 다른 도구 클릭 → active 변경 + sidebarOpen = true
   * - 'select' 는 sidebarOpen 을 false 로 (패널 없음)
   */
  tapTool: (tool: ToolId) => void
}

export const useToolStore = create<ToolStore>((set, get) => ({
  active: 'select',
  sidebarOpen: false,

  setActive: (tool) => set({ active: tool }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  tapTool: (tool) => {
    const { active, sidebarOpen } = get()

    if (tool === 'select') {
      // select 는 항상 활성 + 사이드바 닫힘
      set({ active: 'select', sidebarOpen: false })
      return
    }

    if (tool === active) {
      // 같은 도구 재클릭 → 토글
      set({ sidebarOpen: !sidebarOpen })
    } else {
      // 다른 도구 → 전환 + 열기
      set({ active: tool, sidebarOpen: true })
    }
  },
}))
