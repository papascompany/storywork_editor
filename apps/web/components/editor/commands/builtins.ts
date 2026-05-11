'use client'

/**
 * commands/builtins.ts — 내장 Command 카탈로그 (~35개)
 *
 * 정적 배열. 런타임 의존성은 action(ctx) 에서 ctx 를 통해 주입.
 * 아이콘은 lucide-react 를 사용.
 */

import {
  AlignCenter,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Copy,
  CopyPlus,
  Download,
  FileJson,
  FileType,
  HelpCircle,
  Image,
  LayoutTemplate,
  Layers,
  MessageCircle,
  Moon,
  MousePointer2,
  RotateCcw,
  RotateCw,
  Shapes,
  Sparkles,
  Stars,
  Trash2,
  Type,
  Upload,
  UserSquare2,
  Wand2,
} from 'lucide-react'

import type { Command, ShortcutGroup } from './registry'

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: '도구',
    items: [
      { keys: ['V'], description: '선택 도구' },
      { keys: ['T'], description: '템플릿 도구 열기' },
      { keys: ['P'], description: '포즈 도구 열기' },
      { keys: ['B'], description: '배경 도구 열기' },
      { keys: ['Q'], description: '말풍선 도구 열기' },
      { keys: ['W'], description: '워드효과 도구 열기' },
      { keys: ['D'], description: '꾸미기 도구 열기' },
      { keys: ['S'], description: '도형 도구 열기' },
      { keys: ['X'], description: '텍스트 도구 열기' },
      { keys: ['U'], description: '업로드 도구 열기' },
      { keys: ['I'], description: 'AI 자동배치 열기' },
    ],
  },
  {
    title: '편집',
    items: [
      { keys: ['⌘', 'Z'], description: '실행 취소' },
      { keys: ['⌘', '⇧', 'Z'], description: '다시 실행' },
      { keys: ['⌘', 'A'], description: '전체 선택' },
      { keys: ['⌘', 'C'], description: '복사' },
      { keys: ['⌘', 'V'], description: '붙여넣기' },
      { keys: ['⌘', 'D'], description: '복제' },
      { keys: ['Del'], description: '삭제' },
      { keys: ['⌘', 'L'], description: '잠금 토글' },
    ],
  },
  {
    title: '레이어',
    items: [
      { keys: ['⌘', ']'], description: '맨 앞으로' },
      { keys: [']'], description: '한 칸 앞으로' },
      { keys: ['['], description: '한 칸 뒤로' },
      { keys: ['⌘', '['], description: '맨 뒤로' },
      { keys: ['⌘', 'G'], description: '그룹' },
      { keys: ['⌘', '⇧', 'G'], description: '그룹 해제' },
    ],
  },
  {
    title: '보기',
    items: [
      { keys: ['⌘', '+'], description: '줌인' },
      { keys: ['⌘', '-'], description: '줌아웃' },
      { keys: ['⌘', '0'], description: '100%' },
      { keys: ['F'], description: '화면 맞춤' },
    ],
  },
  {
    title: '기타',
    items: [
      { keys: ['⌘', 'K'], description: '명령 팔레트' },
      { keys: ['?'], description: '단축키 도움말' },
    ],
  },
]

// ─── 내장 명령 목록 ───────────────────────────────────────────────────────────

