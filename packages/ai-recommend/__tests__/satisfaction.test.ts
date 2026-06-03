/**
 * satisfaction.test.ts — M4-02 추천 만족도 측정 (골든셋 10개)
 *
 * 만족도 기준:
 *   각 (sceneIndex, character) 조합에서
 *   추천 K=5 포즈 중 expected action keyword 와 매칭 ≥ 1개 → "만족"
 *
 * 목표: ≥ 70% 만족도
 */

import { describe, expect, it } from 'vitest'

import type { PoseSearchRow } from '../src/embedding/character-search.js'
import { recommend } from '../src/recommend.js'
import type { RecommendInternalOptions } from '../src/recommend.js'

import { GOLDEN_CASES } from './golden/golden-set.js'

// ─────────────────────────────────────────────
// 골든셋 전용 mock DB 어댑터
//
// 실제 DB 없이 룰 기반 플레이스홀더를 통해 동작하도록
// 빈 결과 반환 → character-search 가 룰 기반 폴백 사용
// ─────────────────────────────────────────────

const goldenDbAdapter = async (
  _characterId: string,
  _queryVec: string,
  _limit: number,
): Promise<PoseSearchRow[]> => {
  // DB 없는 환경 → 빈 결과 → 룰 기반 플레이스홀더 동작
  return []
}

// ─────────────────────────────────────────────
// 만족도 계산 헬퍼
// ─────────────────────────────────────────────

/**
 * 단일 (sceneIndex, character) 조합 만족도 계산.
 * 추천 포즈 K=5 중 expected action 중 하나라도 있으면 true.
 */
function isSatisfied(recommendedActions: string[], expectedActions: string[]): boolean {
  // action 정규화: 부분 매칭 허용 (예: 'fighting' vs 'weapon-sword' — 유사 그룹)
  const SIMILAR_GROUPS: string[][] = [
    ['fighting', 'weapon-sword', 'weapon-gun', 'weapon-axe', 'weapon-spear', 'archery'],
    ['running', 'jumping', 'falling'],
    ['sitting', 'chair-sit', 'kneeling', 'squatting', 'cross-legged', 'crouching'],
    ['standing', 'leaning', 'pointing'],
    ['waving', 'thumbsup', 'facial-expression'],
    ['affection', 'waving'],
  ]

  function expandActions(actions: string[]): Set<string> {
    const expanded = new Set(actions)
    for (const a of actions) {
      for (const group of SIMILAR_GROUPS) {
        if (group.includes(a)) {
          for (const g of group) expanded.add(g)
          break
        }
      }
    }
    return expanded
  }

  const expandedExpected = expandActions(expectedActions)
  const expandedRecommended = expandActions(recommendedActions)

  for (const action of expandedRecommended) {
    if (expandedExpected.has(action)) return true
  }

  return false
}

// ─────────────────────────────────────────────
// 골든셋 만족도 테스트
// ─────────────────────────────────────────────

describe('골든셋 만족도 측정 (M4-02)', () => {
  // 각 골든 케이스를 개별 테스트로 실행
  for (const gc of GOLDEN_CASES) {
    it(`${gc.id}: ${gc.description}`, async () => {
      const opts: RecommendInternalOptions = {
        seed: 0,
        candidatesPerCharacter: 5,
        _dbAdapter: goldenDbAdapter,
      }

      const result = await recommend(gc.analyzed, opts)

      let total = 0
      let satisfied = 0

      for (const expected of gc.expectedActionKeywords) {
        const scene = result.scenes.find((s) => s.sceneIndex === expected.sceneIndex)
        if (!scene) continue

        const poses = scene.poses[expected.character] ?? []
        const recommendedActions = poses.map((p) => p.poseAction)

        total++
        if (isSatisfied(recommendedActions, expected.actions)) {
          satisfied++
        } else {
          console.warn(
            `[${gc.id}] 장면${expected.sceneIndex} ${expected.character}: ` +
              `추천=[${recommendedActions.join(', ')}], 기대=[${expected.actions.join(', ')}]`,
          )
        }
      }

      // 개별 케이스: 최소 1개 이상 만족
      expect(total).toBeGreaterThan(0)
      const rate = total > 0 ? satisfied / total : 0
      // 각 케이스 최소 50% (전체 평균 목표 70%)
      expect(rate).toBeGreaterThanOrEqual(0.5)
    })
  }

  // 전체 만족도 집계 테스트
  it('전체 골든셋 10 — 평균 만족도 ≥ 70%', async () => {
    const opts: RecommendInternalOptions = {
      seed: 0,
      candidatesPerCharacter: 5,
      _dbAdapter: goldenDbAdapter,
    }

    let total = 0
    let satisfied = 0

    for (const gc of GOLDEN_CASES) {
      const result = await recommend(gc.analyzed, opts)

      for (const expected of gc.expectedActionKeywords) {
        const scene = result.scenes.find((s) => s.sceneIndex === expected.sceneIndex)
        if (!scene) continue

        const poses = scene.poses[expected.character] ?? []
        const recommendedActions = poses.map((p) => p.poseAction)

        total++
        if (isSatisfied(recommendedActions, expected.actions)) {
          satisfied++
        }
      }
    }

    const satisfactionRate = total > 0 ? satisfied / total : 0

    console.info(
      `[M4-02] 추천 만족도: ${satisfied}/${total} = ${(satisfactionRate * 100).toFixed(1)}%`,
    )

    // 목표 ≥ 70%
    expect(satisfactionRate).toBeGreaterThanOrEqual(0.7)
  })
})
