import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@storywork/ui'
import { Download, Plus, Trash2 } from 'lucide-react'
import * as React from 'react'

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '기본 버튼 컴포넌트. 최소 44×44px 터치 타겟 (WCAG 2.1 AA). 모든 variants 는 CSS 토큰 변수를 사용합니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'ghost', 'outline', 'destructive'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'icon'],
    },
    disabled: { control: 'boolean' },
    asChild: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

// 기본
export const Default: Story = {
  args: {
    children: '저장',
    variant: 'default',
    size: 'md',
  },
}

// 모든 Variants
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 items-center">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="destructive">Destructive</Button>
    </div>
  ),
}

// 모든 Sizes
export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 items-center">
      <Button size="sm">Small</Button>
      <Button size="md">Medium (44px)</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="추가">
        <Plus />
      </Button>
    </div>
  ),
}

// 아이콘 포함
export const WithIcon: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 items-center">
      <Button variant="default">
        <Download /> 다운로드
      </Button>
      <Button variant="outline">
        <Plus /> 새 페이지
      </Button>
      <Button variant="destructive">
        <Trash2 /> 삭제
      </Button>
    </div>
  ),
}

// 비활성
export const Disabled: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button disabled>저장 불가</Button>
      <Button variant="outline" disabled>
        편집 불가
      </Button>
      <Button variant="destructive" disabled>
        삭제 불가
      </Button>
    </div>
  ),
}

// 아이콘 전용 버튼
export const IconButton: Story = {
  render: () => (
    <div className="flex gap-3">
      <Button size="icon" variant="ghost" aria-label="추가">
        <Plus />
      </Button>
      <Button size="icon" variant="outline" aria-label="다운로드">
        <Download />
      </Button>
      <Button size="icon" variant="destructive" aria-label="삭제">
        <Trash2 />
      </Button>
    </div>
  ),
}

// asChild — a 태그로 렌더
export const AsLink: Story = {
  render: () => (
    <Button asChild variant="outline">
      <a href="#test">링크 버튼</a>
    </Button>
  ),
}