export const BUILTIN_COMMANDS: Command[] = [
  // ── 도구 ──────────────────────────────────────────────────────────────────
  {
    id: 'tool-select',
    category: 'tools',
    label: '선택 도구',
    icon: MousePointer2,
    shortcut: 'V',
    keywords: ['select', '선택', 'pointer'],
    action: ({ setActiveTool }) => setActiveTool('select'),
  },
  {
    id: 'tool-template',
    category: 'tools',
    label: '템플릿 도구',
    icon: LayoutTemplate,
    shortcut: 'T',
    keywords: ['template', '템플릿', 'layout'],
    action: ({ setActiveTool }) => setActiveTool('template'),
  },
  {
    id: 'tool-pose',
    category: 'tools',
    label: '포즈 도구',
    icon: UserSquare2,
    shortcut: 'P',
    keywords: ['pose', '포즈', 'character', '캐릭터', '인물'],
    action: ({ setActiveTool }) => setActiveTool('pose'),
  },
  {
    id: 'tool-background',
    category: 'tools',
    label: '배경 도구',
    icon: Image,
    shortcut: 'B',
    keywords: ['background', '배경', 'bg'],
    action: ({ setActiveTool }) => setActiveTool('background'),
  },
  {
    id: 'tool-bubble',
    category: 'tools',
    label: '말풍선 도구',
    icon: MessageCircle,
    shortcut: 'Q',
    keywords: ['bubble', '말풍선', 'speech', '대사'],
    action: ({ setActiveTool }) => setActiveTool('bubble'),
  },
  {
    id: 'tool-wordfx',
    category: 'tools',
    label: '워드효과 도구',
    icon: Sparkles,
    shortcut: 'W',
    keywords: ['wordfx', '워드효과', 'word effect', 'effect'],
    action: ({ setActiveTool }) => setActiveTool('wordfx'),
  },
  {
    id: 'tool-decoration',
    category: 'tools',
    label: '꾸미기 도구',
    icon: Stars,
    shortcut: 'D',
    keywords: ['decoration', '꾸미기', 'decor', 'sticker', '스티커'],
    action: ({ setActiveTool }) => setActiveTool('decoration'),
  },
  {
    id: 'tool-shape',
    category: 'tools',
    label: '도형 도구',
    icon: Shapes,
    shortcut: 'S',
    keywords: ['shape', '도형', 'rect', 'circle', 'polygon'],
    action: ({ setActiveTool }) => setActiveTool('shape'),
  },
  {
    id: 'tool-text',
    category: 'tools',
    label: '텍스트 도구',
    icon: Type,
    shortcut: 'X',
    keywords: ['text', '텍스트', '글', 'type', 'font'],
    action: ({ setActiveTool }) => setActiveTool('text'),
  },
  {
    id: 'tool-upload',
    category: 'tools',
    label: '업로드 도구',
    icon: Upload,
    shortcut: 'U',
    keywords: ['upload', '업로드', '파일', 'file', 'import'],
    action: ({ setActiveTool }) => setActiveTool('upload'),
  },
  {
    id: 'tool-ai',
    category: 'tools',
    label: 'AI 자동배치',
    icon: Wand2,
    shortcut: 'I',
    keywords: ['ai', 'AI', '자동', '자동배치', 'auto', 'layout', 'intelligent'],
    action: ({ setActiveTool }) => setActiveTool('ai'),
  },

  // ── 편집 ──────────────────────────────────────────────────────────────────
  {
    id: 'edit-undo',
    category: 'edit',
    label: '실행 취소',
    icon: RotateCcw,
    shortcut: '⌘Z',
    keywords: ['undo', '취소', '되돌리기'],
    action: ({ history, showToast }) => {
      if (!history) {
        showToast('편집기 초기화 중입니다.', 'warning')
        return
      }
      if (!history.canUndo()) {
        showToast('취소할 작업이 없습니다.', 'info')
        return
      }
      history.undo()
    },
    disabled: ({ history }) => !history?.canUndo(),
  },
  {
    id: 'edit-redo',
    category: 'edit',
    label: '다시 실행',
    icon: RotateCw,
    shortcut: '⌘⇧Z',
    keywords: ['redo', '다시', '재실행'],
    action: ({ history, showToast }) => {
      if (!history) {
        showToast('편집기 초기화 중입니다.', 'warning')
        return
      }
      if (!history.canRedo()) {
        showToast('다시 실행할 작업이 없습니다.', 'info')
        return
      }
      history.redo()
    },
    disabled: ({ history }) => !history?.canRedo(),
  },
  {
    id: 'edit-select-all',
    category: 'edit',
    label: '전체 선택',
    icon: AlignCenter,
    shortcut: '⌘A',
    keywords: ['select all', '전체 선택', '모두 선택'],
    action: ({ canvas, showToast }) => {
      if (!canvas) {
        showToast('캔버스가 초기화되지 않았습니다.', 'error')
        return
      }
      const fc = canvas._fabricCanvas
      const objs = fc.getObjects()
      if (objs.length === 0) {
        showToast('캔버스에 객체가 없습니다.', 'info')
        return
      }
      // BUG-013 가드: getContext 확인
      if (!fc.getElement().getContext) return
      // fabric v6: ActiveSelection 으로 다중 선택
      void import('fabric').then(({ ActiveSelection }) => {
        fc.discardActiveObject()
        const sel = new ActiveSelection(objs, { canvas: fc })
        fc.setActiveObject(sel)
        fc.requestRenderAll()
      })
    },
  },
  {
    id: 'edit-copy',
    category: 'edit',
    label: '복사',
    icon: Copy,
    shortcut: '⌘C',
    keywords: ['copy', '복사'],
    action: async ({ canvas, showToast }) => {
      if (!canvas) return
      const { copySelection } = await import('../lib/clipboard')
      const count = await copySelection(canvas)
      if (count === 0) showToast('복사할 객체를 선택하세요.', 'info')
    },
  },
  {
    id: 'edit-paste',
    category: 'edit',
    label: '붙여넣기',
    icon: Clipboard,
    shortcut: '⌘V',
    keywords: ['paste', '붙여넣기'],
    action: async ({ canvas, history, showToast }) => {
      if (!canvas || !history) return
      const { paste } = await import('../lib/clipboard')
      const count = await paste(canvas, history)
      if (count === 0) showToast('붙여넣을 내용이 없습니다. 먼저 복사하세요.', 'info')
    },
  },
  {
    id: 'edit-duplicate',
    category: 'edit',
    label: '복제',
    icon: CopyPlus,
    shortcut: '⌘D',
    keywords: ['duplicate', '복제', 'copy'],
    action: async ({ canvas, history, showToast }) => {
      if (!canvas || !history) return
      const { duplicateSelection } = await import('../lib/clipboard')
      const count = await duplicateSelection(canvas, history)
      if (count === 0) showToast('복제할 객체를 선택하세요.', 'info')
    },
  },
  {
    id: 'edit-delete',
    category: 'edit',
    label: '선택 삭제',
    icon: Trash2,
    shortcut: 'Del',
    keywords: ['delete', '삭제', 'remove'],
    action: ({ canvas, history, showToast }) => {
      if (!canvas) return
      const fc = canvas._fabricCanvas
      const active = fc.getActiveObject()
      if (!active) {
        showToast('삭제할 객체를 선택하세요.', 'info')
        return
      }
      if (!history) {
        // history 없으면 직접 제거
        fc.remove(active)
        fc.discardActiveObject()
        fc.requestRenderAll()
        return
      }
      // RemoveObjectCommand 로 undo 가능하게
      void import('@storywork/editor-history').then(({ RemoveObjectCommand }) => {
        import('fabric').then(({ ActiveSelection }) => {
          const targets = active instanceof ActiveSelection ? active.getObjects() : [active]
          fc.discardActiveObject()
          for (const obj of targets) {
            const dataTyped = (obj as { data?: { id?: string; kind?: string } }).data
            const id = dataTyped?.id
            const objectData = id ? canvas.getObjectData(id) : undefined
            if (id && objectData) {
              const cmd = new RemoveObjectCommand({ canvas, id, fabricObj: obj, objectData })
              history.push(cmd)
            } else {
              fc.remove(obj)
            }
          }
          fc.requestRenderAll()
        })
      })
    },
  },

  // ── 레이어 ────────────────────────────────────────────────────────────────
  {
    id: 'layer-bring-to-front',
    category: 'layer',
    label: '맨 앞으로',
    icon: ChevronUp,
    shortcut: '⌘]',
    keywords: ['bring to front', '맨 앞', 'front', '앞으로'],
    action: ({ canvas, layerTree, history }) => {
      if (!canvas) return
      const obj = canvas._fabricCanvas.getActiveObject()
      if (!obj) return
      const id = (obj as { data?: { id?: string } }).data?.id
      if (layerTree && history && id) {
        void import('@storywork/editor-history').then(({ ZOrderCommand }) => {
          const parentId = layerTree.getNode(id)?.parentId ?? null
          const siblings = parentId
            ? (layerTree.getNode(parentId)?.childrenIds ?? [])
            : layerTree.getRootNodes().map((n) => n.id)
          const cmd = new ZOrderCommand({
            layerTree,
            id,
            action: 'bringToFront',
            siblingsBefore: siblings,
            parentId,
          })
          history.push(cmd)
        })
      } else {
        canvas._fabricCanvas.bringObjectToFront(obj)
        canvas._fabricCanvas.requestRenderAll()
      }
    },
  },
  {
    id: 'layer-bring-forward',
    category: 'layer',
    label: '한 칸 앞으로',
    icon: ChevronUp,
    shortcut: ']',
    keywords: ['bring forward', '앞으로', 'forward'],
    action: ({ canvas, layerTree, history }) => {
      if (!canvas) return
      const obj = canvas._fabricCanvas.getActiveObject()
      if (!obj) return
      const id = (obj as { data?: { id?: string } }).data?.id
      if (layerTree && history && id) {
        void import('@storywork/editor-history').then(({ ZOrderCommand }) => {
          const parentId = layerTree.getNode(id)?.parentId ?? null
          const siblings = parentId
            ? (layerTree.getNode(parentId)?.childrenIds ?? [])
            : layerTree.getRootNodes().map((n) => n.id)
          const cmd = new ZOrderCommand({
            layerTree,
            id,
            action: 'bringForward',
            siblingsBefore: siblings,
            parentId,
          })
          history.push(cmd)
        })
      } else {
        canvas._fabricCanvas.bringObjectForward(obj)
        canvas._fabricCanvas.requestRenderAll()
      }
    },
  },
  {
    id: 'layer-send-backward',
    category: 'layer',
    label: '한 칸 뒤로',
    icon: ChevronDown,
    shortcut: '[',
    keywords: ['send backward', '뒤로', 'backward'],
    action: ({ canvas, layerTree, history }) => {
      if (!canvas) return
      const obj = canvas._fabricCanvas.getActiveObject()
      if (!obj) return
      const id = (obj as { data?: { id?: string } }).data?.id
      if (layerTree && history && id) {
        void import('@storywork/editor-history').then(({ ZOrderCommand }) => {
          const parentId = layerTree.getNode(id)?.parentId ?? null
          const siblings = parentId
            ? (layerTree.getNode(parentId)?.childrenIds ?? [])
            : layerTree.getRootNodes().map((n) => n.id)
          const cmd = new ZOrderCommand({
            layerTree,
            id,
            action: 'sendBackward',
            siblingsBefore: siblings,
            parentId,
          })
          history.push(cmd)
        })
      } else {
        canvas._fabricCanvas.sendObjectBackwards(obj)
        canvas._fabricCanvas.requestRenderAll()
      }
    },
  },
  {
    id: 'layer-send-to-back',
    category: 'layer',
    label: '맨 뒤로',
    icon: ChevronDown,
    shortcut: '⌘[',
    keywords: ['send to back', '맨 뒤', 'back', '뒤로'],
    action: ({ canvas, layerTree, history }) => {
      if (!canvas) return
      const obj = canvas._fabricCanvas.getActiveObject()
      if (!obj) return
      const id = (obj as { data?: { id?: string } }).data?.id
      if (layerTree && history && id) {
        void import('@storywork/editor-history').then(({ ZOrderCommand }) => {
          const parentId = layerTree.getNode(id)?.parentId ?? null
          const siblings = parentId
            ? (layerTree.getNode(parentId)?.childrenIds ?? [])
            : layerTree.getRootNodes().map((n) => n.id)
          const cmd = new ZOrderCommand({
            layerTree,
            id,
            action: 'sendToBack',
            siblingsBefore: siblings,
            parentId,
          })
          history.push(cmd)
        })
      } else {
        canvas._fabricCanvas.sendObjectToBack(obj)
        canvas._fabricCanvas.requestRenderAll()
      }
    },
  },
  {
    id: 'layer-group',
    category: 'layer',
    label: '그룹',
    icon: Layers,
    shortcut: '⌘G',
    keywords: ['group', '그룹', 'combine'],
    action: ({ canvas, layerTree, history, showToast }) => {
      if (!canvas || !layerTree || !history) {
        showToast('편집기가 준비되지 않았습니다.', 'error')
        return
      }
      const fc = canvas._fabricCanvas
      const active = fc.getActiveObject()
      if (!active) {
        showToast('그룹화할 객체를 선택하세요.', 'info')
        return
      }
      void import('fabric').then(({ ActiveSelection }) => {
        if (!(active instanceof ActiveSelection)) {
          showToast('2개 이상 선택 후 그룹화하세요.', 'info')
          return
        }
        const objs = active.getObjects()
        const ids = objs
          .map((o) => (o as { data?: { id?: string } }).data?.id)
          .filter((id): id is string => Boolean(id))

        if (ids.length < 2) {
          showToast('2개 이상 선택 후 그룹화하세요.', 'info')
          return
        }

        void import('@storywork/editor-history').then(({ GroupCommand }) => {
          const cmd = new GroupCommand({ layerTree, ids })
          history.push(cmd)
          fc.discardActiveObject()
          fc.requestRenderAll()
        })
      })
    },
  },
  {
    id: 'layer-ungroup',
    category: 'layer',
    label: '그룹 해제',
    icon: Layers,
    shortcut: '⌘⇧G',
    keywords: ['ungroup', '그룹 해제', 'separate'],
    action: ({ canvas, layerTree, history, showToast }) => {
      if (!canvas || !layerTree || !history) {
        showToast('편집기가 준비되지 않았습니다.', 'error')
        return
      }
      const fc = canvas._fabricCanvas
      const active = fc.getActiveObject()
      if (!active) {
        showToast('그룹 해제할 그룹을 선택하세요.', 'info')
        return
      }
      const groupId = (active as { data?: { id?: string } }).data?.id
      if (!groupId) {
        showToast('그룹 해제할 그룹을 선택하세요.', 'info')
        return
      }
      const node = layerTree.getNode(groupId)
      if (!node || node.kind !== 'group') {
        showToast('선택된 객체가 그룹이 아닙니다.', 'info')
        return
      }
      void import('@storywork/editor-history').then(({ UngroupCommand }) => {
        const cmd = new UngroupCommand({
          layerTree,
          groupId,
          groupNodeSnapshot: { ...node },
        })
        history.push(cmd)
        fc.discardActiveObject()
        fc.requestRenderAll()
      })
    },
  },

  // ── 보기 ──────────────────────────────────────────────────────────────────
  {
    id: 'view-zoom-in',
    category: 'view',
    label: '줌인',
    shortcut: '⌘+',
    keywords: ['zoom in', '줌인', '확대', 'magnify'],
    action: async ({ canvas, showToast }) => {
      if (!canvas) {
        showToast('캔버스가 초기화되지 않았습니다.', 'error')
        return
      }
      const { applyZoom, getZoomPercent } = await import('../Footer')
      const current = getZoomPercent(canvas)
      applyZoom(canvas, Math.min(400, current + 10))
    },
  },
  {
    id: 'view-zoom-out',
    category: 'view',
    label: '줌아웃',
    shortcut: '⌘-',
    keywords: ['zoom out', '줌아웃', '축소'],
    action: async ({ canvas, showToast }) => {
      if (!canvas) {
        showToast('캔버스가 초기화되지 않았습니다.', 'error')
        return
      }
      const { applyZoom, getZoomPercent } = await import('../Footer')
      const current = getZoomPercent(canvas)
      applyZoom(canvas, Math.max(25, current - 10))
    },
  },
  {
    id: 'view-zoom-100',
    category: 'view',
    label: '100% 보기',
    shortcut: '⌘0',
    keywords: ['zoom 100', '100%', 'actual size', '원본'],
    action: async ({ canvas, showToast }) => {
      if (!canvas) {
        showToast('캔버스가 초기화되지 않았습니다.', 'error')
        return
      }
      const { applyZoom } = await import('../Footer')
      applyZoom(canvas, 100)
    },
  },
  {
    id: 'view-fit',
    category: 'view',
    label: '화면 맞춤',
    shortcut: 'F',
    keywords: ['fit', '맞춤', 'fit to screen', '화면 맞춤', 'fit view'],
    action: async ({ canvas, showToast }) => {
      if (!canvas) {
        showToast('캔버스가 초기화되지 않았습니다.', 'error')
        return
      }
      const { fitToViewport } = await import('../Footer')
      fitToViewport(canvas)
    },
  },
  {
    id: 'view-dark-mode',
    category: 'view',
    label: '다크모드 토글',
    icon: Moon,
    keywords: ['dark mode', '다크모드', 'theme', '테마', 'light', 'dark'],
    action: ({ showToast }) => {
      // ThemeProvider 의 toggleTheme 은 컴포넌트에서 처리. 여기선 이벤트 emit
      const event = new CustomEvent('storywork:toggle-theme')
      window.dispatchEvent(event)
      showToast('테마를 변경했습니다.', 'success')
    },
  },

  // ── 파일 ──────────────────────────────────────────────────────────────────
  {
    id: 'file-download-png',
    category: 'file',
    label: 'PNG 다운로드',
    icon: Download,
    keywords: ['png', 'download', '다운로드', '이미지', 'image', 'export'],
    action: async ({ canvas, showToast }) => {
      if (!canvas) {
        showToast('캔버스가 초기화되지 않았습니다.', 'error')
        return
      }
      try {
        const { exportPng } = await import('@storywork/editor-export')
        const result = await exportPng(canvas, { scale: 2, background: '#ffffff' })
        const url = URL.createObjectURL(result.blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'storywork-export.png'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        showToast('PNG 다운로드 완료', 'success')
      } catch {
        showToast('PNG 내보내기에 실패했습니다.', 'error')
      }
    },
  },
  {
    id: 'file-download-json',
    category: 'file',
    label: 'JSON 다운로드',
    icon: FileJson,
    keywords: ['json', 'download', '다운로드', '저장', 'save', 'export'],
    action: async ({ canvas, showToast }) => {
      if (!canvas) {
        showToast('캔버스가 초기화되지 않았습니다.', 'error')
        return
      }
      try {
        const { exportJson } = await import('@storywork/editor-export')
        const json = await exportJson(canvas)
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'storywork-export.json'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        showToast('JSON 다운로드 완료', 'success')
      } catch {
        showToast('JSON 내보내기에 실패했습니다.', 'error')
      }
    },
  },
  {
    id: 'file-download-pdf',
    category: 'file',
    label: 'PDF 다운로드 (M6)',
    icon: FileType,
    keywords: ['pdf', 'download', '다운로드', '출판', 'publish', 'print'],
    action: ({ showToast }) => {
      showToast('PDF 출판은 M6에서 활성화됩니다.', 'info')
    },
    disabled: () => true,
  },

  // ── 도움 ──────────────────────────────────────────────────────────────────
  {
    id: 'help-shortcuts',
    category: 'help',
    label: '단축키 보기',
    icon: HelpCircle,
    shortcut: '?',
    keywords: ['shortcut', '단축키', 'help', '도움말', 'keyboard'],
    action: () => {
      // EditorShell 이벤트로 처리
      const event = new CustomEvent('storywork:open-shortcuts')
      window.dispatchEvent(event)
    },
  },
]
