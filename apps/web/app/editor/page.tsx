// ─────────────────────────────────────────────
// /editor — 편집기 셸 라우트
// ─────────────────────────────────────────────
// Next.js 15 App Router — 이 파일은 Server Component.
// EditorShellClient 가 EditorShell 을 next/dynamic({ ssr: false }) 로 lazy 로드해
// fabric.js + editor-* 패키지를 라우트 First Load JS 에서 분리한다 (PERF-WEB-03).

import type { Metadata } from 'next'

import { EditorShellClient } from '../../components/editor/EditorShellClient'

export const metadata: Metadata = {
  title: '편집기 — StoryWork',
  description: 'AI 스토리보드 편집기',
}

export default function EditorPage() {
  return <EditorShellClient />
}
