/**
 * /legal/terms — 서비스 이용약관 placeholder
 *
 * FOLLOWUP-59: 법무 검토 후 정식 약관으로 교체 예정.
 * 이 페이지는 베타 서비스 기간 중 임시 placeholder 입니다.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import * as React from 'react'

import { Footer } from '../../../components/marketing/Footer'
import { Header } from '../../../components/marketing/Header'

export const metadata: Metadata = {
  title: '서비스 이용약관',
  description: '스토리워크 서비스 이용약관입니다. 베타 서비스 기간 중 적용되는 임시 약관입니다.',
  robots: { index: false, follow: false },
}

const EFFECTIVE_DATE = '2026년 6월 1일'
const COMPANY_NAME = '스토리워크'
const CONTACT_EMAIL = 'legal@storywork.kr'

export default function TermsPage() {
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
            서비스 이용약관
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
              ⚠
            </span>
            <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', opacity: 0.8 }}>
              <strong>베타 서비스 약관 안내</strong> — 본 약관은 베타 서비스 기간 중 적용되는 임시
              약관입니다. 정식 출시 전 법무 검토를 거쳐 변경될 수 있습니다. (FOLLOWUP-59)
            </p>
          </div>

          <p
            className="mkt-body-sm"
            style={{ color: 'var(--mkt-ink)', opacity: 0.55, marginTop: 'var(--mkt-space-md)' }}
          >
            시행일: {EFFECTIVE_DATE}
          </p>
        </div>

        {/* 약관 본문 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-xxl)' }}>
          <LegalSection title="제1조 (목적)">
            <p className="mkt-body" style={{ color: 'var(--mkt-ink)', opacity: 0.75 }}>
              본 약관은 {COMPANY_NAME}(이하 "회사")가 제공하는 스토리워크 서비스(이하 "서비스")의
              이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 서비스 이용조건 등 기본적인
              사항을 규정함을 목적으로 합니다.
            </p>
          </LegalSection>

          <LegalSection title="제2조 (정의)">
            <p
              className="mkt-body"
              style={{
                color: 'var(--mkt-ink)',
                opacity: 0.75,
                marginBottom: 'var(--mkt-space-md)',
              }}
            >
              본 약관에서 사용하는 주요 용어의 정의는 다음과 같습니다.
            </p>
            <dl style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-sm)' }}>
              {[
                ['서비스', 'AI 스토리보드 편집기 및 POD 출판 관련 제반 서비스'],
                ['이용자', '서비스에 접속하여 이 약관에 따라 서비스를 이용하는 자'],
                ['회원', '이 약관에 동의하고 이메일 등을 통해 회원가입을 완료한 이용자'],
                [
                  '콘텐츠',
                  '이용자가 서비스 내에서 작성·업로드·생성한 스토리보드, 이미지, 텍스트 등',
                ],
                ['포즈 라이브러리', '회사가 제공하는 캐릭터 포즈 이미지 자산 모음'],
              ].map(([term, def]) => (
                <div key={term}>
                  <dt
                    className="mkt-body-sm"
                    style={{ color: 'var(--mkt-ink)', fontWeight: 560, display: 'inline' }}
                  >
                    {term}:{' '}
                  </dt>
                  <dd
                    className="mkt-body-sm"
                    style={{ color: 'var(--mkt-ink)', opacity: 0.7, display: 'inline' }}
                  >
                    {def}
                  </dd>
                </div>
              ))}
            </dl>
          </LegalSection>

          <LegalSection title="제3조 (이용 규칙)">
            <p
              className="mkt-body"
              style={{
                color: 'var(--mkt-ink)',
                opacity: 0.75,
                marginBottom: 'var(--mkt-space-md)',
              }}
            >
              이용자는 다음 행위를 해서는 안 됩니다.
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
                '타인의 개인정보, 이메일 등을 무단으로 수집하는 행위',
                '서비스의 정상적인 운영을 방해하는 행위',
                '회사의 저작권, 지식재산권을 침해하는 행위',
                '포즈 라이브러리 자산을 서비스 외부에서 무단으로 사용하는 행위',
                '관계 법령을 위반하거나 미풍양속을 저해하는 콘텐츠를 업로드하는 행위',
                '그 밖에 회사가 서비스 운영에 부적합하다고 판단하는 행위',
              ].map((item) => (
                <li key={item}>
                  <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', opacity: 0.75 }}>
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          </LegalSection>

          <LegalSection title="제4조 (서비스 제공 및 변경)">
            <p
              className="mkt-body"
              style={{
                color: 'var(--mkt-ink)',
                opacity: 0.75,
                marginBottom: 'var(--mkt-space-md)',
              }}
            >
              회사는 안정적인 서비스 제공을 위해 최선을 다하며, 베타 기간 중에는 서비스 내용이 사전
              고지 없이 변경될 수 있습니다.
            </p>
            <p className="mkt-body" style={{ color: 'var(--mkt-ink)', opacity: 0.75 }}>
              시스템 점검, 장비 교체, 고장 등으로 서비스 제공이 일시 중단될 수 있으며, 이 경우
              회사는 공지사항 등을 통해 이용자에게 사전 고지합니다. 단, 긴급한 사정이 있을 경우 사후
              고지로 대신할 수 있습니다.
            </p>
          </LegalSection>

          <LegalSection title="제5조 (콘텐츠 권리 및 책임)">
            <p
              className="mkt-body"
              style={{
                color: 'var(--mkt-ink)',
                opacity: 0.75,
                marginBottom: 'var(--mkt-space-md)',
              }}
            >
              이용자가 서비스 내에서 작성·업로드한 콘텐츠에 대한 저작권은 해당 이용자에게 있습니다.
              단, 이용자는 회사가 서비스 운영·홍보·개선 목적으로 해당 콘텐츠를 비상업적으로 사용할
              수 있는 권리를 회사에 부여합니다.
            </p>
            <p className="mkt-body" style={{ color: 'var(--mkt-ink)', opacity: 0.75 }}>
              이용자는 자신이 업로드한 콘텐츠가 제3자의 저작권·상표권·초상권 등을 침해하지 않음을
              보증해야 하며, 이로 인한 법적 책임은 이용자 본인에게 있습니다.
            </p>
          </LegalSection>

          <LegalSection title="제6조 (서비스 이용 중단 및 계약 해지)">
            <p
              className="mkt-body"
              style={{
                color: 'var(--mkt-ink)',
                opacity: 0.75,
                marginBottom: 'var(--mkt-space-md)',
              }}
            >
              이용자는 언제든지 서비스 내 설정 메뉴 또는 고객센터를 통해 이용 계약 해지를 신청할 수
              있습니다.
            </p>
            <p className="mkt-body" style={{ color: 'var(--mkt-ink)', opacity: 0.75 }}>
              회사는 이용자가 제3조의 이용 규칙을 위반한 경우 사전 통보 없이 서비스 이용을
              제한하거나 계약을 해지할 수 있습니다.
            </p>
          </LegalSection>

          <LegalSection title="제7조 (책임 제한)">
            <p
              className="mkt-body"
              style={{
                color: 'var(--mkt-ink)',
                opacity: 0.75,
                marginBottom: 'var(--mkt-space-md)',
              }}
            >
              회사는 베타 서비스 기간 중 서비스의 완전성을 보장하지 않으며, 서비스 이용으로 인한
              간접적·파생적 손해에 대해 책임을 지지 않습니다.
            </p>
            <p className="mkt-body" style={{ color: 'var(--mkt-ink)', opacity: 0.75 }}>
              단, 회사의 고의 또는 중대한 과실에 의한 직접적인 손해에 대해서는 관련 법령에 따라
              책임을 집니다.
            </p>
          </LegalSection>

          <LegalSection title="제8조 (약관 변경)">
            <p className="mkt-body" style={{ color: 'var(--mkt-ink)', opacity: 0.75 }}>
              회사는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지 또는 이메일을
              통해 7일 이전에 이용자에게 고지합니다. 이용자가 변경된 약관에 동의하지 않을 경우 이용
              계약을 해지할 수 있습니다.
            </p>
          </LegalSection>

          <LegalSection title="제9조 (분쟁 해결)">
            <p className="mkt-body" style={{ color: 'var(--mkt-ink)', opacity: 0.75 }}>
              본 약관 및 서비스 이용과 관련한 분쟁은 대한민국 법률에 따라 처리하며, 소송이 필요한
              경우 서울중앙지방법원을 제1심 합의 관할 법원으로 합니다. (법무 검토 후 확정 예정 —
              FOLLOWUP-59)
            </p>
          </LegalSection>

          {/* 문의 */}
          <div
            style={{
              backgroundColor: 'var(--mkt-surface-soft)',
              borderRadius: 'var(--mkt-rounded-md)',
              padding: 'var(--mkt-space-lg) var(--mkt-space-xl)',
              marginTop: 'var(--mkt-space-md)',
            }}
          >
            <p
              className="mkt-body-sm"
              style={{ color: 'var(--mkt-ink)', opacity: 0.6, marginBottom: 'var(--mkt-space-xs)' }}
            >
              약관 관련 문의
            </p>
            <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)' }}>
              이메일:{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                style={{ color: 'var(--mkt-ink)', fontWeight: 560 }}
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>

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

/* ── 섹션 래퍼 ─────────────────────────────────────────────────────────────── */
function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2
        className="mkt-headline"
        style={{
          color: 'var(--mkt-ink)',
          marginBottom: 'var(--mkt-space-md)',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}
