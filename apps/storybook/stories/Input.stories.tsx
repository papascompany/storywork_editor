import type { Meta, StoryObj } from '@storybook/react'
import { Input } from '@storywork/ui'
import { Search, Eye } from 'lucide-react'
import * as React from 'react'

const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '텍스트 입력 컴포넌트. 레이블, 도움말, 에러 메시지를 지원합니다. 44px 최소 높이.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['default', 'error'] },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
    helperText: { control: 'text' },
    errorText: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: '이메일',
    placeholder: 'user@example.com',
    type: 'email',
  },
}

export const WithHelperText: Story = {
  args: {
    label: '사용자명',
    placeholder: 'storywork_user',
    helperText: '4~20자, 영문/숫자/_ 만 사용 가능',
  },
}

export const ErrorState: Story = {
  args: {
    label: '비밀번호',
    type: 'password',
    placeholder: '비밀번호 입력',
    variant: 'error',
    errorText: '8자 이상, 숫자와 특수문자를 포함해야 합니다',
    defaultValue: '123',
  },
}

export const Disabled: Story = {
  args: {
    label: '이메일 (변경 불가)',
    value: 'admin@storywork.io',
    disabled: true,
  },
}

export const WithStartAdornment: Story = {
  args: {
    label: '검색',
    placeholder: '포즈 검색...',
    startAdornment: <Search />,
  },
}

export const WithEndAdornment: Story = {
  args: {
    label: '비밀번호',
    type: 'password',
    placeholder: '비밀번호 입력',
    endAdornment: <Eye />,
  },
}

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <Input label="기본" placeholder="입력..." />
      <Input label="포커스 (탭으로 이동)" placeholder="탭 키로 포커스" />
      <Input label="에러" variant="error" errorText="필수 입력 항목입니다" defaultValue="" />
      <Input label="비활성" disabled value="수정 불가" />
      <Input
        label="도움말 포함"
        helperText="이메일 형식으로 입력하세요"
        placeholder="user@example.com"
      />
    </div>
  ),
}
