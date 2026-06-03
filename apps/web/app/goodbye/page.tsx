/**
 * /goodbye — 탈퇴 완료 안내 페이지
 *
 * 탈퇴 처리 후 또는 deletedAt != null 인 사용자가 보호 페이지에 접근 시
 * 미들웨어에 의해 리다이렉트.
 *
 * LEGAL-OPS-03
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import * as React from 'react'

import { Header } from '@/components/marketing/Header'

export const metadata: Metadata = {
  title: '탈퇴 완료 | StoryWork',
  description: '회원 탈퇴가 처리되었습니다.',
  robots: { index: false, follow: false },
}

export default function GoodbyePage() {
  return (
    <div style={{ backgroundColor: 'var(--mkt-canvas)', minHeight: '100dvh' }}>
      <Header />

      <main
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: 'var(--mkt-space-section) var(--mkt-space-xl)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 'var(--mkt-space-xl)',
        }}
      >
        {/* 아이콘 */}
        <div
          aria-hidden="true"
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: 'var(--mkt-surface-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
          }}
        >
          &#x1F44B;
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-md)' }}>
          <h1 className="mkt-display-lg" style={{ color: 'var(--mkt-ink)' }}>
            탈퇴 처리가 완료되었습니다
          </h1>

          <p className="mkt-body" style={{ color: 'var(--mkt-ink)', opacity: 0.7 }}>
            StoryWork 를 이용해 주셔서 감사합니다.
          </p>
        </div>

        {/* 안내 카드 */}
        <div
          style={{
            width: '100%',
            backgroundColor: 'var(--mkt-surface-soft)',
            borderRadius: 'var(--mkt-rounded-lg)',
            padding: 'var(--mkt-space-xl)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--mkt-space-md)',
            textAlign: 'left',
          }}
        >
          <h2
            className="mkt-headline"
            style={{ color: 'var(--mkt-ink)', marginBottom: 'var(--mkt-space-sm)' }}
          >
            안내 사항
          </h2>

          {[
            {
              title: '30일간 복원 가능',
              desc: '탈퇴 후 30일 이내에는 관리자에게 문의하시면 계정을 복원할 수 있습니다.',
            },
            {
              title: '30일 후 영구 삭제',
              desc: '30일이 지나면 모든 작품, 데이터, 계정 정보가 영구적으로 삭제됩니다.',
            },
            {
              title: '구독 자동 해지',
              desc: '진행 중인 구독이 있다면 자동으로 해지 처리됩니다.',
            },
          ].map(({ title, desc }) => (
            <div
              key={title}
              style={{ display: 'flex', gap: 'var(--mkt-space-md)', alignItems: 'flex-start' }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--mkt-hairline)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                i
              </span>
              <div>
                <p
                  className="mkt-body-sm"
                  style={{ color: 'var(--mkt-ink)', fontWeight: 540, marginBottom: '2px' }}
                >
                  {title}
                </p>
                <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', opacity: 0.65 }}>
                  {desc}
                </p>
              </div>
            </div>
          ))}

          <p
            className="mkt-body-sm"
            style={{
              color: 'var(--mkt-ink)',
              opacity: 0.55,
              marginTop: 'var(--mkt-space-sm)',
              borderTop: '1px solid var(--mkt-hairline)',
              paddingTop: 'var(--mkt-space-md)',
            }}
          >
            복원 문의:{' '}
            <a
              href="mailto:support@storywork.kr"
              style={{ color: 'var(--mkt-ink)', fontWeight: 540 }}
            >
              support@storywork.kr
            </a>
          </p>
        </div>

        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: '44px',
            padding: '0 var(--mkt-space-xl)',
            backgroundColor: 'var(--mkt-ink)',
            color: 'var(--mkt-canvas)',
            borderRadius: 'var(--mkt-rounded-md)',
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '14px',
            fontWeight: 540,
            textDecoration: 'none',
            transition: 'opacity 120ms ease',
          }}
          className="hover:opacity-80"
        >
          홈으로 돌아가기
        </Link>
      </main>
    </div>
  )
}
