'use client'

/**
 * components/mypage/BillingTab.tsx
 *
 * 결제·구독 탭 — placeholder.
 * 실 Stripe 연동은 PR8 에서 처리.
 */

import { Check } from 'lucide-react'
import * as React from 'react'

// ─── 플랜 데이터 ──────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '무료',
    description: '개인 창작을 시작하는 분께',
    features: [
      '작품 5개',
      '포즈 라이브러리 전체 접근',
      'AI 자동 배치 월 10회',
      'PDF 출판 (워터마크)',
    ],
    isCurrent: true,
    isDisabled: false,
  },
  {
    id: 'creator',
    name: 'Creator',
    price: '미정',
    description: '활발히 창작하는 크리에이터',
    features: [
      '작품 무제한',
      '마이데이터 업로드 (최대 500MB)',
      'AI 자동 배치 무제한',
      'PDF 출판 (워터마크 없음)',
      '우선 고객 지원',
    ],
    isCurrent: false,
    isDisabled: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '미정',
    description: '전문 작가 / 팀',
    features: [
      'Creator 플랜 전체 포함',
      '마이데이터 업로드 (최대 5GB)',
      '커스텀 판형 등록',
      '팀 협업 (출시 예정)',
      '전담 지원',
    ],
    isCurrent: false,
    isDisabled: true,
  },
]

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function BillingTab() {
  const [comingSoonMsg, setComingSoonMsg] = React.useState('')

  function handleComingSoon(label: string) {
    setComingSoonMsg(`${label} 기능은 곧 출시됩니다.`)
    setTimeout(() => setComingSoonMsg(''), 3000)
  }

  return (
    <section aria-label="결제 및 구독">
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
        결제 · 구독
      </h2>

      {/* 현재 플랜 카드 */}
      <div
        style={{
          backgroundColor: 'var(--mkt-block-lime)',
          borderRadius: 'var(--mkt-rounded-lg)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--mkt-space-md)',
          flexWrap: 'wrap',
          marginBottom: 'var(--mkt-space-xl)',
        }}
      >
        <div>
          <p
            style={{
              fontFamily: 'var(--mkt-font-mono)',
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              color: 'var(--mkt-ink)',
              opacity: 0.5,
              margin: '0 0 4px',
            }}
          >
            현재 플랜
          </p>
          <p
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '20px',
              fontWeight: 540,
              letterSpacing: '-0.26px',
              color: 'var(--mkt-ink)',
              margin: 0,
            }}
          >
            Free
          </p>
          <p
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '14px',
              fontWeight: 330,
              color: 'var(--mkt-ink)',
              opacity: 0.6,
              margin: '4px 0 0',
            }}
          >
            구독하면 더 많은 기능을 사용할 수 있어요.
          </p>
        </div>
      </div>

      {/* 플랜 비교 그리드 */}
      <div
        style={{
          display: 'grid',
          gap: 'var(--mkt-space-md)',
          gridTemplateColumns: 'repeat(1, 1fr)',
          marginBottom: 'var(--mkt-space-xxl)',
        }}
        className="billing-plans-grid"
      >
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            style={{
              backgroundColor: 'var(--mkt-canvas)',
              border: plan.isCurrent ? '2px solid var(--mkt-ink)' : '1px solid var(--mkt-hairline)',
              borderRadius: 'var(--mkt-rounded-lg)',
              padding: '20px',
              position: 'relative',
            }}
          >
            {/* 현재 플랜 뱃지 */}
            {plan.isCurrent && (
              <span
                style={{
                  position: 'absolute',
                  top: '14px',
                  right: '14px',
                  padding: '3px 10px',
                  borderRadius: 'var(--mkt-rounded-pill)',
                  backgroundColor: 'var(--mkt-ink)',
                  color: 'var(--mkt-canvas)',
                  fontFamily: 'var(--mkt-font-mono)',
                  fontSize: '10px',
                  fontWeight: 400,
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                }}
              >
                현재 플랜
              </span>
            )}

            <p
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '18px',
                fontWeight: 540,
                letterSpacing: '-0.26px',
                color: 'var(--mkt-ink)',
                margin: '0 0 4px',
              }}
            >
              {plan.name}
            </p>

            <p
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '13px',
                fontWeight: 330,
                color: 'var(--mkt-ink)',
                opacity: 0.55,
                margin: '0 0 16px',
              }}
            >
              {plan.description}
            </p>

            <p
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '22px',
                fontWeight: 540,
                letterSpacing: '-0.26px',
                color: 'var(--mkt-ink)',
                margin: '0 0 16px',
              }}
            >
              {plan.price}
              {plan.price !== '무료' && plan.price !== '미정' && (
                <span
                  style={{
                    fontFamily: 'var(--mkt-font-sans)',
                    fontSize: '14px',
                    fontWeight: 330,
                    opacity: 0.5,
                  }}
                >
                  /월
                </span>
              )}
            </p>

            {/* 기능 목록 */}
            <ul
              role="list"
              style={{
                margin: '0 0 20px',
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontFamily: 'var(--mkt-font-sans)',
                    fontSize: '13px',
                    fontWeight: 330,
                    color: 'var(--mkt-ink)',
                    opacity: 0.75,
                  }}
                >
                  <Check
                    style={{ width: '14px', height: '14px', flexShrink: 0 }}
                    aria-hidden="true"
                  />
                  {feature}
                </li>
              ))}
            </ul>

            {/* 업그레이드 버튼 */}
            {!plan.isCurrent && (
              <button
                type="button"
                disabled={plan.isDisabled}
                onClick={() => handleComingSoon('결제')}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: 'var(--mkt-rounded-md)',
                  border: '1px solid var(--mkt-hairline)',
                  backgroundColor: 'transparent',
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '14px',
                  fontWeight: 480,
                  color: 'var(--mkt-ink)',
                  opacity: 0.4,
                  cursor: 'not-allowed',
                }}
              >
                {plan.name} 구독 — 곧 출시
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 결제 내역 */}
      <div>
        <h3
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '18px',
            fontWeight: 540,
            letterSpacing: '-0.26px',
            color: 'var(--mkt-ink)',
            margin: '0 0 var(--mkt-space-md)',
          }}
        >
          결제 내역
        </h3>
        <div
          style={{
            backgroundColor: 'var(--mkt-canvas)',
            border: '1px solid var(--mkt-hairline)',
            borderRadius: 'var(--mkt-rounded-md)',
            padding: '40px 24px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '14px',
              fontWeight: 330,
              color: 'var(--mkt-ink)',
              opacity: 0.45,
              margin: 0,
            }}
          >
            결제 내역이 없습니다.
          </p>
        </div>
      </div>

      {/* 결제 수단 */}
      <div style={{ marginTop: 'var(--mkt-space-xl)' }}>
        <button
          type="button"
          disabled
          onClick={() => handleComingSoon('결제 수단 추가')}
          style={{
            height: '44px',
            padding: '0 20px',
            borderRadius: 'var(--mkt-rounded-md)',
            border: '1px solid var(--mkt-hairline)',
            backgroundColor: 'transparent',
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '15px',
            fontWeight: 480,
            color: 'var(--mkt-ink)',
            opacity: 0.35,
            cursor: 'not-allowed',
          }}
        >
          결제 수단 추가 — 곧 출시
        </button>
      </div>

      {/* 인라인 coming soon 메시지 */}
      {comingSoonMsg && (
        <p
          role="status"
          aria-live="polite"
          style={{
            marginTop: 'var(--mkt-space-sm)',
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '13px',
            fontWeight: 330,
            color: 'var(--mkt-ink)',
            opacity: 0.55,
          }}
        >
          {comingSoonMsg}
        </p>
      )}

      {/* 반응형 플랜 그리드 */}
      <style>{`
        @media (min-width: 768px) {
          .billing-plans-grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>
    </section>
  )
}
