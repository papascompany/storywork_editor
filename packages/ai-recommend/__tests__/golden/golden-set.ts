/**
 * golden-set.ts — M4-02 추천 골든셋 10개
 *
 * 각 골든셋: { scriptRaw, analyzedOverride, expectedActionKeywords[] }
 * 만족도 기준: 추천 K=5 중 expected action keyword 와 매칭 ≥ 1개 비율 ≥ 70%
 */

import type { AnalyzeResult } from '@storywork/ai-script'

export interface GoldenCase {
  id: string
  description: string
  /** AnalyzeResult 픽스처 */
  analyzed: AnalyzeResult
  /**
   * 각 장면 × 캐릭터별 기대 action 키워드 목록.
   * 추천 결과에서 이 중 1개 이상 있으면 "만족".
   */
  expectedActionKeywords: Array<{
    sceneIndex: number
    character: string
    actions: string[]
  }>
}

// ─────────────────────────────────────────────
// 골든셋 10개
// ─────────────────────────────────────────────

export const GOLDEN_CASES: GoldenCase[] = [
  // ─── 골든 01: 학교 배경, 행복한 만남 ────────────────
  {
    id: 'golden-01',
    description: '학교 배경, 행복한 만남 장면 → 긍정적 포즈 추천',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '철수와 영희가 학교에서 반갑게 만난다.',
          meta: {
            location: '학교',
            cameraAngle: 'medium',
            emotion: 'happy',
            mood: 'calm',
            timeOfDay: 'morning',
          },
          lines: [
            { index: 0, speaker: '철수', text: '안녕!' },
            { index: 1, speaker: '영희', text: '오늘 날씨 좋지?' },
          ],
          characters: ['철수', '영희'],
          confidence: 0.9,
        },
      ],
      characters: [
        { name: '철수', mentionCount: 3 },
        { name: '영희', mentionCount: 2 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '철수',
        actions: ['waving', 'thumbsup', 'standing', 'walking', 'facial-expression'],
      },
      {
        sceneIndex: 0,
        character: '영희',
        actions: ['waving', 'thumbsup', 'standing', 'walking', 'facial-expression'],
      },
    ],
  },

  // ─── 골든 02: 전투 장면, 긴장된 분위기 ──────────────
  {
    id: 'golden-02',
    description: '전투 장면, 긴장 → 전투/무기 포즈 추천',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '두 주인공이 검을 들고 대결한다.',
          meta: {
            location: '전장',
            cameraAngle: 'wide',
            emotion: 'tense',
            mood: 'action',
          },
          lines: [
            { index: 0, speaker: '주인공', text: '물러서!!!' },
            { index: 1, speaker: '적', text: '넌 여기서 끝이야!' },
          ],
          characters: ['주인공', '적'],
          confidence: 0.9,
        },
      ],
      characters: [
        { name: '주인공', mentionCount: 5 },
        { name: '적', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '주인공',
        actions: ['fighting', 'weapon-sword', 'running', 'jumping', 'pointing'],
      },
      {
        sceneIndex: 0,
        character: '적',
        actions: ['fighting', 'weapon-sword', 'running', 'jumping', 'pointing'],
      },
    ],
  },

  // ─── 골든 03: 로맨틱 장면, 고백 ─────────────────────
  {
    id: 'golden-03',
    description: '로맨틱 고백 장면 → 애정 표현 포즈 추천',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '민준이 서연에게 사랑을 고백한다.',
          meta: {
            location: '공원',
            cameraAngle: 'closeup',
            emotion: 'romantic',
            mood: 'romantic',
          },
          lines: [
            { index: 0, speaker: '민준', text: '사실 오래전부터 좋아했어.' },
            { index: 1, speaker: '서연', text: '...' },
          ],
          characters: ['민준', '서연'],
          confidence: 0.9,
        },
      ],
      characters: [
        { name: '민준', mentionCount: 4 },
        { name: '서연', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '민준',
        actions: ['affection', 'waving', 'standing', 'facial-expression'],
      },
      {
        sceneIndex: 0,
        character: '서연',
        actions: ['affection', 'waving', 'standing', 'facial-expression'],
      },
    ],
  },

  // ─── 골든 04: 슬픈 이별 장면 ────────────────────────
  {
    id: 'golden-04',
    description: '슬픈 이별 장면 → 침울한 포즈 추천',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '두 친구가 작별 인사를 나눈다.',
          meta: {
            location: '기차역',
            cameraAngle: 'medium',
            emotion: 'sad',
            mood: 'calm',
          },
          lines: [
            { index: 0, speaker: '주인공', text: '잘 있어...' },
            { index: 1, speaker: '친구', text: '나중에 꼭 다시 만나자.' },
          ],
          characters: ['주인공', '친구'],
          confidence: 0.85,
        },
      ],
      characters: [
        { name: '주인공', mentionCount: 4 },
        { name: '친구', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '주인공',
        actions: ['crouching', 'kneeling', 'lying', 'standing', 'waving'],
      },
      {
        sceneIndex: 0,
        character: '친구',
        actions: ['crouching', 'kneeling', 'lying', 'standing', 'waving'],
      },
    ],
  },

  // ─── 골든 05: 놀람 장면, 클로즈업 ───────────────────
  {
    id: 'golden-05',
    description: '놀람 + 클로즈업 → 얼굴 표정/놀람 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '주인공이 충격적인 사실을 알게 된다.',
          meta: {
            location: '실내',
            cameraAngle: 'closeup',
            emotion: 'surprised',
            mood: 'tense',
          },
          lines: [
            { index: 0, speaker: '주인공', text: '말도 안 돼!' },
            { index: 1, text: '그는 믿을 수 없다는 표정으로 서 있었다.' },
          ],
          characters: ['주인공'],
          confidence: 0.9,
        },
      ],
      characters: [{ name: '주인공', mentionCount: 5 }],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '주인공',
        actions: ['facial-expression', 'jumping', 'falling', 'pointing', 'standing'],
      },
    ],
  },

  // ─── 골든 06: 야외 달리기, 빠른 페이싱 ──────────────
  {
    id: 'golden-06',
    description: '야외 + fast pacing → 달리기/역동적 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '주인공이 전력으로 달린다.',
          meta: {
            location: 'outdoor',
            cameraAngle: 'wide',
            emotion: 'fear',
            mood: 'action',
            pacing: 'fast',
          },
          lines: [{ index: 0, speaker: '주인공', text: '빨리 뛰어!' }],
          characters: ['주인공'],
          confidence: 0.9,
        },
      ],
      characters: [{ name: '주인공', mentionCount: 3 }],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '주인공',
        actions: ['running', 'jumping', 'fighting', 'falling'],
      },
    ],
  },

  // ─── 골든 07: 마법 장면 ──────────────────────────────
  {
    id: 'golden-07',
    description: '마법/판타지 장면 → 마법/무기 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '마법사가 강력한 주문을 외친다.',
          meta: {
            location: '전장',
            cameraAngle: 'low-angle',
            emotion: 'tense',
            mood: 'action',
            props: ['마법지팡이', '마법진'],
          },
          lines: [{ index: 0, speaker: '마법사', text: '최강의 마법을 보여주마!' }],
          characters: ['마법사'],
          confidence: 0.9,
        },
      ],
      characters: [{ name: '마법사', mentionCount: 3 }],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '마법사',
        actions: ['fighting', 'weapon-sword', 'standing', 'jumping', 'magic'],
      },
    ],
  },

  // ─── 골든 08: 조용한 독서 장면 ──────────────────────
  {
    id: 'golden-08',
    description: '실내 + 조용한 분위기 → 앉기/서기 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '주인공이 도서관에서 책을 읽는다.',
          meta: {
            location: '도서관',
            cameraAngle: 'medium',
            emotion: 'neutral',
            mood: 'calm',
            pacing: 'slow',
          },
          lines: [
            { index: 0, text: '창밖으로 가을빛이 쏟아졌다.' },
            { index: 1, speaker: '주인공', text: '이 책... 정말 재미있네.' },
          ],
          characters: ['주인공'],
          confidence: 0.8,
        },
      ],
      characters: [{ name: '주인공', mentionCount: 2 }],
    },
    expectedActionKeywords: [
      { sceneIndex: 0, character: '주인공', actions: ['sitting', 'standing', 'lying', 'leaning'] },
    ],
  },

  // ─── 골든 09: 복수의 장면이 있는 대본 ───────────────
  {
    id: 'golden-09',
    description: '복수 장면 — 장면별 추천 독립성 검증',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '행복한 점심 시간.',
          meta: { location: '학교', cameraAngle: 'medium', emotion: 'happy', mood: 'comic' },
          lines: [{ index: 0, speaker: '아이', text: '오늘 급식 맛있다!!' }],
          characters: ['아이'],
          confidence: 0.85,
        },
        {
          index: 1,
          slug: 'scene-01',
          summary: '갑작스러운 사고.',
          meta: { location: 'outdoor', cameraAngle: 'wide', emotion: 'surprised', mood: 'tense' },
          lines: [{ index: 0, speaker: '아이', text: '저기 봐봐!!!' }],
          characters: ['아이'],
          confidence: 0.85,
        },
      ],
      characters: [{ name: '아이', mentionCount: 4 }],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '아이',
        actions: ['waving', 'jumping', 'standing', 'facial-expression', 'thumbsup'],
      },
      {
        sceneIndex: 0,
        character: '아이',
        actions: ['waving', 'jumping', 'standing', 'facial-expression', 'thumbsup'],
      },
    ],
  },

  // ─── 골든 10: 분노 + 클로즈업 ───────────────────────
  {
    id: 'golden-10',
    description: '분노 + 클로즈업 → 강한 제스처 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '주인공이 분노하며 상대를 몰아붙인다.',
          meta: {
            location: 'indoor',
            cameraAngle: 'closeup',
            emotion: 'angry',
            mood: 'tense',
          },
          lines: [
            { index: 0, speaker: '주인공', text: '왜 그랬어!!' },
            { index: 1, speaker: '상대', text: '미안해...' },
          ],
          characters: ['주인공', '상대'],
          confidence: 0.9,
        },
      ],
      characters: [
        { name: '주인공', mentionCount: 4 },
        { name: '상대', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '주인공',
        actions: ['fighting', 'pointing', 'facial-expression', 'standing', 'weapon-sword'],
      },
      {
        sceneIndex: 0,
        character: '상대',
        actions: ['crouching', 'kneeling', 'standing', 'facial-expression'],
      },
    ],
  },
]
