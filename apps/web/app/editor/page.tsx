// ─────────────────────────────────────────────
// /editor — 편집기 셸 라우트
// ─────────────────────────────────────────────
// Next.js 15 App Router — 이 파일은 Server Component.
// EditorShell 은 'use client' 로 선언되어 있어 자동으로 클라이언트 컴포넌트로 렌더된다.

import type { Metadata } from 'next'

import { EditorShell } from '../../components/editor/EditorShell'

export const metadata: Metadata = {
  title: '편집기 — StoryWork',
  description: 'AI 스토리보드 편집기',
}

export default function EditorPage() {
  return <EditorShell />
}
