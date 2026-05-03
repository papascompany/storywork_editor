import type { Meta, StoryObj } from '@storybook/react'
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@storywork/ui'
import { Layers, Settings } from 'lucide-react'
import * as React from 'react'

const meta = {
  title: 'UI/Sheet',
  component: Sheet,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '슬라이드 패널 / BottomSheet. side prop 으로 방향 제어. 모바일에서는 bottom 모드로 BottomSheet 로 사용.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Sheet>

export default meta
type Story = StoryObj<typeof meta>

export const RightPanel: Story = {
  name: '오른쪽 패널 (데스크톱)',
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Settings /> 인스펙터 열기
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>인스펙터</SheetTitle>
          <SheetDescription>선택된 객체의 속성을 편집합니다</SheetDescription>
        </SheetHeader>
        <div className="px-6 py-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
              위치
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-text-muted)]" htmlFor="x">
                  X
                </label>
                <input
                  id="x"
                  type="number"
                  defaultValue={100}
                  className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm bg-[var(--color-surface)] text-[var(--color-text)]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-text-muted)]" htmlFor="y">
                  Y
                </label>
                <input
                  id="y"
                  type="number"
                  defaultValue={200}
                  className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm bg-[var(--color-surface)] text-[var(--color-text)]"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
              크기
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-text-muted)]" htmlFor="w">
                  W
                </label>
                <input
                  id="w"
                  type="number"
                  defaultValue={300}
                  className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm bg-[var(--color-surface)] text-[var(--color-text)]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-text-muted)]" htmlFor="h">
                  H
                </label>
                <input
                  id="h"
                  type="number"
                  defaultValue={300}
                  className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm bg-[var(--color-surface)] text-[var(--color-text)]"
                />
              </div>
            </div>
          </div>
        </div>
        <SheetFooter>
          <Button size="sm">적용</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
}

export const BottomSheet: Story = {
  name: 'BottomSheet (모바일)',
  parameters: {
    viewport: { defaultViewport: 'mobile390' },
  },
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Layers /> 레이어 패널
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>레이어</SheetTitle>
          <SheetDescription>캔버스 레이어를 관리합니다</SheetDescription>
        </SheetHeader>
        <div className="px-6 py-4 flex flex-col gap-2">
          {['배경 이미지', '포즈 1', '포즈 2', '말풍선'].map((layer, i) => (
            <div
              key={layer}
              className="flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2 hover:bg-[var(--color-surface-muted)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <div
                  className="size-6 rounded border border-[var(--color-border)] bg-[var(--color-surface-muted)]"
                  aria-hidden="true"
                />
                <span className="text-sm text-[var(--color-text)]">{layer}</span>
              </div>
              <span className="text-xs text-[var(--color-text-disabled)]">{i + 1}</span>
            </div>
          ))}
        </div>
        <SheetFooter>
          <Button variant="outline" size="sm">
            레이어 추가
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
}

export const LeftPanel: Story = {
  name: '왼쪽 패널',
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button>왼쪽 패널 열기</Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>도구 패널</SheetTitle>
        </SheetHeader>
        <div className="px-6 py-4">
          <p className="text-sm text-[var(--color-text-muted)]">편집 도구들이 여기에 배치됩니다.</p>
        </div>
      </SheetContent>
    </Sheet>
  ),
}
