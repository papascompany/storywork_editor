'use client'

/**
 * components/mypage/MyPageShell.tsx
 *
 * 마이페이지 탭 셸 — 클라이언트 컴포넌트 (URL query param 탭 동기화).
 *
 * 레이아웃:
 *  - 데스크톱(1280+): 좌측 세로 탭 사이드바
 *  - 모바일/태블릿(<1280): 상단 가로 탭 (sticky)
 *
 * URL: ?tab=projects|profile|billing|my-data
 */

import { CreditCard, FolderOpen, Library, User } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'

import { BillingTab } from './BillingTab'
import { MyDataTab } from './MyDataTab'
import { ProfileTab } from './ProfileTab'
import { ProjectsTab } from './ProjectsTab'
import type { ProjectData } from './ProjectsTab'

// ─── 탭 정의 ──────────────────────────────────────────────────────────────────

type TabId = 'projects' | 'profile' | 'billing' | 'my-data'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'projects', label: '내 작품', icon: FolderOpen },
  { id: 'profile', label: '프로필', icon: User },
  { id: 'billing', label: '결제·구독', icon: CreditCard },
  { id: 'my-data', label: '마이데이터', icon: Library },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface MyPageShellProps {
  userId: string
  email: string
  createdAt: Date
  projects: ProjectData[]
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function MyPageShell({ userId, email, createdAt, projects }: MyPageShellProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawTab = searchParams.get('tab') ?? 'projects'
  const activeTab: TabId = TABS.some((t) => t.id === rawTab) ? (rawTab as TabId) : 'projects'

  function handleTabChange(tabId: TabId) {
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.set('tab', tabId)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  // 현재 탭 콘텐츠 렌더
  function renderTab() {
    switch (activeTab) {
      case 'projects':
        return <ProjectsTab projects={projects} />
      case 'profile':
        return <ProfileTab userId={userId} email={email} createdAt={createdAt} />
      case 'billing':
        return <BillingTab />
      case 'my-data':
        return <MyDataTab />
    }
  }

  return (
    <>
      {/* ─── 모바일/태블릿: 상단 sticky 탭 (<1280) ─── */}
      <div
        className="mypage-top-tabs"
        role="tablist"
        aria-label="마이페이지 탭"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'var(--mkt-canvas)',
          borderBottom: '1px solid var(--mkt-hairline)',
          display: 'flex',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === activeTab
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${id}`}
              id={`tab-${id}`}
              onClick={() => handleTabChange(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '48px',
                padding: '0 16px',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--mkt-ink)' : '2px solid transparent',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '14px',
                fontWeight: isActive ? 540 : 330,
                color: 'var(--mkt-ink)',
                opacity: isActive ? 1 : 0.5,
                transition: 'opacity 150ms ease, border-color 150ms ease',
                flexShrink: 0,
                outline: 'none',
              }}
              onFocus={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 0 0 2px var(--mkt-ink) inset'
              }}
              onBlur={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
              }}
            >
              <Icon style={{ width: '15px', height: '15px' }} aria-hidden="true" />
              {label}
            </button>
          )
        })}
      </div>

      {/* ─── 데스크톱: 사이드 탭 + 콘텐츠 (1280+) ─── */}
      <div className="mypage-desktop-layout" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* 사이드 탭 (데스크톱만) */}
        <aside
          className="mypage-sidebar"
          aria-label="마이페이지 탭"
          style={{
            width: '200px',
            flexShrink: 0,
            borderRight: '1px solid var(--mkt-hairline)',
            paddingTop: 'var(--mkt-space-xl)',
            paddingBottom: 'var(--mkt-space-xl)',
            display: 'none', // 기본 숨김, 1280+ 에서 표시 (CSS 미디어쿼리)
          }}
        >
          <nav
            role="tablist"
            aria-label="마이페이지 탭"
            style={{ padding: '0 var(--mkt-space-md)' }}
          >
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = id === activeTab
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${id}`}
                  id={`sidetab-${id}`}
                  onClick={() => handleTabChange(id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    height: '44px',
                    padding: '0 12px',
                    border: 'none',
                    borderRadius: 'var(--mkt-rounded-md)',
                    backgroundColor: isActive ? 'var(--mkt-hairline-soft)' : 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'var(--mkt-font-sans)',
                    fontSize: '14px',
                    fontWeight: isActive ? 540 : 330,
                    color: 'var(--mkt-ink)',
                    opacity: isActive ? 1 : 0.55,
                    transition: 'opacity 150ms ease, background-color 150ms ease',
                    textAlign: 'left',
                    outline: 'none',
                    marginBottom: '2px',
                  }}
                  onFocus={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                      '0 0 0 2px var(--mkt-ink)'
                  }}
                  onBlur={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.85'
                      ;(e.currentTarget as HTMLButtonElement).style.backgroundColor =
                        'var(--mkt-surface-soft)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.55'
                      ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <Icon
                    style={{ width: '16px', height: '16px', flexShrink: 0 }}
                    aria-hidden="true"
                  />
                  {label}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* 콘텐츠 영역 */}
        <main
          id={`tabpanel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--mkt-space-xl)',
          }}
        >
          {renderTab()}
        </main>
      </div>

      {/* 반응형 CSS */}
      <style>{`
        /* 1280+ 에서 상단 탭 숨기고 사이드바 표시 */
        @media (min-width: 1280px) {
          .mypage-top-tabs { display: none !important; }
          .mypage-sidebar { display: block !important; }
        }
        /* 스크롤바 숨김 (상단 탭 가로 스크롤) */
        .mypage-top-tabs::-webkit-scrollbar { display: none; }
        /* 탭 패널 focus-visible */
        [role="tabpanel"]:focus-visible {
          outline: 2px solid var(--mkt-ink);
          outline-offset: -2px;
        }
      `}</style>
    </>
  )
}
