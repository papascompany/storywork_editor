/**
 * webtoon-export.test.tsx — MODE-05 웹툰 이미지 다운로드 배선
 *
 * 1. runWebtoonExport — 1장이면 이미지 그대로, 여러 장이면 ZIP · 내보내기 직전 getPages 호출
 * 2. DownloadMenu 웹툰 모드 — 캔버스 없이 활성, 인쇄 경로(PDF·프리플라이트)·PNG/JSON 숨김
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PageFormat } from '../components/editor/store/usePageStore'

vi.mock('@storywork/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    Tooltip: ({ children }: { children: React.ReactElement }) => children,
    showToast: vi.fn(),
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: { children: React.ReactElement }) => children,
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuItem: ({
      children,
      onSelect,
      disabled,
      ...rest
    }: {
      children: React.ReactNode
      onSelect?: () => void
      disabled?: boolean
      [key: string]: unknown
    }) => (
      <button type="button" onClick={onSelect} disabled={disabled} {...rest}>
        {children}
      </button>
    ),
    DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
  }
})

const exportWebtoon = vi.fn()
const createStoreZip = vi.fn((_entries: { name: string }[]) => new Uint8Array([0x50, 0x4b]))

vi.mock('@storywork/editor-export', () => ({
  exportWebtoon,
  createStoreZip,
  exportPng: vi.fn(),
  exportJson: vi.fn(),
}))

const WEBTOON_FORMAT: PageFormat = {
  name: '웹툰 690',
  unit: 'px',
  widthMm: 690,
  heightMm: 1280,
  dpi: 72,
  bleedMm: 0,
  safeMm: 0,
}

function file(name: string) {
  return { name, blob: new Blob([name], { type: 'image/png' }), width: 690, height: 1280 }
}

let downloads: string[] = []

beforeEach(() => {
  downloads = []
  exportWebtoon.mockReset()
  createStoreZip.mockClear()
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock'),
    revokeObjectURL: vi.fn(),
  })
  // <a download> 클릭을 가로채 파일명만 기록 — jsdom 은 실제 다운로드를 하지 않는다
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push(this.download)
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('runWebtoonExport', () => {
  it('결과가 1장이면 이미지를 그대로 내려받는다', async () => {
    exportWebtoon.mockResolvedValue({ layout: 'long', files: [file('1화.png')] })
    const getPages = vi.fn(() => [{ v: 1 }, null])
    const { runWebtoonExport } = await import('../components/editor/webtoon/webtoonExport')

    const out = await runWebtoonExport({ format: WEBTOON_FORMAT, getPages }, 'long', '1화')

    expect(getPages).toHaveBeenCalledOnce()
    expect(exportWebtoon).toHaveBeenCalledWith(
      [{ v: 1 }, null],
      { id: 'webtoon-export', unit: 'px', widthMm: 690, heightMm: 1280, dpi: 72 },
      expect.objectContaining({ layout: 'long', fileBaseName: '1화', background: '#ffffff' }),
    )
    expect(createStoreZip).not.toHaveBeenCalled()
    expect(out).toEqual({ fileName: '1화.png', imageCount: 1 })
    expect(downloads).toEqual(['1화.png'])
  })

  it('여러 장이면 ZIP 하나로 묶는다', async () => {
    exportWebtoon.mockResolvedValue({
      layout: 'sequence',
      files: [file('ep_001.png'), file('ep_002.png')],
    })
    const { runWebtoonExport } = await import('../components/editor/webtoon/webtoonExport')

    const out = await runWebtoonExport(
      { format: WEBTOON_FORMAT, getPages: () => [{}, {}] },
      'sequence',
      'ep',
    )

    const entries = createStoreZip.mock.calls[0]?.[0] ?? []
    expect(entries.map((e) => e.name)).toEqual(['ep_001.png', 'ep_002.png'])
    expect(out).toEqual({ fileName: 'ep.zip', imageCount: 2 })
    expect(downloads).toEqual(['ep.zip'])
  })

  it('파일명의 경로 문자를 치환한다', async () => {
    exportWebtoon.mockResolvedValue({ layout: 'long', files: [file('a.png'), file('b.png')] })
    const { runWebtoonExport } = await import('../components/editor/webtoon/webtoonExport')

    const out = await runWebtoonExport(
      { format: WEBTOON_FORMAT, getPages: () => [] },
      'long',
      '1/2화:예고',
    )

    expect(exportWebtoon.mock.calls[0]?.[2]).toMatchObject({ fileBaseName: '1_2화_예고' })
    expect(out.fileName).toBe('1_2화_예고_long.zip')
  })
})

describe('DownloadMenu — 웹툰 모드', () => {
  it('캔버스 없이도 활성이고 웹툰 출력만 보인다', async () => {
    const { DownloadMenu } = await import('../components/editor/DownloadMenu')
    render(
      <DownloadMenu
        canvas={null}
        layerTree={null}
        fileName="1화"
        projectId="p1"
        webtoon={{ format: WEBTOON_FORMAT, getPages: () => [] }}
      />,
    )

    expect(screen.getByTestId('download-menu-trigger')).toBeEnabled()
    expect(screen.getByTestId('download-webtoon-sequence')).toBeEnabled()
    expect(screen.getByTestId('download-webtoon-long')).toBeEnabled()
    // 인쇄 경로·단일 캔버스 출력은 숨긴다(px 판형은 서버가 PDF·프리플라이트를 거부)
    for (const id of ['download-png', 'download-json', 'download-pdf', 'preflight-check']) {
      expect(screen.queryByTestId(id)).not.toBeInTheDocument()
    }
  })

  it('이미지 시퀀스 선택 → sequence 레이아웃으로 내보낸다', async () => {
    exportWebtoon.mockResolvedValue({ layout: 'sequence', files: [file('1화_001.png')] })
    const { DownloadMenu } = await import('../components/editor/DownloadMenu')
    render(
      <DownloadMenu
        canvas={null}
        layerTree={null}
        fileName="1화"
        webtoon={{ format: WEBTOON_FORMAT, getPages: () => [{}] }}
      />,
    )

    await userEvent.click(screen.getByTestId('download-webtoon-sequence'))

    await vi.waitFor(() => expect(downloads).toEqual(['1화_001.png']))
    expect(exportWebtoon.mock.calls[0]?.[2]).toMatchObject({ layout: 'sequence' })
  })

  it('웹툰이 아니면 기존 메뉴(PNG·JSON·PDF) 그대로', async () => {
    const { DownloadMenu } = await import('../components/editor/DownloadMenu')
    const canvas = {} as Parameters<typeof DownloadMenu>[0]['canvas']
    render(<DownloadMenu canvas={canvas} layerTree={null} fileName="책" />)

    expect(screen.getByTestId('download-png')).toBeInTheDocument()
    expect(screen.getByTestId('download-pdf')).toBeInTheDocument()
    expect(screen.queryByTestId('download-webtoon-sequence')).not.toBeInTheDocument()
  })
})
