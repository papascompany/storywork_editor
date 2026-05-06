/**
 * apps/web/app/api/_lib/prisma.ts
 *
 * Route Handler 전용 Prisma Client 싱글턴.
 * Next.js 개발 모드에서 HMR 로 인한 다중 인스턴스 방지.
 */

import { PrismaClient } from '@prisma/client'

// globalThis 에 캐시 (Next.js dev 모드 HMR 대응)
const globalForPrisma = globalThis as unknown as { _prisma?: PrismaClient }

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma._prisma) {
    globalForPrisma._prisma = new PrismaClient({
      log: process.env['NODE_ENV'] === 'development' ? ['error', 'warn'] : ['error'],
    })
  }
  return globalForPrisma._prisma
}
