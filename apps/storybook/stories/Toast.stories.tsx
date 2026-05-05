import type { Meta, StoryObj } from '@storybook/react'
import { ToastProvider, showToast, useToast } from '@storywork/ui'
import * as React from 'react'

/**
 * Toast 스토리
 *
 * ToastProvider 를 decorator 로 감싸 모든 스토리에서 동작합니다.
 * 버튼을 클릭하면 실제 토스트가 표시됩니다.
 */

const meta = {
  title: 'UI/Toast',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Toast 알림 시스템. ToastProvider 를 레이아웃에 마운트하고, showToast() 또는 useToast().show() 로 호출합니다.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ─── 개별 Variant ─────────────────────────────────────────────────────────────

function ToastTrigger({
  label,
  variant,
  message,
  duration,
}: {
  label: string
  variant: 'default' | 'success' | 'warning' | 'error' | 'info'
  message: string
  duration?: number
}) {
  return (
    <button
      type="button"
      onClick={() => showToast(message, variant, duration)}
      className="px-4 py-2 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors min-h-[44px]"
    >
      {label}
    </button>
  )
}

export const AllVariants: Story = {
  name: '모든 Variant',
  render: () => (
    <div className="flex flex-col gap-3 items-start">
      <ToastTrigger label="Default 토스트" variant="default" message="기본 알림 메시지입니다." />
      <ToastTrigger label="Success 토스트" variant="success" message="저장이 완료됐습니다." />
      <ToastTrigger label="Warning 토스트" variant="warning" message="저장 공간이 부족합니다." />
      <ToastTrigger
        label="Error 토스트"
        variant="error"
        message="저장에 실패했습니다. 다시 시도해주세요."
      />
      <ToastTrigger label="Info 토스트" variant="info" message="새 버전이 출시됐습니다." />
    </div>
  ),
}

export const LongDuration: Story = {
  name: '긴 duration (10초)',
  render: () => (
    <ToastTrigger
      label="10초 토스트 표시"
      variant="info"
      message="이 토스트는 10초 후 자동으로 사라집니다."
      duration={10000}
    />
  ),
}

export const Persistent: Story = {
  name: '수동 닫기 (Infinity)',
  render: () => (
    <ToastTrigger
      label="닫기 버튼으로만 닫는 토스트"
      variant="warning"
      message="이 토스트는 X 버튼을 눌러야 닫힙니다."
      duration={Infinity}
    />
  ),
}

export const WithAction: Story = {
  name: 'Action 버튼 포함',
  render: () => {
    function Inner() {
      const { show } = useToast()
      return (
        <button
          type="button"
          onClick={() =>
            show({
              message: '변경 사항이 삭제됐습니다.',
              variant: 'error',
              duration: 6000,
              action: {
                label: '실행 취소',
                onClick: () => showToast('실행 취소 완료', 'success'),
              },
            })
          }
          className="px-4 py-2 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors min-h-[44px]"
        >
          Action 포함 토스트 표시
        </button>
      )
    }
    return <Inner />
  },
}

export const MultipleToasts: Story = {
  name: '여러 토스트 동시 표시',
  render: () => (
    <button
      type="button"
      onClick={() => {
        showToast('저장됐습니다', 'success')
        setTimeout(() => showToast('페이지 업로드 완료', 'info', 4000), 300)
        setTimeout(() => showToast('썸네일 생성 중...', 'default', 5000), 600)
      }}
      className="px-4 py-2 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors min-h-[44px]"
    >
      3개 토스트 동시 표시
    </button>
  ),
}
