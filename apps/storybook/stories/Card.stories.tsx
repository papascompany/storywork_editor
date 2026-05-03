import type { Meta, StoryObj } from '@storybook/react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@storywork/ui'
import { FileText, Image, Users } from 'lucide-react'
import * as React from 'react'

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Article/StatCard 베이스 카드 컴포넌트. CardHeader, CardContent, CardFooter 로 구성됩니다.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>제목</CardTitle>
        <CardDescription>카드에 대한 간단한 설명입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[var(--color-text-muted)]">
          카드 본문 내용이 여기에 들어갑니다.
        </p>
      </CardContent>
      <CardFooter>
        <Button size="sm">확인</Button>
        <Button variant="ghost" size="sm">
          취소
        </Button>
      </CardFooter>
    </Card>
  ),
}

export const StatCards: Story = {
  name: 'StatCard 예시',
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {[
        { icon: FileText, label: '총 프로젝트', value: '128', color: 'var(--color-brand-500)' },
        {
          icon: Image,
          label: '포즈 리소스',
          value: '1,058',
          color: 'var(--color-pose-500, #ec4899)',
        },
        { icon: Users, label: '활성 사용자', value: '42', color: 'var(--color-accent-500)' },
      ].map(({ icon: Icon, label, value, color }) => (
        <Card key={label} className="min-w-[160px]">
          <CardHeader>
            <div
              className="mb-2 flex size-9 items-center justify-center rounded-[var(--radius-md)]"
              style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
            >
              <Icon className="size-4" style={{ color }} aria-hidden="true" />
            </div>
            <CardDescription>{label}</CardDescription>
            <CardTitle className="text-2xl">{value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  ),
}

export const ArticleCard: Story = {
  name: 'Article 카드',
  render: () => (
    <Card className="w-72 overflow-hidden">
      <div
        className="h-36 bg-gradient-to-br from-[var(--color-brand-100)] to-[var(--color-accent-100)] dark:from-[var(--color-brand-900)] dark:to-[var(--color-accent-900)]"
        aria-hidden="true"
      />
      <CardHeader>
        <div className="flex items-center gap-1">
          <span className="rounded-full bg-[var(--color-brand-100)] px-2 py-0.5 text-xs text-[var(--color-brand-700)] dark:bg-[var(--color-brand-900)] dark:text-[var(--color-brand-300)]">
            스토리
          </span>
        </div>
        <CardTitle>나의 첫 번째 스토리보드</CardTitle>
        <CardDescription>4컷 만화 — AI 대본 분석 완료</CardDescription>
      </CardHeader>
      <CardFooter className="justify-between">
        <span className="text-xs text-[var(--color-text-muted)]">2026.05.02</span>
        <Button size="sm" variant="outline">
          편집
        </Button>
      </CardFooter>
    </Card>
  ),
}
