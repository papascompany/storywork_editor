/**
 * apps/web/app/mypage/loading.tsx
 *
 * 마이페이지 로딩 스켈레톤.
 * Next.js Suspense boundary 에서 자동 사용.
 */
import * as React from 'react'

function SkeletonBlock({
  width = '100%',
  height = '16px',
  radius = '4px',
  opacity = 0.08,
}: {
  width?: string
  height?: string
  radius?: string
  opacity?: number
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: `rgba(0,0,0,${opacity})`,
        animation: 'skeleton-pulse 1.6s ease-in-out infinite',
      }}
    />
  )
}

export default function MyPageLoading() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--mkt-surface-soft)',
        fontFamily: 'var(--mkt-font-sans)',
      }}
      aria-label="마이페이지 로딩 중"
      aria-busy="true"
    >
      {/* 상단 탭 스켈레톤 */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          backgroundColor: 'var(--mkt-canvas)',
          borderBottom: '1px solid var(--mkt-hairline)',
          display: 'flex',
          gap: 'var(--mkt-space-md)',
          padding: '0 var(--mkt-space-lg)',
          height: '48px',
          alignItems: 'center',
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} width="72px" height="20px" />
        ))}
      </div>

      {/* 콘텐츠 영역 */}
      <div
        style={{
          maxWidth: 'var(--mkt-max-width)',
          margin: '0 auto',
          padding: 'var(--mkt-space-xl)',
        }}
      >
        {/* 헤더 */}
        <SkeletonBlock width="180px" height="28px" radius="6px" />
        <div style={{ height: 'var(--mkt-space-xl)' }} />

        {/* 작품 그리드 스켈레톤 — 6개 카드 */}
        <div
          style={{
            display: 'grid',
            gap: 'var(--mkt-space-md)',
            gridTemplateColumns: 'repeat(2, 1fr)',
          }}
          className="skeleton-grid"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                backgroundColor: 'var(--mkt-canvas)',
                border: '1px solid var(--mkt-hairline)',
                borderRadius: 'var(--mkt-rounded-md)',
                overflow: 'hidden',
              }}
            >
              {/* 썸네일 */}
              <div style={{ aspectRatio: '4 / 3' }}>
                <SkeletonBlock width="100%" height="100%" radius="0" opacity={0.05} />
              </div>
              {/* 메타 */}
              <div
                style={{
                  padding: '10px 12px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <SkeletonBlock width="70%" height="14px" />
                <SkeletonBlock width="45%" height="12px" opacity={0.05} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes skeleton-pulse {
            0%, 100% { opacity: 1; }
          }
        }
        @media (min-width: 768px) {
          .skeleton-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 1024px) {
          .skeleton-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (min-width: 1280px) {
          .skeleton-grid { grid-template-columns: repeat(5, 1fr); }
        }
        @media (min-width: 1536px) {
          .skeleton-grid { grid-template-columns: repeat(6, 1fr); }
        }
      `}</style>
    </div>
  )
}
