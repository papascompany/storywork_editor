const SKELETON_STYLE = {
  backgroundColor: 'var(--nike-hairline-soft)',
  borderRadius: 'var(--nike-rounded-md)',
  opacity: 0.7,
} as const

function SkeletonBlock({ height, width = '100%' }: { height: number; width?: string }) {
  return <div aria-hidden="true" style={{ ...SKELETON_STYLE, height, width }} />
}

export default function DashboardLoading() {
  return (
    <div className="nike-page" aria-label="페이지 로딩 중">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div style={{ width: 'min(100%, 360px)' }}>
          <SkeletonBlock height={40} width="72%" />
          <div style={{ height: 8 }} />
          <SkeletonBlock height={16} width="46%" />
        </div>
        <SkeletonBlock height={40} width="132px" />
      </header>

      <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: 'var(--nike-canvas)',
              border: '1px solid var(--nike-hairline-soft)',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <SkeletonBlock height={14} width="48%" />
            <div style={{ height: 16 }} />
            <SkeletonBlock height={36} width="38%" />
            <div style={{ height: 12 }} />
            <SkeletonBlock height={12} width="58%" />
          </div>
        ))}
      </section>

      <section
        style={{
          backgroundColor: 'var(--nike-canvas)',
          border: '1px solid var(--nike-hairline-soft)',
          borderRadius: '12px',
          padding: '24px',
        }}
      >
        <SkeletonBlock height={24} width="180px" />
        <div style={{ height: 20 }} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }, (_, idx) => (
            <SkeletonBlock key={idx} height={72} />
          ))}
        </div>
      </section>
    </div>
  )
}
