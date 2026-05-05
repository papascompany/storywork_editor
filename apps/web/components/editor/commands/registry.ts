/**
 * commands/registry.ts — Command Palette 타입 정의
 *
 * Command 는 id 로 식별, category 별 그룹, action 으로 실행.
 * CommandContext 는 EditorShell 이 주입하는 런타임 의존성.
 */

import type { StoryCanvas } from '@storywork/editor-core'
import type { LayerTree } from '@storywork/editor-layers'
import type React from 'react'

import type { ToolId } from '../store/useToolStore'
import type { HistoryRef } from '../types'

// ─── 컨텍스트 ────────────────────────────────────────────────────────────────

export type CommandContext = {
  canvas: StoryCanvas | null
  layerTree: LayerTree | null
  history: HistoryRef | null
  setActiveTool: (tool: ToolId) => void
  showToast: (msg: string, variant?: 'success' | 'warning' | 'error' | 'info') => void
}

// ─── 단축키 카탈로그 항목 ─────────────────────────────────────────────────────

export type ShortcutItem = {
  keys: string[]
  description: string
}

export type ShortcutGroup = {
  title: string
  items: ShortcutItem[]
}

// ─── Command ─────────────────────────────────────────────────────────────────

export type CommandCategory = 'tools' | 'edit' | 'layer' | 'view' | 'file' | 'help'

export type Command = {
  id: string
  category: CommandCategory
  label: string
  /** lucide-react 컴포넌트 */
  icon?: React.ComponentType<{ className?: string }>
  /** 표시용 단축키 문자열 (예: 'Cmd+Z') */
  shortcut?: string
  /** 한글/영문 검색 키워드 */
  keywords?: string[]
  action: (ctx: CommandContext) => void | Promise<void>
  disabled?: (ctx: CommandContext) => boolean
}

// ─── 검색 결과 ───────────────────────────────────────────────────────────────

export type CommandSearchResult = {
  command: Command
  score: number
}

// ─── localStorage 키 ─────────────────────────────────────────────────────────

export const RECENT_COMMANDS_KEY = 'storywork.editor.recent-commands'
export const MAX_RECENT = 10

/**
 * 최근 사용 명령 ID 목록을 localStorage 에서 불러옴.
 * private mode 대응을 위해 try/catch.
 */
export function loadRecentCommandIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_COMMANDS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

/**
 * 명령 실행 시 최근 목록에 추가.
 * 최대 MAX_RECENT 개 유지, 중복 제거 후 앞에 추가.
 */
export function saveRecentCommandId(id: string): void {
  try {
    const current = loadRecentCommandIds().filter((cid) => cid !== id)
    const next = [id, ...current].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(next))
  } catch {
    // private mode — 무시
  }
}

// ─── 검색 알고리즘 ───────────────────────────────────────────────────────────

/**
 * 점수 기준:
 * 4: prefix 일치 (라벨 시작)
 * 3: 단어 시작 일치
 * 2: 부분 문자열 일치 (라벨)
 * 1: keyword 에서 일치
 * 0: 불일치
 */
export function scoreCommand(command: Command, query: string): number {
  if (!query) return 1 // 빈 쿼리 → 전체 노출

  const q = query.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!q) return 1

  const label = command.label.toLowerCase()
  const keywords = (command.keywords ?? []).map((k) => k.toLowerCase())

  // prefix
  if (label.startsWith(q)) return 4

  // 단어 시작
  const words = label.split(/\s+/)
  if (words.some((w) => w.startsWith(q))) return 3

  // 부분 문자열 (라벨)
  if (label.includes(q)) return 2

  // keyword 매칭
  if (keywords.some((k) => k.includes(q))) return 1

  return 0
}

export function searchCommands(commands: Command[], query: string): CommandSearchResult[] {
  return commands
    .map((command) => ({ command, score: scoreCommand(command, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
}
