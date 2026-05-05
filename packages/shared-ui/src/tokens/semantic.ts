/**
 * 편집기 전용 시맨틱 토큰
 *
 * 직접 색상값 사용 금지 — CSS 변수만 참조합니다.
 * globals.css 에서 라이트/다크 양쪽 변수가 정의됩니다.
 */
export const editorTokens = {
  // 캔버스 워크스페이스 (Canva 회색 배경)
  workspace: 'var(--editor-workspace)',
  workspaceDark: 'var(--editor-workspace-dark)',
  // 패널 (좌측/우측)
  panel: 'var(--editor-panel)',
  panelHover: 'var(--editor-panel-hover)',
  // 텍스트
  text: 'var(--editor-text)',
  textMuted: 'var(--editor-text-muted)',
  // 액센트 (브랜드)
  accent: 'var(--editor-accent)',
  // 보더
  border: 'var(--editor-border)',
  borderStrong: 'var(--editor-border-strong)',
  // 인터랙션
  hover: 'var(--editor-hover)',
  active: 'var(--editor-active)',
} as const

export type EditorTokens = typeof editorTokens
