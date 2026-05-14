/**
 * apps/web/app/mypage/page.tsx
 *
 * 마이페이지 — placeholder (다음 PR 에서 본체 구현).
 * 미인증 접근 시 middleware 가 /login?next=/mypage 로 리다이렉트.
 * 인증된 사용자는 이 페이지 도달.
 */
import { redirect } from 'next/navigation'

import { createWebServerClient } from '@/lib/supabase/server'

export const metadata = {
  title: '마이페이지',
}

export default async function MyPage() {
  const supabase = await createWebServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 미인증 → 로그인 (미들웨어 가드 백업)
  if (!user) {
    redirect('/login?next=/mypage')
  }

  const displayName = user.email?.split('@')[0] ?? '사용자'

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--mkt-surface-soft)',
        fontFamily: 'var(--mkt-font-sans)',
        padding: 'var(--mkt-space-xl)',
      }}
    >
      <div
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          paddingTop: 'var(--mkt-space-xxl)',
        }}
      >
        {/* 카드 */}
        <div
          style={{
            backgroundColor: 'var(--mkt-canvas)',
            borderRadius: 'var(--mkt-rounded-lg)',
            border: '1px solid var(--mkt-hairline)',
            padding: '40px 36px',
          }}
        >
          {/* 아바타 + 이름 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--mkt-space-md)',
              marginBottom: 'var(--mkt-space-xl)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--mkt-rounded-full)',
                backgroundColor: 'var(--mkt-ink)',
                color: 'var(--mkt-canvas)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '20px',
                fontWeight: 540,
                textTransform: 'uppercase',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {displayName[0]}
            </div>
            <div>
              <p
                style={{
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '18px',
                  fontWeight: 540,
                  letterSpacing: '-0.26px',
                  color: 'var(--mkt-ink)',
                  margin: 0,
                }}
              >
                {displayName}
              </p>
              <p
                style={{
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '14px',
                  fontWeight: 330,
                  color: 'var(--mkt-ink)',
                  opacity: 0.5,
                  margin: '2px 0 0',
                }}
              >
                {user.email}
              </p>
            </div>
          </div>

          {/* 준비 중 안내 */}
          <div
            style={{
              backgroundColor: 'var(--mkt-surface-soft)',
              borderRadius: 'var(--mkt-rounded-md)',
              padding: '24px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '16px',
                fontWeight: 330,
                lineHeight: 1.6,
                color: 'var(--mkt-ink)',
                opacity: 0.6,
                margin: '0 0 8px',
              }}
            >
              마이페이지 본체 준비 중입니다.
            </p>
            <p
              style={{
                fontFamily: 'var(--mkt-font-mono)',
                fontSize: '12px',
                fontWeight: 400,
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                color: 'var(--mkt-ink)',
                opacity: 0.3,
                margin: 0,
              }}
            >
              Coming soon — Next PR
            </p>
          </div>

          {/* 로그아웃 */}
          <div style={{ marginTop: 'var(--mkt-space-xl)', textAlign: 'right' }}>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                style={{
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '14px',
                  fontWeight: 480,
                  color: 'var(--mkt-ink)',
                  opacity: 0.55,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  padding: 0,
                }}
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
