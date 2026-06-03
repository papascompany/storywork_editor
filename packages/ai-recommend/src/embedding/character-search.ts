/**
 * character-search.ts — Character scope 임베딩 포즈 검색 (M4-02)
 *
 * 처리 순서:
 *  1차: filename-dict 룰 매칭 (M2-03a 재사용) → action keyword 후보 생성
 *  2차: pgvector 시맨틱 검색 (characterId scope 제한)
 *  결합: 룰 신뢰도 + 벡터 유사도 가중 집계 → PoseCandidate[] K개
 *
 * Prisma 의존: 런타임에만 사용 (vitest 테스트 시 mock 주입 가능).
 */

import type { PrismaClient } from '@prisma/client'
import type { SceneMeta } from '@storywork/ai-script'

import { loadDictionary, tagFromFilename } from '../filename-tagger.js'
import { getPoseActionCandidates } from '../rules/pose-rules.js'
import type { PoseCandidate, PoseRuleContext } from '../types.js'

import { embedSceneMeta } from './embed-scene.js'

// ─────────────────────────────────────────────
// DB 어댑터 타입 (Prisma 추상화 — 테스트 mock 허용)
// ─────────────────────────────────────────────

export interface PoseSearchRow {
  id: string
  slug: string
  meta: unknown
  tags: string[]
  score?: number
}

export type PoseDbAdapter = (
  characterId: string,
  queryVec: string,
  limit: number,
) => Promise<PoseSearchRow[]>

// ─────────────────────────────────────────────
// 기본 DB 어댑터 (Prisma raw SQL)
// ─────────────────────────────────────────────

let _prismaClient: unknown | null = null

async function getPrisma(): Promise<PrismaClient> {
  if (_prismaClient) return _prismaClient as PrismaClient
  // dynamic import — 서버 환경에서만 실행
  const { PrismaClient: PC } = await import('@prisma/client')
  _prismaClient = new PC()
  return _prismaClient as PrismaClient
}

/**
 * 기본 Prisma 기반 DB 어댑터.
 * characterId scope 로 제한한 pgvector cosine 검색.
 */
export async function defaultPoseDbAdapter(
  characterId: string,
  queryVec: string,
  limit: number,
): Promise<PoseSearchRow[]> {
  const prisma = await getPrisma()

  interface RawRow {
    id: string
    slug: string
    meta: unknown
    tags: string[]
    score: number | null
  }

  const rows = (await prisma.$queryRaw`
    SELECT
      r."id",
      r."slug",
      r."meta",
      r."tags",
      1 - (r."embeddingText" <=> ${queryVec}::vector) AS score
    FROM "Resource" r
    WHERE r."characterId" = ${characterId}
      AND r."kind" = 'pose'
      AND r."status" = 'published'
      AND r."embeddingText" IS NOT NULL
    ORDER BY r."embeddingText" <=> ${queryVec}::vector ASC
    LIMIT ${limit}
  `) as RawRow[]

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    meta: row.meta,
    tags: Array.isArray(row.tags) ? row.tags : [],
    score: row.score !== null && row.score !== undefined ? Number(row.score) : undefined,
  }))
}

// ─────────────────────────────────────────────
// 액션 매칭 헬퍼 (filename-dict 기반)
// ─────────────────────────────────────────────

function extractActionFromMeta(meta: unknown): string | undefined {
  if (!meta || typeof meta !== 'object') return undefined
  const m = meta as Record<string, unknown>
  return typeof m['action'] === 'string' ? m['action'] : undefined
}

function extractActionFromSlug(slug: string): string | undefined {
  try {
    const dict = loadDictionary()
    const result = tagFromFilename(slug + '.png', undefined, dict)
    return result.action
  } catch {
    return undefined
  }
}

/**
 * 룰 기반 action 키워드와 DB row action 이 일치하는지 확인.
 * 유사 액션 그룹 매핑으로 넓게 매칭.
 */
function actionMatches(rowAction: string | undefined, candidateActions: string[]): boolean {
  if (!rowAction) return false
  if (candidateActions.includes(rowAction)) return true

  // 유사 action 그룹 (필요 시 확장)
  const SIMILAR: Record<string, string[]> = {
    fighting: ['weapon-sword', 'weapon-gun', 'weapon-axe', 'weapon-spear', 'archery'],
    running: ['walking', 'jumping'],
    standing: ['leaning', 'pointing'],
    sitting: ['chair-sit', 'kneeling', 'squatting', 'cross-legged'],
    crouching: ['kneeling', 'squatting'],
  }

  for (const ca of candidateActions) {
    const group = SIMILAR[ca] ?? []
    if (group.includes(rowAction)) return true
  }

  return false
}

