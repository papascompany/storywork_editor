'use client'

// ─────────────────────────────────────────────
// EditorShellClient — /editor 동적 로드 경계 (PERF-WEB-03)
// ─────────────────────────────────────────────
// EditorShell 은 fabric.js + 모노레포 editor-* 패키지 8개를 정적으로 끌어와
// /editor 라우트 First Load JS 를 590KB(gzip) 까지 키웠다 (audit 2026-06-05).
//
// 편집기는 fabric 이 window 에 의존해 어차피 클라이언트 전용이므로,
// next/dynamic({ ssr: false }) 로 감싸 별도 async 청크로 분리한다.
//   - 라우트 초기 First Load JS = 셸 스켈레톤 + 프레임워크 base 만 남고
//   - fabric/editor-* 는 마운트 직후 비동기 로드된다.
//
// ssr:false 는 서버 컴포넌트(page.tsx)에서 직접 호출할 수 없어
// 이 'use client' 래퍼를 거친다.

import dynamic from 'next/dynamic'

const EditorShell = dynamic(() => import('./EditorShell').then((m) => m.EditorShell), {
  ssr: false,
  loading: () => <EditorSkeleton />,
})

/**
 * 편집기 chrome 형태의 로딩 스켈레톤.
 * fabric/editor 청크 로드 동안 노출되며, 레이아웃 시프트(CLS)를 최소화하기 위해
 * 실제 EditorShell 의 골격(TopBar + ToolBar | Sidebar | Canvas | RightPanel)을 흉내낸다.
 * 무거운 import 없이 div 만 사용한다.
 */
function EditorSkeleton() {
  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-[var(--editor-panel,var(--color-surface))]"
      role="status"
      aria-label="편집기 불러오는 중"
      aria-busy="true"
    >
      {/* TopBar — 실제와 동일한 높이(h-12 md:h-14) */}
      <div className="h-12 shrink-0 border-b border-[var(--editor-border)] bg-[var(--editor-panel)] md:h-14" />

      {/* 중앙 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* ToolBar — 데스크톱 only */}
        <div className="hidden w-14 shrink-0 border-r border-[var(--editor-border)] bg-[var(--editor-panel)] md:block" />
        {/* FeatureSidebar — 데스크톱 only */}
        <div className="hidden w-64 shrink-0 border-r border-[var(--editor-border)] bg-[var(--editor-panel)] md:block" />

        {/* Canvas 작업 영역 */}
        <div className="flex flex-1 items-center justify-center bg-[var(--editor-workspace)]">
          <span className="animate-pulse text-sm text-[var(--editor-text-muted)]">
            편집기 불러오는 중…
          </span>
        </div>

        {/* RightPanel — 데스크톱 only */}
        <div className="hidden w-72 shrink-0 border-l border-[var(--editor-border)] bg-[var(--editor-panel)] md:block" />
      </div>
    </div>
  )
}

export function EditorShellClient() {
  return <EditorShell />
}
