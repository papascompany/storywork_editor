'use client'

/**
 * FooterPreview — admin /company 페이지 하단에 표시되는 Footer 미리보기
 *
 * 입력값을 실시간으로 반영해 서비스 footer 의 사업자정보 영역을 미리 보여줌.
 * 실제 footer 는 apps/web/components/marketing/Footer.tsx 에 구현.
 */

import * as React from 'react'

import type { CompanyInfoData } from './CompanyInfoForm'

interface FooterPreviewProps {
  data: CompanyInfoData
}

export function FooterPreview({ data }: FooterPreviewProps) {
  if (!data.isPublished) {
    return (
      <div
        style={{
          backgroundColor: 'var(--nike-soft-cloud)',
          borderRadius: 'var(--nike-admin-rounded-md)',
          padding: '16px 20px',
          border: '1px solid var(--nike-hairline)',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '12px',
            color: 'var(--nike-mute)',
            fontStyle: 'italic',
          }}
        >
          isPublished = false — Footer 에 placeholder 유지. 저장 후 공개 설정을 켜면 아래와 같이
          표시됩니다.
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        backgroundColor: '#f5f5f5',
        borderRadius: 'var(--nike-admin-rounded-md)',
        padding: '20px 24px',
        border: '1px solid var(--nike-hairline)',
        fontFamily: 'var(--nike-font-text)',
        fontSize: '12px',
        color: '#111',
        lineHeight: 1.7,
      }}
    >
      <p
        style={{
          fontSize: '11px',
          fontWeight: 540,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#888',
          marginBottom: '10px',
        }}
      >
        Footer 사업자 정보 미리보기
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {data.companyName && (
          <p>
            <span style={{ fontWeight: 540 }}>{data.companyName}</span>
            {data.ceoName && <span style={{ color: '#555' }}> · 대표: {data.ceoName}</span>}
          </p>
        )}
        {data.businessRegistrationNo && (
          <p style={{ color: '#555' }}>사업자등록번호: {data.businessRegistrationNo}</p>
        )}
        {data.mailOrderBusinessNo && (
          <p style={{ color: '#555' }}>통신판매업신고: {data.mailOrderBusinessNo}</p>
        )}
        {data.address && <p style={{ color: '#555' }}>주소: {data.address}</p>}
        {(data.phone || data.email) && (
          <p style={{ color: '#555' }}>
            {data.phone && `전화: ${data.phone}`}
            {data.phone && data.email && ' / '}
            {data.email && `이메일: ${data.email}`}
          </p>
        )}
        {data.faxNo && <p style={{ color: '#555' }}>팩스: {data.faxNo}</p>}
        {data.hostingProvider && (
          <p style={{ color: '#888', fontSize: '11px' }}>호스팅: {data.hostingProvider}</p>
        )}
        {data.customerServiceHours && (
          <p style={{ color: '#888', fontSize: '11px' }}>고객센터: {data.customerServiceHours}</p>
        )}
      </div>
    </div>
  )
}
