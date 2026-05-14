'use client'

/**
 * components/mypage/ProfileTab.tsx
 *
 * 프로필 탭 — 클라이언트 컴포넌트 (폼 인터랙션).
 * 이메일(read-only), 가입일, 아바타(이니셜 fallback), 로그아웃.
 *
 * 참고: 현재 Prisma User 모델에 name/avatarUrl 필드가 없으므로
 *       이름 수정 기능은 "곧 지원" UI 만 표시.
 *       DB 확장 PR 이후 활성화.
 */

import { LogOut, Mail, Shield } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

// ─── 가입일 포맷 ──────────────────────────────────────────────────────────────

function formatJoinDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

// ─── 아바타 이니셜 ────────────────────────────────────────────────────────────

function getInitial(email: string): string {
  return (email[0] ?? '?').toUpperCase()
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

interface ProfileTabProps {
  userId: string
  email: string
  createdAt: Date
}

export function ProfileTab({ email, createdAt }: ProfileTabProps) {
  const [comingSoonVisible, setComingSoonVisible] = React.useState(false)
  const initial = getInitial(email)

  function handleDeleteAccount() {
    setComingSoonVisible(true)
    setTimeout(() => setComingSoonVisible(false), 3000)
  }

  return (
    <section aria-label="프로필 정보">
      {/* 섹션 헤더 */}
      <h2
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: 'var(--mkt-headline-size)',
          fontWeight: 'var(--mkt-headline-weight)',
          letterSpacing: 'var(--mkt-headline-ls)',
          color: 'var(--mkt-ink)',
          margin: '0 0 var(--mkt-space-lg)',
        }}
      >
        프로필
      </h2>

      {/* 프로필 카드 */}
      <div
        style={{
          backgroundColor: 'var(--mkt-canvas)',
          border: '1px solid var(--mkt-hairline)',
          borderRadius: 'var(--mkt-rounded-lg)',
          overflow: 'hidden',
          maxWidth: '540px',
        }}
      >
        {/* 아바타 + 이름/이메일 헤더 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--mkt-space-md)',
            padding: '28px 28px 24px',
            borderBottom: '1px solid var(--mkt-hairline)',
          }}
        >
          {/* 아바타 */}
          <div
            aria-hidden="true"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--mkt-rounded-full)',
              backgroundColor: 'var(--mkt-block-lilac)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '22px',
              fontWeight: 540,
              color: 'var(--mkt-ink)',
            }}
          >
            {initial}
          </div>

          <div>
            <p
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '18px',
                fontWeight: 540,
                letterSpacing: '-0.26px',
                color: 'var(--mkt-ink)',
                margin: '0 0 2px',
              }}
            >
              {email.split('@')[0]}
            </p>
            <p
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '14px',
                fontWeight: 330,
                color: 'var(--mkt-ink)',
                opacity: 0.5,
                margin: 0,
              }}
            >
              {email}
            </p>
          </div>
        </div>

        {/* 정보 항목 목록 */}
        <dl style={{ margin: 0, padding: '0 28px' }}>
          {/* 이메일 */}
          <ProfileRow
            icon={<Mail style={{ width: '16px', height: '16px' }} />}
            label="이메일"
            value={email}
            isLast={false}
          />

          {/* 가입일 */}
          <ProfileRow
            icon={<Shield style={{ width: '16px', height: '16px' }} />}
            label="가입일"
            value={formatJoinDate(createdAt)}
            isLast={true}
          />
        </dl>

        {/* 액션 영역 */}
        <div
          style={{
            padding: '20px 28px 24px',
            borderTop: '1px solid var(--mkt-hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--mkt-space-sm)',
          }}
        >
          {/* 비밀번호 변경 */}
          <Link
            href="/forgot-password"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: '44px',
              padding: '0 20px',
              borderRadius: 'var(--mkt-rounded-md)',
              border: '1px solid var(--mkt-hairline)',
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '15px',
              fontWeight: 480,
              color: 'var(--mkt-ink)',
              textDecoration: 'none',
              width: 'fit-content',
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                'var(--mkt-surface-soft)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent'
            }}
          >
            비밀번호 변경
          </Link>

          {/* 로그아웃 */}
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '44px',
                padding: '0 20px',
                borderRadius: 'var(--mkt-rounded-md)',
                border: '1px solid var(--mkt-hairline)',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '15px',
                fontWeight: 480,
                color: 'var(--mkt-ink)',
                opacity: 0.65,
                transition: 'opacity 150ms ease',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.65'
              }}
            >
              <LogOut style={{ width: '15px', height: '15px' }} aria-hidden="true" />
              로그아웃
            </button>
          </form>
        </div>
      </div>

      {/* 위험 영역 */}
      <div style={{ marginTop: 'var(--mkt-space-xxl)', maxWidth: '540px' }}>
        <p
          style={{
            fontFamily: 'var(--mkt-font-mono)',
            fontSize: '11px',
            fontWeight: 400,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            color: 'var(--mkt-ink)',
            opacity: 0.35,
            margin: '0 0 var(--mkt-space-sm)',
          }}
        >
          위험 영역
        </p>
        <div
          style={{
            backgroundColor: 'var(--mkt-canvas)',
            border: '1px solid var(--mkt-hairline)',
            borderRadius: 'var(--mkt-rounded-md)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--mkt-space-md)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '14px',
                fontWeight: 480,
                color: 'var(--mkt-ink)',
                margin: '0 0 2px',
              }}
            >
              계정 삭제
            </p>
            <p
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '13px',
                fontWeight: 330,
                color: 'var(--mkt-ink)',
                opacity: 0.5,
                margin: 0,
              }}
            >
              모든 작품과 데이터가 영구 삭제됩니다.
            </p>
          </div>
          <button
            type="button"
            disabled
            onClick={handleDeleteAccount}
            aria-label="계정 삭제 (곧 지원 예정)"
            style={{
              height: '36px',
              padding: '0 16px',
              borderRadius: 'var(--mkt-rounded-md)',
              border: '1px solid rgba(0,0,0,0.15)',
              backgroundColor: 'transparent',
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '13px',
              fontWeight: 480,
              color: 'var(--mkt-ink)',
              opacity: 0.35,
              cursor: 'not-allowed',
              whiteSpace: 'nowrap',
            }}
          >
            삭제
          </button>
        </div>

        {/* 곧 지원 토스트 대체 인라인 메시지 */}
        {comingSoonVisible && (
          <p
            role="status"
            aria-live="polite"
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '13px',
              fontWeight: 330,
              color: 'var(--mkt-ink)',
              opacity: 0.55,
              margin: 'var(--mkt-space-xs) 0 0',
            }}
          >
            계정 삭제는 곧 지원될 예정입니다.
          </p>
        )}
      </div>
    </section>
  )
}

// ─── ProfileRow 헬퍼 ──────────────────────────────────────────────────────────

function ProfileRow({
  icon,
  label,
  value,
  isLast,
}: {
  icon: React.ReactNode
  label: string
  value: string
  isLast: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--mkt-space-sm)',
        padding: '14px 0',
        borderBottom: isLast ? 'none' : '1px solid var(--mkt-hairline)',
      }}
    >
      <span aria-hidden="true" style={{ color: 'var(--mkt-ink)', opacity: 0.4, flexShrink: 0 }}>
        {icon}
      </span>
      <dt
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '13px',
          fontWeight: 480,
          color: 'var(--mkt-ink)',
          opacity: 0.5,
          width: '80px',
          flexShrink: 0,
          margin: 0,
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '14px',
          fontWeight: 330,
          color: 'var(--mkt-ink)',
          margin: 0,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </dd>
    </div>
  )
}
