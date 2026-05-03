// 서버 전용 모듈 — 클라이언트에서 import 시 빌드 실패
import 'server-only'

import { PrismaClient } from '@prisma/client'

// ─────────────────────────────────────────────
// PrismaClient 싱글턴 (개발 핫 리로드 메모리 누수 방지)
// ─────────────────────────────────────────────

declare global {
  var __prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma: PrismaClient = globalThis.__prisma ?? createPrismaClient()

if (process.env['NODE_ENV'] !== 'production') {
  globalThis.__prisma = prisma
}

// ─────────────────────────────────────────────
// Prisma 타입 re-export (서버 코드에서 편의 사용)
// ─────────────────────────────────────────────

export type {
  User,
  Subscription,
  Format,
  Template,
  TemplateSet,
  Resource,
  Project,
  Page,
  SceneDoc,
  Scene,
  Line,
  PublishJob,
  Showcase,
  Reaction,
  ContestSeason,
  AuditLog,
  // Enum types
  Role,
  ResourceKind,
  ResourceFormat,
  OwnerType,
  ResourceStatus,
  ProjectStatus,
  JobStatus,
  ShowcaseMode,
} from '@prisma/client'

export { Prisma } from '@prisma/client'

// ─────────────────────────────────────────────
// pgvector raw SQL 헬퍼
// Unsupported 컬럼은 Prisma queryRaw 로만 접근
// ─────────────────────────────────────────────

/**
 * 코사인 유사도 기반 Resource 벡터 검색
 * @param embedding 1024차원 쿼리 벡터 (float 배열)
 * @param limit 반환 개수
 * @param column 검색 대상 컬럼 ('embedding' | 'embeddingText' | 'embeddingVis')
 */
export async function searchResourcesByVector(
  embedding: number[],
  limit = 20,
  column: 'embedding' | 'embeddingText' | 'embeddingVis' = 'embedding',
): Promise<Array<{ id: string; similarity: number }>> {
  const colName =
    column === 'embedding'
      ? 'embedding'
      : column === 'embeddingText'
        ? '"embeddingText"'
        : '"embeddingVis"'

  const vectorLiteral = `[${embedding.join(',')}]`

  const results = await prisma.$queryRawUnsafe<Array<{ id: string; similarity: number }>>(
    `SELECT id, 1 - (${colName} <=> $1::vector) AS similarity
     FROM "Resource"
     WHERE ${colName} IS NOT NULL
     ORDER BY ${colName} <=> $1::vector
     LIMIT $2`,
    vectorLiteral,
    limit,
  )

  return results
}
