/**
 * /legal/privacy — 개인정보처리방침 placeholder
 *
 * FOLLOWUP-59: 법무 검토 후 정식 방침으로 교체 예정.
 * 이 페이지는 베타 서비스 기간 중 임시 placeholder 입니다.
 *
 * 수집·처리 위탁사:
 *   - Supabase (DB + Storage)
 *   - Vercel (호스팅)
 *   - Anthropic (AI 분석)
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import * as React from 'react'

import { Footer } from '../../../components/marketing/Footer'
import { Header } from '../../../components/marketing/Header'

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: '스토리워크 개인정보처리방침입니다. 베타 서비스 기간 중 적용되는 임시 방침입니다.',
  robots: { index: false, follow: false },
}

const EFFECTIVE_DATE = '2026년 6월 1일'
const CONTACT_EMAIL = 'privacy@storywork.kr'

export default function PrivacyPage() {
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
            개인정보처리방침
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
              <strong>베타 서비스 방침 안내</strong> — 본 방침은 베타 서비스 기간 중 적용되는 임시
              방침입니다. 정식 출시 전 법무 검토 및 개인정보보호법 요건에 맞춰 변경될 수 있습니다.
              (FOLLOWUP-59)
            </p>
          </div>

          <p
            className="mkt-body-sm"
            style={{ color: 'var(--mkt-ink)', opacity: 0.55, marginTop: 'var(--mkt-space-md)' }}
          >
            시행일: {EFFECTIVE_DATE}
          </p>
        </div>

        {/* 방침 본문 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-xxl)' }}>
          <LegalSection title="1. 수집하는 개인정보 항목">
            <p
              className="mkt-body"
              style={{
                color: 'var(--mkt-ink)',
                opacity: 0.75,
                marginBottom: 'var(--mkt-space-md)',
              }}
            >
              스토리워크는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.
            </p>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 'var(--mkt-body-sm-size)',
                fontFamily: 'var(--mkt-font-sans)',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid var(--mkt-hairline)' }}>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px 8px 0',
                      color: 'var(--mkt-ink)',
                      fontWeight: 560,
                    }}
                  >
                    수집 시점
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      color: 'var(--mkt-ink)',
                      fontWeight: 560,
                    }}
                  >
                    수집 항목
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px 0 8px 12px',
                      color: 'var(--mkt-ink)',
                      fontWeight: 560,
                    }}
                  >
                    목적
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['회원가입', '이메일 주소, 비밀번호(해시)', '계정 인증 및 식별'],
                  ['서비스 이용', '작품 데이터 (스토리보드 JSON)', '작품 저장·불러오기'],
                  ['자동 수집', 'IP 주소, 접속 일시, 브라우저 정보', '보안 및 서비스 품질 개선'],
                  ['자동 수집', '쿠키·세션 토큰', '로그인 상태 유지'],
                  ['결제(예정)', '결제 수단 정보(PG사 위임)', '구독 서비스 제공'],
                ].map(([timing, items, purpose], i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: '1px solid var(--mkt-hairline-soft)',
                    }}
                  >
                    <td
                      style={{
                        padding: '8px 12px 8px 0',
                        color: 'var(--mkt-ink)',
                        opacity: 0.7,
                        verticalAlign: 'top',
                      }}
                    >
                      {timing}
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        color: 'var(--mkt-ink)',
                        opacity: 0.8,
                        verticalAlign: 'top',
                      }}
                    >
                      {items}
                    </td>
                    <td
                      style={{
                        padding: '8px 0 8px 12px',
                        color: 'var(--mkt-ink)',
                        opacity: 0.7,
                        verticalAlign: 'top',
                      }}
                    >
                      {purpose}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </LegalSection>

          <LegalSection title="2. 개인정보 처리 위탁">
            <p
              className="mkt-body"
              style={{
                color: 'var(--mkt-ink)',
                opacity: 0.75,
                marginBottom: 'var(--mkt-space-md)',
              }}
            >
              스토리워크는 서비스 운영을 위해 다음 업체에 개인정보 처리를 위탁합니다.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-sm)' }}>
              {[
                {
                  vendor: 'Supabase, Inc.',
                  task: '데이터베이스 및 파일 스토리지 운영',
                  country: '미국 (AWS)',
                  scope: '이메일, 작품 데이터, 업로드 파일',
                },
                {
                  vendor: 'Vercel, Inc.',
                  task: '웹 서비스 호스팅 및 CDN',
                  country: '미국',
                  scope: 'IP, 접속 로그',
                },
                {
                  vendor: 'Anthropic, PBC',
                  task: 'AI 대본 분석 (Claude API)',
                  country: '미국',
                  scope: '이용자 입력 텍스트 (대본)',
                },
              ].map(({ vendor, task, country, scope }) => (
                <div
                  key={vendor}
                  style={{
                    border: '1px solid var(--mkt-hairline)',
                    borderRadius: 'var(--mkt-rounded-md)',
                    padding: 'var(--mkt-space-md)',
                  }}
                >
                  <p
                    className="mkt-body-sm"
                    style={{ color: 'var(--mkt-ink)', fontWeight: 560, marginBottom: '4px' }}
                  >
                    {vendor}
                  </p>
                  <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', opacity: 0.7 }}>
                    위탁 업무: {task}
                  </p>
                  <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', opacity: 0.7 }}>
                    국가: {country} · 위탁 범위: {scope}
                  </p>
                </div>
              ))}
            </div>
          </LegalSection>

          <LegalSection title="3. 개인정보 보유 및 이용 기간">
            <p
              className="mkt-body"
              style={{
                color: 'var(--mkt-ink)',
                opacity: 0.75,
                marginBottom: 'var(--mkt-space-md)',
              }}
            >
              수집한 개인정보는 서비스 이용 계약이 유지되는 동안 보유합니다. 이용 계약 해지 후에는
              다음 기간 동안 보관 후 파기합니다.
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
                '회원 계정 정보: 탈퇴 후 30일 (분쟁 대비 보관)',
                '작품 데이터: 탈퇴 후 즉시 삭제 (이용자 요청 시)',
                '접속 로그: 3개월',
                '전자상거래 관련 기록: 5년 (전자상거래법)',
              ].map((item) => (
                <li key={item}>
                  <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', opacity: 0.75 }}>
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          </LegalSection>

          <LegalSection title="4. 이용자의 권리 (PIPA 제35조 등)">
            <p
              className="mkt-body"
              style={{
                color: 'var(--mkt-ink)',
                opacity: 0.75,
                marginBottom: 'var(--mkt-space-md)',
              }}
            >
              이용자는 언제든지 다음의 권리를 행사할 수 있습니다.
            </p>
            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--mkt-space-xs)',
                paddingLeft: 'var(--mkt-space-lg)',
                marginBottom: 'var(--mkt-space-md)',
              }}
            >
              {[
                '개인정보 처리 현황 열람 요청',
                '오류가 있는 경우 정정 요청',
                '개인정보 삭제 요청 (단, 법령 의무 보존 기간 내 항목 제외)',
                '개인정보 처리 정지 요청',
                '개인정보 이동 요청 (기계 판독 가능한 형식으로 제공)',
                '마케팅 수신 동의 변경 (언제든지, 별도 동의)',
              ].map((item) => (
                <li key={item}>
                  <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', opacity: 0.75 }}>
                    {item}
                  </p>
                </li>
              ))}
            </ul>

            {/* 데이터 이동권 강화 안내 */}
            <div
              style={{
                backgroundColor: 'var(--mkt-surface-soft)',
                borderRadius: 'var(--mkt-rounded-md)',
                padding: 'var(--mkt-space-md) var(--mkt-space-lg)',
                marginBottom: 'var(--mkt-space-md)',
              }}
            >
              <p
                className="mkt-body-sm"
                style={{ color: 'var(--mkt-ink)', fontWeight: 540, marginBottom: '4px' }}
              >
                데이터 다운로드 권리 (이동권)
              </p>
              <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', opacity: 0.7 }}>
                로그인 후{' '}
                <a href="/mypage?tab=account" style={{ color: 'var(--mkt-ink)', fontWeight: 540 }}>
                  마이페이지 &gt; 계정 설정
                </a>
                에서 본인의 모든 데이터(프로필·작품·구독·문의 이력 등)를 JSON 형식으로 즉시
                다운로드할 수 있습니다.
              </p>
            </div>

            {/* 회원 탈퇴 권리 안내 */}
            <div
              style={{
                backgroundColor: 'var(--mkt-surface-soft)',
                borderRadius: 'var(--mkt-rounded-md)',
                padding: 'var(--mkt-space-md) var(--mkt-space-lg)',
                marginBottom: 'var(--mkt-space-md)',
              }}
            >
              <p
                className="mkt-body-sm"
                style={{ color: 'var(--mkt-ink)', fontWeight: 540, marginBottom: '4px' }}
              >
                회원 탈퇴 및 개인정보 삭제 권리
              </p>
              <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', opacity: 0.7 }}>
                로그인 후{' '}
                <a href="/mypage?tab=account" style={{ color: 'var(--mkt-ink)', fontWeight: 540 }}>
                  마이페이지 &gt; 계정 설정
                </a>
                에서 직접 탈퇴할 수 있습니다. 탈퇴 즉시 계정 접근이 제한되며, 탈퇴 후{' '}
                <strong>30일간 보관 후 영구 삭제</strong>됩니다. 30일 이내에는 관리자에게 문의해
                복원할 수 있습니다.
              </p>
            </div>

            <p
              className="mkt-body-sm"
              style={{ color: 'var(--mkt-ink)', opacity: 0.6, marginTop: 'var(--mkt-space-md)' }}
            >
              직접 권리 행사가 어려운 경우{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                style={{ color: 'var(--mkt-ink)', fontWeight: 560 }}
              >
                {CONTACT_EMAIL}
              </a>
              로 이메일 요청 부탁드립니다.
            </p>
          </LegalSection>

          <LegalSection title="5. 안전성 확보 조치">
            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--mkt-space-xs)',
                paddingLeft: 'var(--mkt-space-lg)',
              }}
            >
              {[
                '비밀번호 단방향 해시(bcrypt) 저장',
                'Supabase Row Level Security(RLS)로 데이터 접근 제어',
                'HTTPS 전용 서비스 (TLS 1.2+)',
                '관리자 계정 2단계 인증(TOTP) 강제',
                '업로드 파일 MIME 검증 및 악성코드 스캔',
              ].map((item) => (
                <li key={item}>
                  <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', opacity: 0.75 }}>
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          </LegalSection>

          <LegalSection title="6. 쿠키 사용">
            <p className="mkt-body" style={{ color: 'var(--mkt-ink)', opacity: 0.75 }}>
              스토리워크는 로그인 상태 유지, UI 설정(다크 모드 등) 저장을 위해 필수 쿠키를
              사용합니다. 서비스 품질 개선을 위해 분석용 쿠키(PostHog)를 사용할 예정이며, 이는 별도
              동의 후 적용됩니다. (FOLLOWUP-60)
            </p>
          </LegalSection>

          <LegalSection title="7. 개인정보 보호책임자">
            <div
              style={{
                backgroundColor: 'var(--mkt-surface-soft)',
                borderRadius: 'var(--mkt-rounded-md)',
                padding: 'var(--mkt-space-lg) var(--mkt-space-xl)',
              }}
            >
              <p
                className="mkt-body-sm"
                style={{ color: 'var(--mkt-ink)', fontWeight: 560, marginBottom: '4px' }}
              >
                개인정보 보호책임자 (placeholder — FOLLOWUP-59)
              </p>
              <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', opacity: 0.7 }}>
                이메일:{' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  style={{ color: 'var(--mkt-ink)', fontWeight: 560 }}
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </LegalSection>

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
