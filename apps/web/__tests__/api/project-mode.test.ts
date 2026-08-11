/**
 * project-mode.test.ts — 산출물 모드 저장 정합 (MODE-04c / ADR-0017)
 *
 * 핵심 계약: **`Project.mode` 는 판형 단위계에서 도출된 파생값**이다.
 * 클라이언트가 보낸 mode 를 믿거나, 판형만 바꾸고 mode 를 안 고치면
 * `mode=pod + unit=px` 같은 모순 레코드가 남아 편집기·출력 경로가 갈라진다.
 *
 * 검증 항목:
 *  - 신규 생성 시 mode 가 판형에서 도출돼 저장된다
 *  - **판형을 바꾸는 업데이트에서 mode 도 함께 갱신된다** (가장 새기 쉬운 구멍)
 *  - 클라이언트가 mode 를 보내도 무시된다 (신뢰 경계)
 */
import type { NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── 모듈 모킹 (라우트 import 전에 선언) ─────────────────────────────────────

const mockGetPrismaClient = vi.fn()
vi.mock('../../app/api/_lib/prisma', () => ({
  getPrismaClient: () => mockGetPrismaClient(),
}))

const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createWebServerClient: () => Promise.resolve({ auth: { getUser: () => mockGetUser() } }),
}))

vi.mock('../../app/api/_lib/require-active-user', () => ({
  guardDeletedUser: () => null,
}))

const MOCK_USER = { id: 'user-1', email: 'test@example.com', deletedAt: null }
const MM_FORMAT = { id: 'preset-b5-novel', unit: 'mm', widthMm: 130, heightMm: 200, dpi: 300 }

const VALID_PAGE = { index: 0, fabricJson: {}, thumbnail: undefined }

interface PrismaOverrides {
  format?: unknown
  existingProject?: unknown
}

function makePrisma(o: PrismaOverrides = {}) {
  const projectUpdate = vi.fn().mockResolvedValue({ id: 'project-1' })
  const projectCreate = vi.fn().mockResolvedValue({ id: 'project-1' })
  return {
    _spies: { projectUpdate, projectCreate },
    user: { findUnique: vi.fn().mockResolvedValue(MOCK_USER) },
    format: { findUnique: vi.fn().mockResolvedValue(o.format ?? MM_FORMAT) },
    project: {
      findUnique: vi
        .fn()
        .mockResolvedValue(o.existingProject ?? { id: 'project-1', ownerId: 'user-1' }),
      update: projectUpdate,
      create: projectCreate,
    },
    page: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn().mockResolvedValue({ id: 'page-1' }),
    },
    $transaction: vi.fn().mockResolvedValue([]),
  }
}

async function callSave(body: Record<string, unknown>) {
  const { POST } = await import('../../app/api/projects/save/route')
  const req = new Request('http://localhost/api/projects/save', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const res = (await POST(req)) as NextResponse
  return { status: res.status, data: (await res.json()) as unknown }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { email: MOCK_USER.email } }, error: null })
})

