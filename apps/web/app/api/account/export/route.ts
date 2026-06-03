/**
 * GET /api/account/export
 *
 * PIPA(개인정보보호법) + GDPR 권고 패턴 — 데이터 이동권(portability).
 * 본인의 모든 데이터를 JSON으로 다운로드한다.
 *
 * 인증 필수 + 본인 데이터만 포함.
 * service_role 클라이언트 사용 → Prisma 직접 쿼리.
 *
 * LEGAL-OPS-03 / LEGAL-OPS-05
 */
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { createWebServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  // ── 1. 인증 확인 ────────────────────────────────────────────────────────────
  const supabase = await createWebServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  // ── 2. Prisma User 조회 (이메일 기준) ────────────────────────────────────────
  const user = await prisma.user.findUnique({
    where: { email: authUser.email },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
      marketingConsent: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
      projects: {
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          pages: {
            select: {
              id: true,
              index: true,
              fabricJson: true,
              thumbnail: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          sceneDoc: {
            select: {
              id: true,
              scriptRaw: true,
              meta: true,
              createdAt: true,
              scenes: {
                select: {
                  id: true,
                  index: true,
                  slug: true,
                  summary: true,
                  emotion: true,
                  lines: {
                    select: {
                      id: true,
                      index: true,
                      speaker: true,
                      text: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      subscriptions: {
        select: {
          id: true,
          plan: true,
          status: true,
          currentPeriodEnd: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      inquiries: {
        select: {
          id: true,
          subject: true,
          body: true,
          status: true,
          adminReply: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      showcases: {
        select: {
          id: true,
          mode: true,
          likes: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      comments: {
        select: {
          id: true,
          body: true,
          isDeleted: true,
          createdAt: true,
        },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  // ── 3. export 패키지 구성 ───────────────────────────────────────────────────
  const exportedAt = new Date().toISOString()

  const payload = {
    _meta: {
      exportedAt,
      scope: [
        'profile',
        'projects',
        'pages',
        'sceneDocs',
        'subscriptions',
        'inquiries',
        'showcases',
        'comments',
      ],
      retentionInfo: '탈퇴 후 30일간 보관, 이후 영구 삭제됩니다.',
      pipaRights:
        '본 데이터는 개인정보보호법 제35조(개인정보의 열람)에 따라 제공됩니다. ' +
        '정정 요청: privacy@storywork.kr',
      service: 'StoryWork (storywork.kr)',
    },
    profile: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      marketingConsent: user.marketingConsent,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    projects: user.projects,
    subscriptions: user.subscriptions,
    inquiries: user.inquiries,
    showcases: user.showcases,
    comments: user.comments,
  }

  // ── 4. Content-Disposition 파일 다운로드 응답 ────────────────────────────────
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `storywork-user-data-${timestamp}.json`

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, no-cache',
    },
  })
}
