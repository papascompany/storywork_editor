/**
 * components/mypage/ProjectsTab.tsx
 *
 * 내 작품 그리드 탭.
 * Server Component — projects 를 props 로 받아 렌더.
 *
 * 그리드:
 *  - 2xl(1536+): 6열
 *  - xl(1280+): 5열
 *  - lg(1024+): 4열
 *  - md(768+): 3열
 *  - 기본(360+): 2열
 */
import * as React from 'react'

import { EmptyState } from './EmptyState'
import { NewProjectCard, ProjectCard } from './ProjectCard'

export interface ProjectData {
  id: string
  title: string
  status: string
  thumbnail: string | null
  updatedAt: Date
  pageCount: number
}

interface ProjectsTabProps {
  projects: ProjectData[]
}

export function ProjectsTab({ projects }: ProjectsTabProps) {
  return (
    <section aria-label="내 작품 목록">
      {/* 헤더 영역 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--mkt-space-lg)',
          flexWrap: 'wrap',
          gap: 'var(--mkt-space-sm)',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: 'var(--mkt-headline-size)',
            fontWeight: 'var(--mkt-headline-weight)',
            letterSpacing: 'var(--mkt-headline-ls)',
            color: 'var(--mkt-ink)',
            margin: 0,
          }}
        >
          내 작품
        </h2>
        {projects.length > 0 && (
          <span
            style={{
              fontFamily: 'var(--mkt-font-mono)',
              fontSize: 'var(--mkt-caption-size)',
              fontWeight: 'var(--mkt-caption-weight)',
              letterSpacing: 'var(--mkt-caption-ls)',
              textTransform: 'uppercase',
              color: 'var(--mkt-ink)',
              opacity: 0.4,
            }}
          >
            {projects.length}개
          </span>
        )}
      </div>

      {/* 빈 상태 */}
      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        // 반응형 그리드 — inline style 로 CSS Grid 직접 구현
        // Tailwind 클래스 대신 CSS Grid 사용: SSR 에서 breakpoint 계산 불필요
        <div
          style={{
            display: 'grid',
            gap: 'var(--mkt-space-md)',
            gridTemplateColumns: 'repeat(2, 1fr)',
          }}
          className="projects-grid"
        >
          {/* 새 작품 만들기 카드 (항상 첫 번째) */}
          <NewProjectCard />

          {/* 작품 카드 목록 */}
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              title={project.title}
              status={project.status}
              thumbnail={project.thumbnail}
              updatedAt={project.updatedAt}
              pageCount={project.pageCount}
            />
          ))}
        </div>
      )}

      {/* 반응형 그리드 breakpoint 스타일 — <style> 태그로 삽입 */}
      <style>{`
        @media (min-width: 768px) {
          .projects-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 1024px) {
          .projects-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (min-width: 1280px) {
          .projects-grid { grid-template-columns: repeat(5, 1fr); }
        }
        @media (min-width: 1536px) {
          .projects-grid { grid-template-columns: repeat(6, 1fr); }
        }
      `}</style>
    </section>
  )
}
