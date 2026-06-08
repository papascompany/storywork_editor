/**
 * /mypage/account — 개인정보 파기 안내 노티 렌더 검증 (LEGAL-OPS-03)
 *
 * 탈퇴 화면에 개인정보 보호법/전자상거래법 기반 파기·보유 안내 + 처리방침 링크가
 * 노출되는지 확인. 문구는 개인정보처리방침 §3 와 일치.
 */
import { render, screen, within } from '@testing-library/react'
import * as React from 'react'
import { describe, it, expect } from 'vitest'

import { AccountSettingsClient } from '@/components/mypage/AccountSettingsClient'

describe('AccountSettingsClient — 개인정보 파기 안내', () => {
  function renderClient() {
    return render(<AccountSettingsClient email="user@example.com" marketingConsent={false} />)
  }

  it('파기 안내 노티(role=note)가 렌더된다', () => {
    renderClient()
    const note = screen.getByRole('note', { name: '탈퇴 시 개인정보 파기 안내' })
    expect(note).toBeDefined()
  })

  it('법령 근거 + 보유기간 항목이 노출된다', () => {
    renderClient()
    const note = screen.getByRole('note', { name: '탈퇴 시 개인정보 파기 안내' })
    const text = note.textContent ?? ''
    expect(text).toContain('개인정보 보호법')
    expect(text).toContain('탈퇴 후 30일')
    expect(text).toContain('접속 로그: 3개월')
    expect(text).toContain('5년 (전자상거래법)')
    expect(text).toContain('탈퇴 즉시 삭제')
  })

  it('개인정보처리방침 링크(/legal/privacy)가 새 탭으로 연결된다', () => {
    renderClient()
    const note = screen.getByRole('note', { name: '탈퇴 시 개인정보 파기 안내' })
    const link = within(note).getByRole('link', { name: /개인정보처리방침/ })
    expect(link.getAttribute('href')).toBe('/legal/privacy')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })
})
