'use client'

/**
 * components/mypage/MyDataTab.tsx
 *
 * 마이데이터 탭 — placeholder.
 * 실 업로드 기능은 별도 PR 에서 처리.
 */

import { ImageIcon, MessageCircle, Sparkles, Star, Wand2 } from 'lucide-react'
import * as React from 'react'

const CATEGORIES = [
  { id: 'pose', label: '포즈', icon: Sparkles, count: 0, color: 'var(--mkt-block-lilac)' },
  { id: 'background', label: '배경', icon: ImageIcon, count: 0, color: 'var(--mkt-block-mint)' },
  {
    id: 'speech-bubble',
    label: '말풍선',
    icon: MessageCircle,
    count: 0,
    color: 'var(--mkt-block-cream)',
  },
  { id: 'prop', label: '소품', icon: Star, count: 0, color: 'var(--mkt-block-pink)' },
  { id: 'word-fx', label: '효과', icon: Wand2, count: 0, color: 'var(--mkt-block-coral)' },
]

export function MyDataTab() {
  const [comingSoon, setComingSoon] = React.useState(false)

  function handleUpload() {
    setComingSoon(true)
    setTimeout(() => setComingSoon(false), 3000)
  }

  return (
    <section aria-label="마이데이터">
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
        마이데이터
      </h2>

      {/* 안내 카드 */}
      <div
        style={{
          backgroundColor: 'var(--mkt-block-navy)',
          borderRadius: 'var(--mkt-rounded-lg)',
          padding: '28px',
          marginBottom: 'var(--mkt-space-xl)',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--mkt-font-mono)',
            fontSize: '11px',
            fontWeight: 400,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            color: 'var(--mkt-canvas)',
            opacity: 0.5,
            margin: '0 0 8px',
          }}
        >
          Creator Plan
        </p>
        <p
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '18px',
            fontWeight: 540,
            letterSpacing: '-0.26px',
            color: 'var(--mkt-canvas)',
            margin: '0 0 8px',
            lineHeight: 1.4,
          }}
        >
          내가 업로드한 포즈·배경·말풍선을
          <br />
          작품에 바로 사용할 수 있어요.
        </p>
        <p
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '14px',
            fontWeight: 330,
            color: 'var(--mkt-canvas)',
            opacity: 0.6,
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          곧 출시됩니다. Creator 플랜을 구독하면 최대 500MB 업로드가 가능해요.
        </p>
      </div>

      {/* 카테고리 카드 그리드 */}
      <div
        style={{
          display: 'grid',
          gap: 'var(--mkt-space-md)',
          gridTemplateColumns: 'repeat(2, 1fr)',
        }}
        className="mydata-grid"
      >
        {CATEGORIES.map(({ id, label, icon: Icon, count, color }) => (
          <div
            key={id}
            style={{
              backgroundColor: 'var(--mkt-canvas)',
              border: '1px solid var(--mkt-hairline)',
              borderRadius: 'var(--mkt-rounded-md)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--mkt-space-sm)',
            }}
          >
            {/* 아이콘 원 */}
            <div
              aria-hidden="true"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--mkt-rounded-md)',
                backgroundColor: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon
                style={{ width: '20px', height: '20px', color: 'var(--mkt-ink)', opacity: 0.7 }}
              />
            </div>

            {/* 라벨 + 개수 */}
            <div>
              <p
                style={{
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '15px',
                  fontWeight: 480,
                  letterSpacing: '-0.10px',
                  color: 'var(--mkt-ink)',
                  margin: '0 0 2px',
                }}
              >
                {label}
              </p>
              <p
                style={{
                  fontFamily: 'var(--mkt-font-mono)',
                  fontSize: '12px',
                  fontWeight: 400,
                  color: 'var(--mkt-ink)',
                  opacity: 0.4,
                  margin: 0,
                }}
              >
                {count}개
              </p>
            </div>

            {/* 업로드 버튼 */}
            <button
              type="button"
              disabled
              onClick={handleUpload}
              aria-label={`${label} 업로드 (곧 출시 예정)`}
              style={{
                alignSelf: 'flex-start',
                height: '32px',
                padding: '0 14px',
                borderRadius: 'var(--mkt-rounded-md)',
                border: '1px solid var(--mkt-hairline)',
                backgroundColor: 'transparent',
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '12px',
                fontWeight: 480,
                color: 'var(--mkt-ink)',
                opacity: 0.35,
                cursor: 'not-allowed',
              }}
            >
              업로드
            </button>
          </div>
        ))}
      </div>

      {/* 인라인 coming soon 메시지 */}
      {comingSoon && (
        <p
          role="status"
          aria-live="polite"
          style={{
            marginTop: 'var(--mkt-space-md)',
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '13px',
            fontWeight: 330,
            color: 'var(--mkt-ink)',
            opacity: 0.55,
          }}
        >
          마이데이터 업로드는 곧 출시됩니다.
        </p>
      )}

      {/* 반응형 그리드 */}
      <style>{`
        @media (min-width: 640px) {
          .mydata-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 1024px) {
          .mydata-grid { grid-template-columns: repeat(5, 1fr); }
        }
      `}</style>
    </section>
  )
}
