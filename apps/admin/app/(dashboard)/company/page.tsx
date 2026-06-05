/**
 * (dashboard)/company/page.tsx — 회사정보 관리 (Server Component)
 *
 * 싱글톤 CompanyInfo 를 조회해 CompanyInfoForm 에 전달.
 * 인증은 requireRole() 에서 처리 (curator+).
 *
 * LEGAL-OPS-01: 사업자 정보 입력 → isPublished=true → footer/약관/PP 즉시 반영
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import * as React from 'react'

import { requireRole } from '../../../src/lib/auth'
import { prisma } from '../../../src/lib/prisma'

import { CompanyInfoForm } from './CompanyInfoForm'
import { FooterPreview } from './FooterPreview'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '회사정보 관리 | StoryWork Admin',
}

const SINGLETON_ID = 'company-info-singleton'

export default async function CompanyPage() {
  const user = await requireRole('curator')

  let info = await prisma.companyInfo.findUnique({ where: { id: SINGLETON_ID } })

  // seed 가 실행되지 않은 경우 자동 생성
  if (!info) {
    info = await prisma.companyInfo.create({
      data: {
        id: SINGLETON_ID,
        companyName: '(준비 중)',
        ceoName: '',
        address: '',
        phone: '',
        email: '',
        hostingProvider: 'Vercel · Supabase',
        isPublished: false,
      },
    })
  }

  const canEdit = user.role === 'curator' || user.role === 'superadmin'

  return (
    <div className="nike-main-inner">
      {/* 페이지 헤더 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--nike-font-display)',
              fontSize: '24px',
              fontWeight: 500,
              color: 'var(--nike-ink)',
              lineHeight: 1.25,
            }}
          >
            회사정보
          </h1>
          <p
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '14px',
              color: 'var(--nike-mute)',
              marginTop: '6px',
            }}
          >
            사업자 정보 및 운영자 연락처 — 서비스 footer, 이용약관, 개인정보처리방침에 반영됩니다.
          </p>
        </div>

        <div className="flex gap-2" style={{ flexShrink: 0 }}>
          {info.isPublished && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                borderRadius: '99px',
                backgroundColor: 'color-mix(in srgb, var(--nike-lime) 20%, transparent)',
                fontFamily: 'var(--nike-font-text)',
                fontSize: '12px',
                fontWeight: 540,
                color: 'var(--nike-ink)',
              }}
            >
              공개 중
            </span>
          )}
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="nike-btn-secondary"
            style={{ fontSize: '13px', padding: '6px 14px' }}
          >
            서비스 Footer 확인
          </Link>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 340px',
          gap: '32px',
          alignItems: 'start',
        }}
        className="max-lg:!grid-cols-1"
      >
        {/* 좌측: 폼 */}
        <div>
          {canEdit ? (
            <CompanyInfoForm initialData={info} />
          ) : (
            <div
              className="nike-block nike-block-cream"
              style={{
                padding: '20px',
                fontFamily: 'var(--nike-font-text)',
                fontSize: '14px',
                color: 'var(--nike-mute)',
              }}
            >
              읽기 전용 — curator 이상 권한이 필요합니다.
            </div>
          )}
        </div>

        {/* 우측: 미리보기 패널 */}
        <div className="flex flex-col gap-4">
          <div>
            <h2
              style={{
                fontFamily: 'var(--nike-font-text)',
                fontSize: '12px',
                fontWeight: 540,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--nike-ink)',
                opacity: 0.55,
                marginBottom: '12px',
              }}
            >
              Footer 미리보기
            </h2>
            <FooterPreview data={info} />
          </div>

          {/* 약관 바로가기 */}
          <div
            style={{
              borderRadius: 'var(--nike-admin-rounded-md)',
              border: '1px solid var(--nike-hairline)',
              padding: '16px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--nike-font-text)',
                fontSize: '12px',
                fontWeight: 540,
                color: 'var(--nike-ink)',
                marginBottom: '8px',
              }}
            >
              관련 페이지
            </p>
            <div className="flex flex-col gap-2">
              {[
                { label: '서비스 이용약관', href: '/legal/terms' },
                { label: '개인정보처리방침', href: '/legal/privacy' },
                { label: '서비스 Footer', href: '/' },
              ].map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '13px',
                    color: 'var(--nike-ink)',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: 0.7,
                  }}
                  className="hover:opacity-100 transition-opacity"
                >
                  {label}
                  <span style={{ fontSize: '11px', opacity: 0.5 }}>↗</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
