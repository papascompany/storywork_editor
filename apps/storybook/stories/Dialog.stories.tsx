import type { Meta, StoryObj } from '@storybook/react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@storywork/ui'
import { Trash2 } from 'lucide-react'
import * as React from 'react'

const meta = {
  title: 'UI/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '확인/경고 모달. Radix Dialog 래핑. 키보드 탐색, 포커스 트랩, ESC 닫기 자동 지원.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>다이얼로그 열기</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>제목</DialogTitle>
          <DialogDescription>
            다이얼로그의 설명 텍스트입니다. 사용자에게 필요한 정보를 여기에 작성합니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary">취소</Button>
          <Button variant="default">확인</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const ConfirmDelete: Story = {
  name: '삭제 확인',
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 /> 프로젝트 삭제
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>프로젝트를 삭제하겠습니까?</DialogTitle>
          <DialogDescription>
            이 작업은 되돌릴 수 없습니다. 프로젝트와 관련된 모든 페이지, AI 분석 결과가 영구적으로
            삭제됩니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary">취소</Button>
          <Button variant="destructive">삭제</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

// 독립 컴포넌트로 분리해 훅 규칙 준수
const FormDialogExample = () => {
  const [open, setOpen] = React.useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">새 판형 추가</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 판형 추가</DialogTitle>
          <DialogDescription>인쇄 규격을 입력하세요.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-text)]" htmlFor="story-width">
                너비 (mm)
              </label>
              <input
                id="story-width"
                type="number"
                placeholder="148"
                className="h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-base bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium text-[var(--color-text)]"
                htmlFor="story-height"
              >
                높이 (mm)
              </label>
              <input
                id="story-height"
                type="number"
                placeholder="210"
                className="h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-base bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={() => setOpen(false)}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const FormDialog: Story = {
  name: '폼 다이얼로그',
  render: () => <FormDialogExample />,
}
