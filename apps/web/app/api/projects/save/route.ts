/**
 * POST /api/projects/save — 작품 저장 (로그인 필수)
 *
 * Body:
 *   { projectId?: string, title: string, formatId: string,
 *     pages: Array<{ index: number, fabricJson: object, thumbnail?: string }> }
 *
 * 동작:
 *   - projectId 있으면 update + Page upsert
 *   - 없으면 create (새 Project)
 *
 * 인증:
 *   - Supabase 세션 확인 → 미인증 401
 *   - 기존 projectId 가 있으면 소유권 확인 → 불일치 403
 *
 * 사용자 조회 전략:
 *   - Supabase auth user.email 기준으로 Prisma User row 를 조회
 *   - cuid(Prisma) ↔ uuid(Supabase) 미스매치 우회
 */

/* eslint-disable import/order */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createWebServerClient } from '@/lib/supabase/server'
import { resolveFormatId } from '@/lib/format-mapping'
import { getPrismaClient } from '../../_lib/prisma'
/* eslint-enable import/order */

// ─── Zod 스키마 ───────────────────────────────────────────────────────────────

const PageInputSchema = z.object({
  index: z.number().int().min(0),
  // Prisma InputJsonValue 와 호환: record 는 string key 만 허용
  fabricJson: z.record(z.string(), z.unknown()),
  thumbnail: z.string().optional(),
})

const SaveProjectBodySchema = z.object({
  projectId: z.string().optional(),
  title: z.string().min(1).max(200),
  formatId: z.string().min(1),
  /** FOLLOWUP-COVER-02: 표지 설정 — Project.settings.cover 로 영속화 (마이그레이션 불요) */
  cover: z
    .object({
      widthMm: z.number().min(10).max(1500),
      heightMm: z.number().min(10).max(1500),
    })
    .nullable()
    .optional(),
  pages: z.array(PageInputSchema).min(1).max(100),
})

type SaveProjectBody = z.infer<typeof SaveProjectBodySchema>

// ─── 응답 타입 ────────────────────────────────────────────────────────────────

type SaveProjectResponse = {
  projectId: string
  savedAt: string
}

// ─── 에러 응답 헬퍼 ───────────────────────────────────────────────────────────

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

// ─── 사용자 조회 헬퍼 (이메일 기준) ──────────────────────────────────────────

/**
 * Supabase auth 이메일로 Prisma User row 를 조회한다.
 * Supabase uid(uuid) ↔ Prisma id(cuid) 미스매치를 우회하는 표준 패턴.
 */
async function findUserByEmail(email: string) {
  const prisma = getPrismaClient()
  return prisma.user.findUnique({ where: { email } })
}

// ─── POST /api/projects/save ─────────────────────────────────────────────────

export async function POST(req: Request): Promise<NextResponse> {
  // 1. 인증 확인
  const supabase = await createWebServerClient()
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser?.email) {
    return jsonError('로그인이 필요합니다.', 401)
  }

  // 2. Prisma 사용자 조회 (이메일 기준)
  const dbUser = await findUserByEmail(authUser.email)
  if (!dbUser) {
    // 인증은 됐지만 DB row 없음 — 회원가입 직후 동기화 지연 케이스
    return jsonError('사용자 정보를 찾을 수 없습니다. 잠시 후 다시 시도해 주세요.', 404)
  }

  // 3. 요청 바디 파싱 + Zod 검증
  let body: SaveProjectBody
  try {
    const raw: unknown = await req.json()
    body = SaveProjectBodySchema.parse(raw)
  } catch {
    return jsonError('요청 형식이 올바르지 않습니다.', 400)
  }

  const { projectId, title, pages } = body
  // preset:b5-novel 형태의 클라이언트 ID → DB ID (preset-b5-novel) 로 정규화
  const formatId = resolveFormatId(body.formatId)
  const prisma = getPrismaClient()
  const now = new Date()
  // 표지 설정 → Project.settings Json (cover 미사용 시 null 로 명시 저장)
  const settings = { cover: body.cover ?? null }

  // 4. Format 존재 확인
  const format = await prisma.format.findUnique({ where: { id: formatId } })
  if (!format) {
    return jsonError(
      `지원하지 않는 판형입니다 (formatId=${body.formatId}). 관리자에게 문의하세요.`,
      400,
    )
  }

  try {
    let savedProjectId: string

    if (projectId) {
      // ── 기존 프로젝트 업데이트 ────────────────────────────────────────────

      // 소유권 확인
      const existing = await prisma.project.findUnique({ where: { id: projectId } })
      if (!existing) {
        return jsonError('프로젝트를 찾을 수 없습니다.', 404)
      }
      if (existing.ownerId !== dbUser.id) {
        return jsonError('이 프로젝트에 접근할 권한이 없습니다.', 403)
      }

      // 프로젝트 메타 업데이트 + 페이지 재생성을 단일 트랜잭션으로 원자 처리.
      // (비원자 처리 시 deleteMany 성공 후 createMany 실패하면 작품 페이지가 전멸 →
      //  사용자 창작물 조용한 영구 소실. audit: projects/save 비원자적 저장 수정.)
      // 페이지 전략: 기존 전체 삭제 후 재생성(순서/index 정합 보장).
      await prisma.$transaction([
        prisma.project.update({
          where: { id: projectId },
          data: { title, formatId, settings, updatedAt: now },
        }),
        prisma.page.deleteMany({ where: { projectId } }),
        prisma.page.createMany({
          data: pages.map((p) => ({
            projectId,
            index: p.index,
            // Prisma InputJsonValue 캐스팅: Record<string,unknown> → JSON
            fabricJson: p.fabricJson as Parameters<
              typeof prisma.page.create
            >[0]['data']['fabricJson'],
            thumbnail: p.thumbnail ?? null,
          })),
        }),
      ])

      savedProjectId = projectId
    } else {
      // ── 신규 프로젝트 생성 ────────────────────────────────────────────────

      const defaultTitle =
        title ||
        `이름 없는 작품 — ${now.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}`

      const created = await prisma.project.create({
        data: {
          ownerId: dbUser.id,
          formatId,
          title: defaultTitle,
          status: 'drafting',
          settings,
          pages: {
            create: pages.map((p) => ({
              index: p.index,
              fabricJson: p.fabricJson as Parameters<
                typeof prisma.page.create
              >[0]['data']['fabricJson'],
              thumbnail: p.thumbnail ?? null,
            })),
          },
        },
      })

      savedProjectId = created.id
    }

    const response: SaveProjectResponse = {
      projectId: savedProjectId,
      savedAt: now.toISOString(),
    }
    return NextResponse.json(response)
  } catch (err) {
    console.error('[api/projects/save] DB 오류:', err)
    return jsonError('저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', 500)
  }
}
