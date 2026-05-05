import type { Meta, StoryObj } from '@storybook/react'
import { LoadingOverlay } from '@storywork/ui'
import * as React from 'react'

/**
 * LoadingOverlay 스토리
 *
 * variant: fullscreen / panel / inline
 * spinnerSize: sm / md / lg
 */

const meta = {
  title: 'UI/LoadingOverlay',
  component: LoadingOverlay,
  parameters: {
    docs: {
      description: {
        component:
          'Loading 상태를 나타내는 오버레이 컴포넌트. fullscreen / panel / inline 세 가지 variant를 제공합니다.',
      },
    },
  },
  tags: ['autodocs'],
  // show 는 required 이므로 기본값 설정
  args: {
    show: true,
  },
  argTypes: {
    show: { control: 'boolean' },
    message: { control: 'text' },
    variant: {
      control: 'select',
      options: ['fullscreen', 'panel', 'inline'],
    },
    spinnerSize: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof LoadingOverlay>

export default meta
type Story = StoryObj<typeof meta>

// ─── Fullscreen ──────────────────────────────────────────────────────────────

export const Fullscreen: Story = {
  name: 'Fullscreen — 전체 화면 오버레이',
  parameters: { layout: 'fullscreen' },
  render: () => {
    function Inner() {
      const [show, setShow] = React.useState(false)
      return (
        <div className="relative h-[400px] bg-[var(--color-surface)] flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              setShow(true)
              setTimeout(() => setShow(false), 2000)
            }}
            className="px-4 py-2 rounded-lg bg-[var(--color-brand-500)] text-white text-sm min-h-[44px]"
          >
            Fullscreen 오버레이 (2초)
          </button>
          <LoadingOverlay
            show={show}
            variant="fullscreen"
            message="PDF 변환 중..."
            spinnerSize="lg"
          />
        </div>
      )
    }
    return <Inner />
  },
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export const Panel: Story = {
  name: 'Panel — 패널 내부 오버레이',
  parameters: { layout: 'centered' },
  render: () => {
    function Inner() {
      const [show, setShow] = React.useState(false)
      return (
        <div className="w-[320px]">
          <div className="relative h-[240px] rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-[var(--color-text-muted)]">패널 컨텐츠</p>
            <button
              type="button"
              onClick={() => {
                setShow(true)
                setTimeout(() => setShow(false), 2000)
              }}
              className="px-3 py-2 rounded-lg bg-[var(--color-brand-500)] text-white text-sm min-h-[44px]"
            >
              Panel 오버레이 (2초)
            </button>
            <LoadingOverlay show={show} variant="panel" message="리소스 불러오는 중..." />
          </div>
        </div>
      )
    }
    return <Inner />
  },
}

// ─── Inline ──────────────────────────────────────────────────────────────────

export const Inline: Story = {
  name: 'Inline — 인라인 스피너',
  parameters: { layout: 'centered' },
  render: () => (
    <div className="flex flex-col gap-4 items-start">
      <LoadingOverlay show variant="inline" message="저장 중..." spinnerSize="sm" />
      <LoadingOverlay show variant="inline" message="업로드 중..." spinnerSize="md" />
      <LoadingOverlay show variant="inline" message="PDF 변환 중..." spinnerSize="lg" />
      <LoadingOverlay show variant="inline" spinnerSize="md" />
    </div>
  ),
}

// ─── 스피너 사이즈 비교 ───────────────────────────────────────────────────────

export const SpinnerSizes: Story = {
  name: '스피너 크기 비교',
  parameters: { layout: 'centered' },
  render: () => (
    <div className="flex items-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <LoadingOverlay show variant="inline" spinnerSize="sm" />
        <span className="text-xs text-[var(--color-text-muted)]">sm</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <LoadingOverlay show variant="inline" spinnerSize="md" />
        <span className="text-xs text-[var(--color-text-muted)]">md</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <LoadingOverlay show variant="inline" spinnerSize="lg" />
        <span className="text-xs text-[var(--color-text-muted)]">lg</span>
      </div>
    </div>
  ),
}

// ─── show=false ──────────────────────────────────────────────────────────────

export const Hidden: Story = {
  name: 'show=false (렌더 없음)',
  parameters: { layout: 'centered' },
  args: {
    show: false,
    message: '이 메시지는 보이지 않습니다',
    variant: 'fullscreen',
  },
  render: (args) => (
    <div className="p-4 text-sm text-[var(--color-text-muted)]">
      LoadingOverlay show=false → null 반환 (DOM에 없음)
      <LoadingOverlay {...args} />
    </div>
  ),
}
