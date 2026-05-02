export default function AdminHomePage() {
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
          fontSize: '2rem',
          fontWeight: 700,
        }}
      >
        StoryWork Admin
      </h1>
      <p style={{ color: '#6b7280' }}>관리자 콘솔 — M3에서 본격 구현 예정</p>
    </main>
  )
}
