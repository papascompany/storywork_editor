/**
 * /legal/refund — 환불 정책 placeholder
 *
 * M7 결제 미구현 기간 중 임시 placeholder.
 * 결제 기능 활성 시 정식 환불 정책으로 교체 (FOLLOWUP-59 연계).
 *
 * LEGAL-OPS-03 Step 5
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import * as React from 'react'

import { Footer } from '../../../components/marketing/Footer'
import { Header } from '../../../components/marketing/Header'

export const metadata: Metadata = {
  title: '환불 정책',
  description: '스토리워크 환불 정책입니다. 현재 베타 서비스 기간 중이며 결제 기능이 미활성입니다.',
  robots: { index: false, follow: false },
}

const EFFECTIVE_DATE = '2026년 6월 1일'
const CONTACT_EMAIL = 'support@storywork.kr'

export default function RefundPage() {
  return (
    <div style={{ backgroundColor: 'var(--mkt-canvas)' }}>
      <Header />

      <main
        style={{
          maxWidth: '760px',
          margin: '0 auto',
          padding: 'var(--mkt-space-section) var(--mkt-space-xl)',
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            marginBottom: 'var(--mkt-space-xxl)',
            paddingBottom: 'var(--mkt-space-xxl)',
            borderBottom: '1px solid var(--mkt-hairline)',
          }}
        >
          <p
            className="mkt-caption"
            style={{ color: 'var(--mkt-ink)', opacity: 0.45, marginBottom: 'var(--mkt-space-md)' }}
          >
            법적 고지
          </p>
          <h1
            className="mkt-display-lg"
            style={{ color: 'var(--mkt-ink)', marginBottom: 'var(--mkt-space-lg)' }}
          >
            환불 정책
          </h1>

          {/* 베타 배너 */}
          <div
            style={{
              backgroundColor: 'var(--mkt-block-cream)',
              borderRadius: 'var(--mkt-rounded-md)',
              padding: 'var(--mkt-space-md) var(--mkt-space-lg)',
              display: 'flex',
              gap: 'var(--mkt-space-sm)',
              alignItems: 'flex-start',
            }}
          >
            <span style={{ fontSize: '16px', flexShrink: 0 }} aria-hidden="true">
              &#9888;
            </span>
            <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', opacity: 0.8 }}>
              <strong>베타 서비스 안내</strong> — 현재 StoryWork 는 결제 기능이 미활성 상태입니다.
              결제 기능 활성화 전까지 본 환불 정책은 적용되지 않습니다. (FOLLOWUP-59)
            </p>
          </div>

          <p
            className="mkt-body-sm"
            style={{ color: 'var(--mkt-ink)', opacity: 0.55, marginTop: 'var(--mkt-space-md)' }}
          >
            시행일: {EFFECTIVE_DATE}
          </p>
        </div>

        {/* 본문 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-xxl)' }}>
          <section>
            <h2
              className="mkt-headline"
              style={{ color: 'var(--mkt-ink)', marginBottom: 'var(--mkt-space-md)' }}
            >
              1. 결제 서비스 현황
            </h2>
            <p className="mkt-body" style={{ color: 'var(--mkt-ink)', opacity: 0.75 }}>
              StoryWork 는 현재 베타 서비스 기간으로, 유료 구독 및 결제 기능이 활성화되지
              않았습니다. 모든 기능을 무료로 이용할 수 있으며, 결제 관련 분쟁이 발생하지 않습니다.
            </p>
          </section>

          <section>
            <h2
              className="mkt-headline"
              style={{ color: 'var(--mkt-ink)', marginBottom: 'var(--mkt-space-md)' }}
            >
              2. 향후 환불 정책 (예고)
            </h2>
            <p
              className="mkt-body"
              style={{
                color: 'var(--mkt-ink)',
                opacity: 0.75,
                marginBottom: 'var(--mkt-space-md)',
              }}
            >
              결제 기능 활성화 시 다음 기준으로 환불 정책을 적용할 예정입니다. (확정 전 변경 가능)
            </p>
            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--mkt-space-xs)',
                paddingLeft: 'var(--mkt-space-lg)',
              }}
            >
              {[
                '구독 결제 후 7일 이내: 전액 환불 (미사용 조건)',
                '구독 기간 중 해지: 잔여 기간 비율 환불 (사용량 차감)',
                '일회성 결제(PDF 출판): 다운로드 전 취소 시 전액 환불',
                '이용약관 위반으로 인한 강제 해지: 환불 불가',
              ].map((item) => (
                <li key={item}>
                  <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', opacity: 0.75 }}>
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2
              className="mkt-headline"
              style={{ color: 'var(--mkt-ink)', marginBottom: 'var(--mkt-space-md)' }}
            >
              3. 문의
            </h2>
            <p className="mkt-body" style={{ color: 'var(--mkt-ink)', opacity: 0.75 }}>
              환불 관련 문의는{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                style={{ color: 'var(--mkt-ink)', fontWeight: 560 }}
              >
                {CONTACT_EMAIL}
              </a>
              로 이메일 문의 부탁드립니다.
            </p>
          </section>

          {/* 탐색 */}
          <div
            style={{
              display: 'flex',
              gap: 'var(--mkt-space-md)',
              paddingTop: 'var(--mkt-space-lg)',
              borderTop: '1px solid var(--mkt-hairline)',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href="/legal/terms"
              className="mkt-body-sm"
              style={{ color: 'var(--mkt-ink)', textDecoration: 'none', opacity: 0.65 }}
            >
              서비스 이용약관 →
            </Link>
            <Link
              href="/legal/privacy"
              className="mkt-body-sm"
              style={{ color: 'var(--mkt-ink)', textDecoration: 'none', opacity: 0.65 }}
            >
              개인정보처리방침 →
            </Link>
            <Link
              href="/"
              className="mkt-body-sm"
              style={{ color: 'var(--mkt-ink)', textDecoration: 'none', opacity: 0.65 }}
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
