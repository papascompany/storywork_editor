/**
 * 파서 공용 유틸
 */

/** 씬 인덱스를 URL-safe 슬러그로 변환 */
export function buildSlug(index: number): string {
  return `scene-${String(index + 1).padStart(2, '0')}`
}

// ─────────────────────────────────────────────
// 감정 키워드 → 감정 레이블 매핑
// ─────────────────────────────────────────────

const EMOTION_KEYWORDS: Record<string, string[]> = {
  happy: ['웃', '기쁘', '행복', '즐거', '신나', '흥분', '반가'],
  sad: ['울', '슬프', '눈물', '서럽', '외롭', '그립'],
  angry: ['화', '분노', '짜증', '화나', '열받', '격분'],
  surprised: ['놀라', '깜짝', '헉', '어', '아', '세상에'],
  tense: ['긴장', '떨', '두려', '무섭', '공포', '불안'],
  calm: ['평온', '잔잔', '조용', '편안', '포근'],
}

export function extractEmotion(text: string): string {
  let bestEmotion = 'neutral'
  let bestScore = 0

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    let score = 0
    for (const kw of keywords) {
      const count = (text.match(new RegExp(kw, 'g')) ?? []).length
      score += count
    }
    if (score > bestScore) {
      bestScore = score
      bestEmotion = emotion
    }
  }

  return bestEmotion
}

// ─────────────────────────────────────────────
// 이름 후보 필터 — 흔한 조사/접속사 등 제외
// ─────────────────────────────────────────────

const COMMON_WORDS = new Set([
  '그',
  '그녀',
  '그것',
  '이것',
  '저것',
  '우리',
  '당신',
  '그들',
  '나',
  '오늘',
  '내일',
  '어제',
  '지금',
  '여기',
  '저기',
  '거기',
  '그리고',
  '하지만',
  '그러나',
  '또는',
  '그래서',
  '했다',
  '이다',
  '있다',
  '없다',
  '했다',
  '한다',
])

/** 이름 후보 여부 판단 */
export function isLikelyName(word: string): boolean {
  if (COMMON_WORDS.has(word)) return false
  if (word.length < 2 || word.length > 8) return false
  if (/[0-9]/.test(word)) return false
  return true
}

// ─────────────────────────────────────────────
// 장면 요약 생성
// ─────────────────────────────────────────────

export function buildSummary(lines: Array<{ text: string }>, maxLen = 80): string {
  const combined = lines
    .map((l) => l.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return combined.length > maxLen ? combined.slice(0, maxLen) + '…' : combined
}