// ─────────────────────────────────────────────
// 메인 검색 함수
// ─────────────────────────────────────────────

export interface CharacterSearchOptions {
  /** pgvector 검색 후보 배수 (실제 K 의 N배 풀 검색) */
  overFetch?: number
  /** DB 어댑터 (기본: Prisma raw SQL) */
  dbAdapter?: PoseDbAdapter
}

/**
 * 특정 Character 의 포즈 자산 중에서 장면 메타에 맞는 후보를 검색.
 *
 * @param characterId  DB Character.id
 * @param meta         장면 메타 (SceneMeta)
 * @param k            반환할 후보 수 (기본 5)
 * @param opts         옵션 (overFetch, dbAdapter)
 * @returns            PoseCandidate[] (confidence 내림차순)
 */
export async function searchPosesByCharacter(
  characterId: string,
  meta: SceneMeta,
  k = 5,
  opts: CharacterSearchOptions = {},
): Promise<PoseCandidate[]> {
  const { overFetch = 3, dbAdapter = defaultPoseDbAdapter } = opts

  // 1. 장면 메타 → 포즈 action 키워드 추출 (룰 기반)
  const ctx: PoseRuleContext = {
    emotion: meta.emotion,
    cameraAngle: meta.cameraAngle,
    mood: meta.mood,
    location: meta.location,
    view: meta.view,
    pacing: meta.pacing,
    props: meta.props,
  }
  const ruleActions = getPoseActionCandidates(ctx, k * 2)
  const candidateActions = ruleActions.map((r) => r.action)

  // 2. 장면 메타 → 임베딩 (action 키워드 힌트 포함)
  const queryVec = await embedSceneMeta(meta, candidateActions)

  // 3. pgvector 검색 (characterId scope)
  let rows: PoseSearchRow[] = []
  try {
    rows = await dbAdapter(characterId, queryVec, k * overFetch)
  } catch {
    // DB 연결 실패 시 룰 기반만으로 폴백 (테스트 환경 등)
    rows = []
  }

  // 4. 룰-매칭 가중 + 벡터 유사도 결합
  const scored = rows.map((row) => {
    const rowAction = extractActionFromMeta(row.meta) ?? extractActionFromSlug(row.slug)
    const ruleMatch = actionMatches(rowAction, candidateActions)
    const ruleConf = ruleMatch
      ? (ruleActions.find((r) => r.action === rowAction || r.action === rowAction)?.confidence ??
        0.6)
      : 0.3
    const vectorScore = row.score ?? 0.5
    // 가중 평균: 룰 60% + 벡터 40%
    const combined = ruleConf * 0.6 + vectorScore * 0.4

    const ruleEntry = ruleActions.find((r) => actionMatches(rowAction, [r.action]))
    return {
      resourceId: row.id,
      characterId,
      poseAction: rowAction ?? candidateActions[0] ?? 'standing',
      confidence: Math.min(combined, 1),
      reasoning: ruleEntry?.reasoning ?? `벡터 유사도 기반 (score=${vectorScore.toFixed(2)})`,
    }
  })

  // 5. DB 결과가 부족하면 룰 기반 플레이스홀더로 보완
  if (scored.length < k) {
    const needed = k - scored.length
    const existingActions = new Set(scored.map((s) => s.poseAction))

    for (const ra of ruleActions) {
      if (scored.length >= k) break
      if (existingActions.has(ra.action)) continue
      existingActions.add(ra.action)
      scored.push({
        resourceId: `rule-placeholder:${ra.action}`,
        characterId,
        poseAction: ra.action,
        confidence: ra.confidence * 0.7, // 플레이스홀더는 신뢰도 감소
        reasoning: `[룰 기반 플레이스홀더] ${ra.reasoning}`,
      })
      if (scored.length >= k + needed) break
    }
  }

  // 6. confidence 내림차순 정렬 (동점 시 resourceId 알파벳 — 결정론)
  return scored
    .sort((a, b) => {
      const diff = b.confidence - a.confidence
      if (Math.abs(diff) < 0.001) return a.resourceId.localeCompare(b.resourceId)
      return diff
    })
    .slice(0, k)
}
