import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '../src/components/Tabs.js'

// ── Tabs 단위 테스트 ──────────────────────────────────────────────────────────

function TestTabs({ onValueChange }: { onValueChange?: (v: string) => void }) {
  return (
    <Tabs defaultValue="a" onValueChange={onValueChange}>
      <TabsList>
        <TabsTrigger value="a">탭 A</TabsTrigger>
        <TabsTrigger value="b">탭 B</TabsTrigger>
      </TabsList>
      <TabsContent value="a">A 콘텐츠</TabsContent>
      <TabsContent value="b">B 콘텐츠</TabsContent>
    </Tabs>
  )
}

describe('Tabs', () => {
  it('기본 탭 콘텐츠가 렌더된다', () => {
    render(<TestTabs />)
    expect(screen.getByText('A 콘텐츠')).toBeInTheDocument()
  })

  it('탭 버튼 두 개 모두 렌더된다', () => {
    render(<TestTabs />)
    expect(screen.getByRole('tab', { name: '탭 A' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '탭 B' })).toBeInTheDocument()
  })

  it('기본 활성 탭은 aria-selected=true', () => {
    render(<TestTabs />)
    const tabA = screen.getByRole('tab', { name: '탭 A' })
    expect(tabA).toHaveAttribute('aria-selected', 'true')
  })

  it('탭 B 클릭 → B 탭이 활성화된다', async () => {
    const user = userEvent.setup()
    render(<TestTabs />)
    const tabB = screen.getByRole('tab', { name: '탭 B' })
    await user.click(tabB)
    expect(tabB).toHaveAttribute('aria-selected', 'true')
  })

  it('탭 B 클릭 → onValueChange 가 호출된다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TestTabs onValueChange={onChange} />)
    const tabB = screen.getByRole('tab', { name: '탭 B' })
    await user.click(tabB)
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('TabsTrigger 에 role=tab 이 있다', () => {
    render(<TestTabs />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
  })

  it('TabsList 에 role=tablist 이 있다', () => {
    render(<TestTabs />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })

  it('비활성 탭은 aria-selected=false', () => {
    render(<TestTabs />)
    const tabB = screen.getByRole('tab', { name: '탭 B' })
    expect(tabB).toHaveAttribute('aria-selected', 'false')
  })

  it('제어 컴포넌트 — value prop 변경 시 해당 탭 활성', () => {
    function Controlled() {
      const [tab, setTab] = React.useState('a')
      return (
        <div>
          <button onClick={() => setTab('b')}>Switch to B</button>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="a">A</TabsTrigger>
              <TabsTrigger value="b">B</TabsTrigger>
            </TabsList>
            <TabsContent value="a">A content</TabsContent>
            <TabsContent value="b">B content</TabsContent>
          </Tabs>
        </div>
      )
    }
    render(<Controlled />)
    fireEvent.click(screen.getByText('Switch to B'))
    expect(screen.getByRole('tab', { name: 'B' })).toHaveAttribute('aria-selected', 'true')
  })
})
