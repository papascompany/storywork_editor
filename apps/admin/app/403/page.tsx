import Link from 'next/link'

export default function ForbiddenPage() {
  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center px-4 py-16"
      style={{ backgroundColor: 'var(--mkt-surface-soft)', fontFamily: 'var(--mkt-font-sans)' }}
    >
      {/* 컬러블록 강조 영역 */}
      <div
        className="w-full max-w-lg text-center"
        style={{
          backgroundColor: 'var(--mkt-block-pink)',
          borderRadius: 'var(--mkt-rounded-lg)',
          padding: '48px 40px',
          marginBottom: '32px',
        }}
      >
        {/* 에러 코드 eyebrow */}
        <p
          style={{
            fontFamily: 'var(--mkt-font-mono)',
            fontSize: '12px',
            fontWeight: 400,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            color: 'var(--mkt-ink)',
            opacity: 0.5,
            marginBottom: '16px',
          }}
        >
          HTTP 403 — Forbidden
        </p>

        <h1
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 340,
            lineHeight: 1.1,
            letterSpacing: '-0.96px',
            color: 'var(--mkt-ink)',
            marginBottom: '16px',
            wordBreak: 'keep-all',
          }}
        >
          접근 권한 없음
        </h1>

        <p
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '18px',
            fontWeight: 320,
            lineHeight: 1.45,
            letterSpacing: '-0.26px',
            color: 'var(--mkt-ink)',
            opacity: 0.7,
            maxWidth: '340px',
            margin: '0 auto',
            wordBreak: 'keep-all',
          }}
        >
          이 페이지에 접근할 권한이 없습니다. 관리자 계정으로 로그인하거나 권한을 확인하세요.
        </p>
      </div>

      {/* 액션 버튼 */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <Link
          href="/login"
          className="mkt-btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          로그인 페이지로
        </Link>
        <a
          href="mailto:yohan73@gmail.com"
          className="mkt-btn-secondary"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          권한 요청하기
        </a>
      </div>
    </main>
  )
}