describe('POST /api/projects/save — mode 정합 (MODE-04c)', () => {
  it('신규 생성 시 mode 를 판형에서 도출해 저장한다', async () => {
    const prisma = makePrisma()
    mockGetPrismaClient.mockReturnValue(prisma)

    const { status } = await callSave({
      title: '새 작품',
      formatId: 'preset-b5-novel',
      pages: [VALID_PAGE],
    })

    expect(status).toBe(200)
    expect(prisma._spies.projectCreate).toHaveBeenCalledTimes(1)
    const arg = prisma._spies.projectCreate.mock.calls[0]?.[0] as { data: { mode: string } }
    expect(arg.data.mode).toBe('pod')
  })

  it('클라이언트가 보낸 mode 는 무시된다 (판형이 유일한 진실)', async () => {
    const prisma = makePrisma()
    mockGetPrismaClient.mockReturnValue(prisma)

    // mm 판형인데 webtoon 을 주장 — 받아들이면 모순 레코드가 된다
    const { status } = await callSave({
      title: '새 작품',
      formatId: 'preset-b5-novel',
      mode: 'webtoon',
      pages: [VALID_PAGE],
    })

    expect(status).toBe(200)
    const arg = prisma._spies.projectCreate.mock.calls[0]?.[0] as { data: { mode: string } }
    expect(arg.data.mode).toBe('pod')
  })

  it('업데이트에서도 mode 가 판형을 따라간다 (판형만 바뀌고 mode 가 남는 구멍 차단)', async () => {
    const prisma = makePrisma()
    mockGetPrismaClient.mockReturnValue(prisma)

    const { status } = await callSave({
      projectId: 'project-1',
      title: '기존 작품',
      formatId: 'preset-b5-novel',
      pages: [VALID_PAGE],
    })

    expect(status).toBe(200)
    // 트랜잭션 배열에 project.update 가 mode 를 포함해 들어갔는지
    expect(prisma._spies.projectUpdate).toHaveBeenCalledTimes(1)
    const arg = prisma._spies.projectUpdate.mock.calls[0]?.[0] as { data: { mode: string } }
    expect(arg.data.mode).toBe('pod')
  })

  it('px(웹툰) 판형은 아직 400 — 게이트는 MODE-05 와 한 세트로 연다', async () => {
    const prisma = makePrisma({
      format: { id: 'preset-webtoon-690', unit: 'px', widthMm: 690, heightMm: 1280, dpi: 72 },
    })
    mockGetPrismaClient.mockReturnValue(prisma)

    const { status, data } = await callSave({
      title: '웹툰',
      formatId: 'preset-webtoon-690',
      pages: [VALID_PAGE],
    })

    expect(status).toBe(400)
    expect((data as { error: string }).error).toContain('웹툰')
    // 거부됐으므로 레코드가 만들어지지 않아야 한다
    expect(prisma._spies.projectCreate).not.toHaveBeenCalled()
  })
})

// ─── 조회 경로 ────────────────────────────────────────────────────────────────

describe('GET /api/projects/[id] — 판형 실치수 응답 (MODE-04c)', () => {
  const PROJECT_ROW = {
    id: 'project-1',
    ownerId: 'user-1',
    title: '기존 작품',
    formatId: 'fmt-b6',
    status: 'draft',
    mode: 'pod',
    settings: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    // 폴백(128×182@350)과 **다른** 판형이어야 폴백을 안 쓴다는 게 증명된다
    format: {
      id: 'fmt-b6',
      name: 'B6 만화',
      unit: 'mm',
      widthMm: 130,
      heightMm: 200,
      dpi: 300,
      bleedMm: 3,
      safeMm: 5,
    },
    pages: [],
  }

  async function callGet(row: unknown) {
    mockGetPrismaClient.mockReturnValue({
      user: { findUnique: vi.fn().mockResolvedValue(MOCK_USER) },
      project: { findUnique: vi.fn().mockResolvedValue(row) },
    })
    const { GET } = await import('../../app/api/projects/[id]/route')
    const res = (await GET(new Request('http://localhost/api/projects/project-1'), {
      params: Promise.resolve({ id: 'project-1' }),
    })) as NextResponse
    return { status: res.status, data: (await res.json()) as Record<string, never> }
  }

  it('응답에 mode 와 판형 실치수(unit 포함)가 담긴다', async () => {
    const { status, data } = await callGet(PROJECT_ROW)
    expect(status).toBe(200)

    const project = (data as unknown as { project: Record<string, unknown> }).project
    expect(project['mode']).toBe('pod')
    expect(project['format']).toEqual({
      name: 'B6 만화',
      unit: 'mm',
      widthMm: 130,
      heightMm: 200,
      dpi: 300,
      bleedMm: 3,
      safeMm: 5,
    })
  })

  it('px 작품은 unit=px 와 mode=webtoon 을 그대로 내려준다 (편집기 뷰 분기 근거)', async () => {
    const { status, data } = await callGet({
      ...PROJECT_ROW,
      mode: 'webtoon',
      formatId: 'preset-webtoon-690',
      format: {
        id: 'preset-webtoon-690',
        name: '웹툰 690',
        unit: 'px',
        widthMm: 690,
        heightMm: 1280,
        dpi: 72,
        bleedMm: 0,
        safeMm: 0,
      },
    })

    expect(status).toBe(200)
    const project = (data as unknown as { project: { mode: string; format: { unit: string } } })
      .project
    // 폴백은 unit 이 없어서 웹툰 작품도 POD 페이지 뷰로 열렸다 — 이제 서버가 알려준다
    expect(project.format.unit).toBe('px')
    expect(project.mode).toBe('webtoon')
  })
})
