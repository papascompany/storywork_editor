/**
 * apps/web/app/(auth)/signup/check-email/page.tsx
 *
 * 회원가입 후 이메일 인증 안내 페이지.
 * 이메일 인증 완료 후 /auth/callback 을 거쳐 로그인됩니다.
 */
import Link from 'next/link'

export default function CheckEmailPage() {
  return (
    <div style={{ width: '100%', maxWidth: '420px' }}>
      {/* 카드 */}
      <div
        style={{
          backgroundColor: 'var(--mkt-canvas)',
          borderRadius: 'var(--mkt-rounded-lg)',
          border: '1px solid var(--mkt-hairline)',
          padding: '40px 36px',
          textAlign: 'center',
        }}
      >
        {/* 아이콘 */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--mkt-rounded-full)',
            backgroundColor: 'var(--mkt-block-mint)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
          aria-hidden="true"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--mkt-semantic-success)' }}
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>

        {/* 타이틀 */}
        <h1
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: 'clamp(22px, 4vw, 28px)',
            fontWeight: 340,
            lineHeight: 1.15,
            letterSpacing: '-0.56px',
            color: 'var(--mkt-ink)',
            margin: '0 0 12px',
          }}
        >
          이메일을 확인하세요
        </h1>

        {/* 설명 */}
        <p
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '15px',
            fontWeight: 330,
            lineHeight: 1.6,
            letterSpacing: '-0.14px',
            color: 'var(--mkt-ink)',
            opacity: 0.6,
            margin: '0 0 28px',
          }}
        >
          가입하신 이메일로 인증 링크를 보냈습니다.
          <br />
          링크를 클릭하면 로그인이 완료됩니다.
        </p>

        {/* 안내 박스 */}
        <div
          style={{
            backgroundColor: 'var(--mkt-surface-soft)',
            borderRadius: 'var(--mkt-rounded-md)',
            padding: '14px 16px',
            marginBottom: '28px',
            textAlign: 'left',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '13px',
              fontWeight: 330,
              lineHeight: 1.6,
              color: 'var(--mkt-ink)',
              opacity: 0.6,
              margin: 0,
            }}
          >
            받은 편지함에 이메일이 없다면 스팸함도 확인해 보세요.
            <br />
            링크는 24시간 동안 유효합니다.
          </p>
        </div>

        {/* 로그인 링크 */}
        <Link
          href="/login"
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '14px',
            fontWeight: 480,
            color: 'var(--mkt-ink)',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            opacity: 0.6,
          }}
        >
          로그인 페이지로 돌아가기
        </Link>
      </div>
    </div>
  )
}
