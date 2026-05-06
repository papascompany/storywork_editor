/**
 * DB vector 컬럼 확인용 스크립트 (M2-04 검증용)
 * pnpm tsx --tsconfig tsconfig.scripts.json scripts/check-vectors.ts
 */
/* eslint-disable no-console */

import fs from 'node:fs'
import path from 'node:path'

import { PrismaClient } from '@prisma/client'

function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1)
    if (!process.env[k]) process.env[k] = v
  }
}

async function main(): Promise<void> {
  loadEnv()
  const prisma = new PrismaClient()

  interface VecRow {
    id: string
    slug: string
    emb_dims: number | null
    text_dims: number | null
    vis_dims: number | null
  }

  const rows = (await prisma.$queryRaw`
    SELECT
      id,
      slug,
      CASE WHEN embedding IS NOT NULL THEN vector_dims(embedding) ELSE NULL END AS emb_dims,
      CASE WHEN "embeddingText" IS NOT NULL THEN vector_dims("embeddingText") ELSE NULL END AS text_dims,
      CASE WHEN "embeddingVis" IS NOT NULL THEN vector_dims("embeddingVis") ELSE NULL END AS vis_dims
    FROM "Resource"
    LIMIT 10
  `) as VecRow[]

  console.log('Resource vector 컬럼 확인:')
  for (const r of rows) {
    console.log(
      `  ${r.id} | ${r.slug} | embedding=${r.emb_dims ?? 'NULL'} | text=${r.text_dims ?? 'NULL'} | vis=${r.vis_dims ?? 'NULL'}`,
    )
  }

  await prisma.$disconnect()
}

main().catch((err: unknown) => {
  console.error(String(err))
  process.exit(1)
})
