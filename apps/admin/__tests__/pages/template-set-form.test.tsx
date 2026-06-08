/**
 * template-set-form.test.tsx
 *
 * TemplateSetEditClient 표지 오버라이드 컨트롤 렌더/동작 검증.
 * (서버 page 가 아닌 client 컴포넌트를 mock props 로 직접 렌더)
 */
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

global.fetch = vi.fn()

import { TemplateSetEditClient } from '../../app/(dashboard)/template-sets/[id]/TemplateSetEditClient'
import type { TemplateSetData } from '../../app/(dashboard)/template-sets/[id]/TemplateSetEditClient'

const BASE_SET: TemplateSetData = {
  id: 'set-1',
  name: '24p 책 세트',
  coverIdx: 0,
  coverEnabled: null,
  coverWidthMm: null,
  coverHeightMm: null,
  isActive: true,
  templates: [
    { id: 't1', name: '표지', thumbnail: null, slotCount: 2, formatName: 'B5' },
    { id: 't2', name: '내지1', thumbnail: null, slotCount: 3, formatName: 'B5' },
  ],
}

describe('TemplateSetEditClient — 표지 오버라이드', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ id: 'set-1' }),
    })
  })

  it('표지 오버라이드 컨트롤(표지 사용 select / 폭 / 높이 / 세트 활성화)이 렌더된다', () => {
    render(<TemplateSetEditClient set={BASE_SET} userRole="curator" />)
    expect(screen.getByLabelText('표지 사용')).toBeDefined()
    expect(screen.getByLabelText(/표지 폭/)).toBeDefined()
    expect(screen.getByLabelText(/표지 높이/)).toBeDefined()
    expect(screen.getByRole('switch', { name: '세트 활성화' })).toBeDefined()
  })

  it('coverEnabled=null 이면 select 가 "상속" 으로 초기화된다', () => {
    render(<TemplateSetEditClient set={BASE_SET} userRole="curator" />)
    const select = screen.getByLabelText('표지 사용') as HTMLSelectElement
    expect(select.value).toBe('inherit')
  })

  it('coverEnabled=false 이면 select 가 "미사용(off)" 으로 초기화된다', () => {
    render(<TemplateSetEditClient set={{ ...BASE_SET, coverEnabled: false }} userRole="curator" />)
    const select = screen.getByLabelText('표지 사용') as HTMLSelectElement
    expect(select.value).toBe('off')
  })

  it('저장 시 표지 오버라이드가 PATCH body 에 포함된다', async () => {
    render(
      <TemplateSetEditClient
        set={{ ...BASE_SET, coverEnabled: true, coverWidthMm: 408 }}
        userRole="curator"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    await vi.waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/template-sets/set-1',
        expect.objectContaining({ method: 'PATCH' }),
      )
    })
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse((call?.[1] as { body: string }).body) as Record<string, unknown>
    expect(body.coverEnabled).toBe(true)
    expect(body.coverWidthMm).toBe(408)
    expect(body.isActive).toBe(true)
  })
})
