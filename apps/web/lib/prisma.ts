/**
 * apps/web/lib/prisma.ts
 *
 * Prisma Client 싱글턴 — 서버 사이드 전용.
 * Next.js 개발 모드 HMR 시 다중 인스턴스 방지를 위해 globalThis 에 캐시.
 * apps/web/app/api/_lib/prisma.ts 와 동일 패턴; lib 계층에서 공통 사용.
 */

import { PrismaClient } from '@prisma/client'

// globalThis 에 캐시 (Next.js dev 모드 HMR 대응)
const globalForPrisma = globalThis as unknown as { _webPrisma?: PrismaClient }

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma._webPrisma) {
    globalForPrisma._webPrisma = new PrismaClient({
      log: process.env['NODE_ENV'] === 'development' ? ['error', 'warn'] : ['error'],
    })
  }
  return globalForPrisma._webPrisma
}

/** 편의 export — import { prisma } from '@/lib/prisma' */
export const prisma = getPrismaClient()
