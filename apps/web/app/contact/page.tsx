/**
 * /contact — 1:1 문의 폼
 *
 * 비회원도 가능 (email 직접 입력).
 * 로그인 사용자는 email 자동 채움.
 * 서버 액션으로 Inquiry 레코드 저장.
 */
import type { Metadata } from 'next'
import * as React from 'react'

import { ContactForm } from './ContactForm'

import { Footer } from '@/components/marketing/Footer'
import { Header } from '@/components/marketing/Header'
import { createWebServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: '문의하기',
  description: '스토리워크 서비스 관련 1:1 문의를 남겨주세요. 빠르게 답변드립니다.',
}

export default async function ContactPage() {
  // 로그인 사용자 이메일 미리 채움 (optional)
  let prefillEmail: string | null = null
  let userId: string | null = null

  try {
    const supabase = await createWebServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user?.email) {
      prefillEmail = user.email
      userId = user.id
    }
  } catch {
    // 비회원 처리
  }

  return (
    <div style={{ backgroundColor: 'var(--mkt-canvas)', minHeight: '100dvh' }}>
      <Header />

      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '64px 24px 80px' }}>
        <h1
          style={{
            fontFamily: 'var(--mkt-font-display)',
            fontSize: 'var(--mkt-display-lg-size)',
            fontWeight: 'var(--mkt-display-lg-weight)',
            color: 'var(--mkt-ink)',
            marginBottom: '8px',
          }}
        >
          문의하기
        </h1>
        <p
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '15px',
            color: 'var(--mkt-ink)',
            opacity: 0.55,
            marginBottom: '48px',
            lineHeight: 1.6,
          }}
        >
          서비스 관련 궁금한 점이나 불편한 사항을 남겨주세요.
          <br />
          영업일 기준 1~2일 내 답변드립니다.
        </p>

        <ContactForm prefillEmail={prefillEmail} userId={userId} />
      </main>

      <Footer />
    </div>
  )
}
