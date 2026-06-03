/**
 * bg-tone-rules.ts — 장소/분위기 → 배경 색상 톤 결정 룰 (M4-02)
 *
 * 1차 구현: 배경 자산 미보유이므로 색상 톤만 추천.
 * 향후 배경 자산 도입 시 확장.
 *
 * 우선순위: mood > location > timeOfDay
 */

import type { BackgroundCandidate, BgTone } from '../types.js'

// ─────────────────────────────────────────────
// 무드 → 색상 톤
// ─────────────────────────────────────────────

const MOOD_TONE_MAP: Record<string, BgTone> = {
  romantic: 'pink',
  로맨틱: 'pink',
  사랑: 'pink',
  dark: 'navy',
  어둠: 'navy',
  horror: 'navy',
  공포: 'navy',
  calm: 'mint',
  평온: 'mint',
  잔잔: 'mint',
  comic: 'cream',
  코믹: 'cream',
  action: 'navy',
  액션: 'navy',
  tense: 'navy',
  긴장: 'navy',
}

// ─────────────────────────────────────────────
// 장소 → 색상 톤
// ─────────────────────────────────────────────

const LOCATION_TONE_MAP: Record<string, BgTone> = {
  outdoor: 'mint',
  야외: 'mint',
  공원: 'mint',
  숲: 'mint',
  indoor: 'cream',
  실내: 'cream',
  집: 'cream',
  방: 'cream',
  school: 'lilac',
  학교: 'lilac',
  교실: 'lilac',
  battle: 'navy',
  전장: 'navy',
  전투: 'navy',
  cafe: 'cream',
  카페: 'cream',
  library: 'cream',
  도서관: 'cream',
  beach: 'mint',
  해변: 'mint',
  바다: 'mint',
}

// ─────────────────────────────────────────────
// 시간대 → 색상 톤 (보조)
// ─────────────────────────────────────────────

const TIME_TONE_MAP: Record<string, BgTone> = {
  morning: 'cream',
  아침: 'cream',
  noon: 'white',
  낮: 'white',
  evening: 'pink',
  저녁: 'pink',
  night: 'navy',
  밤: 'navy',
}

// ─────────────────────────────────────────────
// 메인 함수
// ─────────────────────────────────────────────

interface BgToneContext {
  mood?: string
  location?: string
  timeOfDay?: string
}

/**
 * 장면 컨텍스트에서 배경 색상 톤을 결정한다.
 * 우선순위: mood > location > timeOfDay > 기본(white)
 */
export function getBgToneCandidate(ctx: BgToneContext): BackgroundCandidate {
  // 우선순위 1: mood
  if (ctx.mood) {
    const moodKey = ctx.mood.toLowerCase()
    const tone = MOOD_TONE_MAP[moodKey] ?? MOOD_TONE_MAP[ctx.mood]
    if (tone) {
      return {
        suggestedTone: tone,
        reasoning: `mood=${ctx.mood} → ${tone} 톤`,
      }
    }
  }

  // 우선순위 2: location
  if (ctx.location) {
    const locKey = ctx.location.toLowerCase()
    const tone = LOCATION_TONE_MAP[locKey] ?? LOCATION_TONE_MAP[ctx.location]
    if (tone) {
      return {
        suggestedTone: tone,
        reasoning: `location=${ctx.location} → ${tone} 톤`,
      }
    }
  }

  // 우선순위 3: timeOfDay
  if (ctx.timeOfDay) {
    const timeKey = ctx.timeOfDay.toLowerCase()
    const tone = TIME_TONE_MAP[timeKey] ?? TIME_TONE_MAP[ctx.timeOfDay]
    if (tone) {
      return {
        suggestedTone: tone,
        reasoning: `timeOfDay=${ctx.timeOfDay} → ${tone} 톤`,
      }
    }
  }

  // 기본 폴백
  return {
    suggestedTone: 'white',
    reasoning: '기본 폴백 → white (중립 톤)',
  }
}
