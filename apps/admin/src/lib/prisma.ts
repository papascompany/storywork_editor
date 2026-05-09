/**
 * apps/admin/src/lib/prisma.ts
 *
 * PrismaClient 싱글톤 — Next.js HMR 재생성 방지.
 * 서버 전용. 클라이언트 컴포넌트에서 import 금지.
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient()

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma
}
