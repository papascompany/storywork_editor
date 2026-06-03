/**
 * /editor/import — 대본 임포트 Wizard 페이지 (M4-04 Step 2)
 *
 * 사용자 흐름:
 *   1. 대본 입력 + 판형 선택
 *   2. 판형 + 형식 자동감지 확인
 *   3. 캐릭터 매핑 (자동 추출 + 더미맨 기본)
 *   4. "자동 생성" → 페이지 N개 미리보기 + warnings
 *   5. "편집기에서 열기" → /editor?projectId=...
 *
 * 서버 컴포넌트 — ScriptImporterShell 은 'use client'
 */

import type { Metadata } from 'next'

import { ScriptImporterShell } from '../../../components/editor/script-importer/ScriptImporterShell'

export const metadata: Metadata = {
  title: '대본으로 시작하기 — StoryWork',
  description: '대본을 붙여넣으면 AI 가 자동으로 스토리보드 페이지를 생성합니다.',
}

export default function EditorImportPage() {
  return <ScriptImporterShell />
}
