export default function HomePage() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        gap: '1rem',
        padding: '2rem',
      }}
    >
      <h1
        style={{
          fontSize: '2.5rem',
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
      >
        StoryWork
      </h1>
      <p
        style={{
          fontSize: '1.125rem',
          color: '#6b7280',
          textAlign: 'center',
          maxWidth: '480px',
        }}
      >
        AI 스토리보드 편집기 — 대본에서 POD 출판까지
      </p>
      <p
        style={{
          fontSize: '0.875rem',
          color: '#9ca3af',
          padding: '0.5rem 1rem',
          border: '1px solid #e5e7eb',
          borderRadius: '0.375rem',
        }}
      >
        M0 부트스트랩 완료 — M1 편집기 코어 진행 중
      </p>
    </main>
  )
}
