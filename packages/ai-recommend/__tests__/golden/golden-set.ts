/**
 * golden-set.ts — 추천 골든셋 50개 (M4-02 10개 → AI-ACT-02 로 40개 확장)
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
// 골든셋 50개 (AI-ACT-02: 10 → 50 확장)
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

  // ═══ daily ═══
  // ─── 골든 11: 아침 등굣길 ───────────────────────────
  // 시그니처: happy / wide / calm / 학교 / normal (기존 01=happy·medium 과 앵글로 분리)
  {
    id: 'golden-11',
    description: '아침 등굣길 — 교문까지 나란히 걸어가는 두 학생 (전신 와이드)',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '지훈과 수아가 교문 앞까지 나란히 걸어간다.',
          meta: {
            location: '학교',
            cameraAngle: 'wide',
            emotion: 'happy',
            mood: 'calm',
            timeOfDay: 'morning',
            pacing: 'normal',
          },
          lines: [
            { index: 0, speaker: '지훈', text: '오늘도 지각 아슬아슬하네.' },
            { index: 1, speaker: '수아', text: '뛰면 아직 3분 남았어!' },
          ],
          characters: ['지훈', '수아'],
          confidence: 0.88,
        },
      ],
      characters: [
        { name: '지훈', mentionCount: 4 },
        { name: '수아', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      { sceneIndex: 0, character: '지훈', actions: ['walking', 'running', 'standing', 'stair'] },
      {
        sceneIndex: 0,
        character: '수아',
        actions: ['running', 'walking', 'hand-gesture', 'standing'],
      },
    ],
  },

  // ─── 골든 12: 교실 발표 차례 ────────────────────────
  // 시그니처: tense / medium / calm / 교실 / normal (기존 08=neutral·calm·slow 와 감정으로 분리)
  {
    id: 'golden-12',
    description: '교실 수업 — 발표 차례를 기다리는 학생과 교탁 앞 선생님',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '선생님이 발표자를 호명하고 민서가 자리에 앉은 채 굳는다.',
          meta: {
            location: '교실',
            cameraAngle: 'medium',
            emotion: 'tense',
            mood: 'calm',
            timeOfDay: 'morning',
            pacing: 'normal',
            props: ['칠판', '교과서'],
          },
          lines: [
            { index: 0, speaker: '선생님', text: '다음 발표, 민서.' },
            { index: 1, speaker: '민서', text: '저... 잠깐만요, 준비가...' },
          ],
          characters: ['선생님', '민서'],
          confidence: 0.85,
        },
      ],
      characters: [
        { name: '선생님', mentionCount: 3 },
        { name: '민서', mentionCount: 4 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '선생님',
        actions: ['standing', 'finger-pointing', 'hand-gesture', 'walking'],
      },
      {
        sceneIndex: 0,
        character: '민서',
        actions: ['sitting', 'chair-sit', 'desk-work', 'standing'],
      },
    ],
  },

  // ─── 골든 13: 남매 아침 실랑이 ──────────────────────
  // 시그니처: angry / medium / comic / 집 / fast (기존 10=angry·closeup·tense 와 앵글·무드로 분리)
  {
    id: 'golden-13',
    description: '아침 욕실 앞 남매 실랑이 — 화났지만 코믹한 일상 다툼',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '준호가 욕실 문을 두드리고 하은이 안에서 버틴다.',
          meta: {
            location: '집',
            cameraAngle: 'medium',
            emotion: 'angry',
            mood: 'comic',
            timeOfDay: 'morning',
            pacing: 'fast',
            props: ['수건', '칫솔'],
          },
          lines: [
            { index: 0, speaker: '준호', text: '십 분째야! 나 진짜 늦는다고!' },
            { index: 1, speaker: '하은', text: '일 분! 딱 일 분만!' },
          ],
          characters: ['준호', '하은'],
          confidence: 0.86,
        },
      ],
      characters: [
        { name: '준호', mentionCount: 4 },
        { name: '하은', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '준호',
        actions: ['angry', 'finger-pointing', 'standing', 'hand-gesture'],
      },
      {
        sceneIndex: 0,
        character: '하은',
        actions: ['facial-expression', 'crying', 'sitting', 'standing'],
      },
    ],
  },

  // ─── 골든 14: 저녁 식탁 ─────────────────────────────
  // 시그니처: neutral / medium / comic / 집 / normal (기존 08=neutral·calm·slow 와 무드로 분리)
  {
    id: 'golden-14',
    description: '집 저녁 식탁 — 반찬 투정하는 아이와 국을 떠 주는 엄마',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '엄마가 국을 떠 주고 아이가 식탁에 앉아 반찬을 골라낸다.',
          meta: {
            location: '집',
            cameraAngle: 'medium',
            emotion: 'neutral',
            mood: 'comic',
            timeOfDay: 'evening',
            pacing: 'normal',
            props: ['식탁', '국그릇'],
          },
          lines: [
            { index: 0, speaker: '엄마', text: '국 식기 전에 얼른 먹어.' },
            { index: 1, speaker: '아이', text: '당근만 빼면 안 돼요?' },
          ],
          characters: ['엄마', '아이'],
          confidence: 0.87,
        },
      ],
      characters: [
        { name: '엄마', mentionCount: 4 },
        { name: '아이', mentionCount: 4 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '엄마',
        actions: ['serving', 'carrying', 'standing', 'sitting'],
      },
      {
        sceneIndex: 0,
        character: '아이',
        actions: ['eating', 'sitting', 'chair-sit', 'facial-expression'],
      },
    ],
  },

  // ─── 골든 15: 밤 통화 ───────────────────────────────
  // 시그니처: surprised / medium / tense / 집 / fast (기존 05=surprised·closeup 과 앵글·페이싱으로 분리)
  {
    id: 'golden-15',
    description: '방 안 밤 통화 — 급한 소식에 벌떡 일어나는 상반신 컷',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '유진이 밤늦게 걸려온 전화를 받고 자리에서 벌떡 일어선다.',
          meta: {
            location: '집',
            cameraAngle: 'medium',
            emotion: 'surprised',
            mood: 'tense',
            timeOfDay: 'night',
            pacing: 'fast',
            props: ['휴대폰'],
          },
          lines: [
            { index: 0, speaker: '유진', text: '뭐라고? 지금 어디라고 했어?!' },
            { index: 1, text: '수화기 너머로 숨소리만 들렸다.' },
          ],
          characters: ['유진'],
          confidence: 0.89,
        },
      ],
      characters: [{ name: '유진', mentionCount: 5 }],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '유진',
        actions: ['phone', 'surprised', 'standing', 'facial-expression'],
      },
    ],
  },

  // ─── 골든 16: 비 오는 하굣길 ────────────────────────
  // 시그니처: sad / wide / calm / 야외 / slow (기존 04=sad·medium·기차역 과 앵글·장소로 분리)
  {
    id: 'golden-16',
    description: '비 오는 하굣길 — 우산을 쓰고 혼자 걸어가는 뒷모습 (전신 와이드)',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '채원이 우산을 쓰고 젖은 골목길을 천천히 걸어 내려간다.',
          meta: {
            location: '야외',
            cameraAngle: 'wide',
            emotion: 'sad',
            mood: 'calm',
            timeOfDay: 'evening',
            pacing: 'slow',
            props: ['우산', '책가방'],
          },
          lines: [
            { index: 0, text: '빗줄기가 우산 위에서 잘게 부서졌다.' },
            { index: 1, speaker: '채원', text: '오늘은... 그냥 걷고 싶다.' },
          ],
          characters: ['채원'],
          confidence: 0.83,
        },
      ],
      characters: [{ name: '채원', mentionCount: 4 }],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '채원',
        actions: ['umbrella', 'walking', 'standing', 'with-prop'],
      },
    ],
  },

  // ─── 골든 17: 주말 장보기 ───────────────────────────
  // 시그니처: neutral / wide / calm / 실내 / normal (기존 08=neutral·medium·slow 와 앵글·페이싱으로 분리)
  {
    id: 'golden-17',
    description: '주말 마트 장보기 — 카트를 밀며 통로를 지나는 모녀 (전신 와이드)',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '엄마가 카트를 밀고 아이가 진열대에서 물건을 집어 온다.',
          meta: {
            location: '실내',
            cameraAngle: 'wide',
            emotion: 'neutral',
            mood: 'calm',
            timeOfDay: 'noon',
            pacing: 'normal',
            props: ['카트', '장바구니'],
          },
          lines: [
            { index: 0, speaker: '엄마', text: '우유는 저쪽 끝에 있어.' },
            { index: 1, speaker: '아이', text: '내가 가져올게요!' },
          ],
          characters: ['엄마', '아이'],
          confidence: 0.84,
        },
      ],
      characters: [
        { name: '엄마', mentionCount: 4 },
        { name: '아이', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '엄마',
        actions: ['carrying', 'walking', 'standing', 'with-prop'],
      },
      {
        sceneIndex: 0,
        character: '아이',
        actions: ['walking', 'running', 'carrying', 'standing'],
      },
    ],
  },

  // ─── 골든 18: 잠자리 ────────────────────────────────
  // 시그니처: neutral / bird-eye / calm / 집 / slow (bird-eye 는 기존 01~10 미사용)
  {
    id: 'golden-18',
    description: '밤 취침 — 아이를 재우는 엄마 (부감 구도)',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '침대에 누운 아이에게 엄마가 이불을 덮어 준다.',
          meta: {
            location: '집',
            cameraAngle: 'bird-eye',
            emotion: 'neutral',
            mood: 'calm',
            timeOfDay: 'night',
            pacing: 'slow',
            props: ['이불', '침대'],
          },
          lines: [
            { index: 0, speaker: '엄마', text: '눈 감고 하나, 둘, 셋...' },
            { index: 1, speaker: '아이', text: '엄마, 딱 오 분만 더요.' },
          ],
          characters: ['엄마', '아이'],
          confidence: 0.84,
        },
      ],
      characters: [
        { name: '엄마', mentionCount: 3 },
        { name: '아이', mentionCount: 4 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '아이',
        actions: ['sleeping', 'lying', 'side-lying', 'drowsy'],
      },
      {
        sceneIndex: 0,
        character: '엄마',
        actions: ['kneeling', 'sitting', 'standing', 'one-knee'],
      },
    ],
  },

  // ═══ emotion ═══
  // ─── 골든 19: 분노 폭발 ──────────────────────────────
  {
    id: 'golden-19',
    description: '분노 폭발 — 상사가 폭발적으로 화를 냄 → 공격적/경직 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '팀장이 보고서를 집어던지며 신입에게 분노를 터뜨린다.',
          meta: {
            location: '사무실',
            cameraAngle: 'medium',
            emotion: 'angry',
            mood: 'tense',
            timeOfDay: 'evening',
            props: ['보고서', '책상'],
          },
          lines: [
            { index: 0, speaker: '팀장', text: '이걸 보고서라고 가져온 거야?!' },
            { index: 1, speaker: '신입', text: '죄송합니다...' },
          ],
          characters: ['팀장', '신입'],
          confidence: 0.9,
        },
      ],
      characters: [
        { name: '팀장', mentionCount: 5 },
        { name: '신입', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '팀장',
        actions: ['angry', 'fighting', 'finger-pointing', 'standing'],
      },
      {
        sceneIndex: 0,
        character: '신입',
        actions: ['standing', 'facial-expression', 'kneeling'],
      },
    ],
  },

  // ─── 골든 20: 오열 ───────────────────────────────────
  {
    id: 'golden-20',
    description: '오열 + 클로즈업 — 병원에서 무너져 우는 장면 → 낮은 자세/표정',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '지수가 병원 복도에서 주저앉아 오열한다.',
          meta: {
            location: '병원',
            cameraAngle: 'closeup',
            emotion: 'sad',
            mood: 'dark',
            timeOfDay: 'night',
          },
          lines: [
            { index: 0, speaker: '지수', text: '아니야... 그럴 리 없어...' },
            { index: 1, speaker: '간호사', text: '진정하세요, 보호자분.' },
          ],
          characters: ['지수', '간호사'],
          confidence: 0.9,
        },
      ],
      characters: [
        { name: '지수', mentionCount: 5 },
        { name: '간호사', mentionCount: 2 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '지수',
        actions: ['crying', 'facial-expression', 'kneeling', 'sitting'],
      },
      {
        sceneIndex: 0,
        character: '간호사',
        actions: ['kneeling', 'supporting', 'standing', 'facial-expression'],
      },
    ],
  },

  // ─── 골든 21: 깜짝 놀람 ──────────────────────────────
  {
    id: 'golden-21',
    description: '깜짝 놀람 + 클로즈업 — 코믹한 기습 → 놀람 표정/튀어오름',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '동생이 불쑥 튀어나와 유진이 깜짝 놀란다.',
          meta: {
            location: '집',
            cameraAngle: 'closeup',
            emotion: 'surprised',
            mood: 'comic',
            timeOfDay: 'night',
          },
          lines: [
            { index: 0, speaker: '동생', text: '왁!!!' },
            { index: 1, speaker: '유진', text: '으악!! 심장 떨어질 뻔했잖아!' },
          ],
          characters: ['유진', '동생'],
          confidence: 0.9,
        },
      ],
      characters: [
        { name: '유진', mentionCount: 4 },
        { name: '동생', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '유진',
        actions: ['surprised', 'facial-expression', 'jumping', 'falling'],
      },
      {
        // 동생은 '놀란' 쪽이 아니라 '놀래키는' 쪽 — 기습 동작/장난스러운 표정
        sceneIndex: 0,
        character: '동생',
        actions: ['facial-expression', 'jumping', 'hand-gesture'],
      },
    ],
  },

  // ─── 골든 22: 좌절/낙담 ─────────────────────────────
  {
    id: 'golden-22',
    description: '좌절/낙담 — 불합격 통보 후 옥상에서 무너짐 → 주저앉는 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '준호가 불합격 소식에 옥상 바닥에 주저앉는다.',
          meta: {
            location: '옥상',
            cameraAngle: 'wide',
            emotion: 'sad',
            mood: 'dark',
            pacing: 'slow',
            timeOfDay: 'evening',
          },
          lines: [
            { index: 0, speaker: '준호', text: '또 떨어졌어... 이번이 마지막이었는데.' },
            { index: 1, speaker: '선배', text: '한 번 더 하면 되지.' },
          ],
          characters: ['준호', '선배'],
          confidence: 0.85,
        },
      ],
      characters: [
        { name: '준호', mentionCount: 5 },
        { name: '선배', mentionCount: 2 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '준호',
        actions: ['frustrated', 'kneeling', 'sitting', 'crying'],
      },
      {
        sceneIndex: 0,
        character: '선배',
        actions: ['standing', 'supporting', 'leaning'],
      },
    ],
  },

  // ─── 골든 23: 환호 ───────────────────────────────────
  {
    id: 'golden-23',
    description: '환호 + 와이드 — 우승 확정 순간 → 만세/점프 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '미나와 태호가 우승이 확정되자 두 팔을 들고 환호한다.',
          meta: {
            location: 'outdoor',
            cameraAngle: 'wide',
            emotion: 'happy',
            mood: 'comic',
            pacing: 'fast',
            timeOfDay: 'noon',
          },
          lines: [
            { index: 0, speaker: '미나', text: '이겼다!! 우리가 이겼어!!' },
            { index: 1, speaker: '태호', text: '야호!!!' },
          ],
          characters: ['미나', '태호'],
          confidence: 0.9,
        },
      ],
      characters: [
        { name: '미나', mentionCount: 4 },
        { name: '태호', mentionCount: 4 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '미나',
        actions: ['cheering', 'jumping', 'v-sign', 'facial-expression'],
      },
      {
        sceneIndex: 0,
        character: '태호',
        actions: ['cheering', 'jumping', 'running', 'v-sign'],
      },
    ],
  },

  // ─── 골든 24: 수줍음 ─────────────────────────────────
  {
    id: 'golden-24',
    description: '수줍음 + 클로즈업 — 교실에서 얼굴이 붉어짐 → 표정/손동작',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '하늘이 지훈의 칭찬에 얼굴을 붉히며 시선을 피한다.',
          meta: {
            location: '교실',
            cameraAngle: 'closeup',
            emotion: 'happy',
            mood: 'romantic',
            timeOfDay: 'noon',
          },
          lines: [
            { index: 0, speaker: '지훈', text: '오늘 머리 스타일 잘 어울린다.' },
            { index: 1, speaker: '하늘', text: '어... 그, 그래? 고마워...' },
          ],
          characters: ['하늘', '지훈'],
          confidence: 0.85,
        },
      ],
      characters: [
        { name: '하늘', mentionCount: 4 },
        { name: '지훈', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '하늘',
        actions: ['facial-expression', 'hand-gesture', 'eye-cover', 'head-tilt'],
      },
      {
        sceneIndex: 0,
        character: '지훈',
        actions: ['facial-expression', 'affection', 'standing'],
      },
    ],
  },

  // ─── 골든 25: 졸음 (부감) ────────────────────────────
  {
    id: 'golden-25',
    description: '졸음 + 부감 — 오후 수업 중 책상에 엎드려 졺 → 엎드림/앉기 정적 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '수민이 오후 수업 중 책상에 엎드려 꾸벅꾸벅 존다.',
          meta: {
            location: '교실',
            // 책상에 엎드린 학생을 내려다보는 컷 — golden-08(도서관 medium)과 룰 경로 분리
            cameraAngle: 'bird-eye',
            emotion: 'neutral',
            mood: 'calm',
            pacing: 'slow',
            timeOfDay: 'noon',
            props: ['책상', '교과서'],
          },
          lines: [
            { index: 0, text: '오후 햇살이 창가에 길게 누웠다.' },
            { index: 1, speaker: '짝꿍', text: '야, 선생님 오신다.' },
          ],
          characters: ['수민', '짝꿍'],
          confidence: 0.8,
        },
      ],
      characters: [
        { name: '수민', mentionCount: 4 },
        { name: '짝꿍', mentionCount: 2 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '수민',
        actions: ['drowsy', 'yawning', 'lying-prone', 'chair-sit', 'sitting'],
      },
      {
        sceneIndex: 0,
        character: '짝꿍',
        actions: ['sitting', 'desk-work', 'finger-pointing'],
      },
    ],
  },

  // ─── 골든 26: 생각에 잠김 → 깨달음 (2장면) ────────────
  {
    id: 'golden-26',
    description: '생각에 잠김 → 깨달음 — 감정 전환 2장면, 장면별 독립 추천 검증',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '은수가 카페 창가에서 턱을 괴고 깊은 생각에 잠긴다.',
          meta: {
            location: '카페',
            cameraAngle: 'closeup',
            emotion: 'neutral',
            mood: 'calm',
            pacing: 'slow',
            timeOfDay: 'night',
            props: ['커피잔', '노트'],
          },
          lines: [
            { index: 0, text: '식은 커피 위로 김이 더 이상 오르지 않았다.' },
            { index: 1, speaker: '은수', text: '뭔가... 놓친 게 있어.' },
          ],
          characters: ['은수'],
          confidence: 0.85,
        },
        {
          index: 1,
          slug: 'scene-01',
          summary: '은수가 답을 깨닫고 자리에서 벌떡 일어난다.',
          meta: {
            location: '카페',
            cameraAngle: 'medium',
            emotion: 'surprised',
            mood: 'calm',
            timeOfDay: 'night',
          },
          lines: [{ index: 0, speaker: '은수', text: '그래, 그거였어!' }],
          characters: ['은수'],
          confidence: 0.85,
        },
      ],
      characters: [{ name: '은수', mentionCount: 6 }],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '은수',
        actions: ['thinking', 'sitting', 'facial-expression', 'leaning'],
      },
      {
        sceneIndex: 1,
        character: '은수',
        actions: ['surprised', 'jumping', 'standing', 'facial-expression'],
      },
    ],
  },

  // ═══ action ═══
  // ─── 골든 27: 야간 골목 추격전 ───────────────────────
  {
    id: 'golden-27',
    description: '야간 골목 추격전 + 공포/긴박 → 달리기/도주 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '도둑이 좁은 골목을 내달리고 형사가 뒤를 쫓는다.',
          meta: {
            location: '거리',
            cameraAngle: 'medium',
            emotion: 'fear',
            mood: 'tense',
            timeOfDay: 'night',
            pacing: 'fast',
          },
          lines: [
            { index: 0, speaker: '형사', text: '거기 서!' },
            { index: 1, speaker: '도둑', text: '잡히면 끝이야, 더 빨리!' },
          ],
          characters: ['형사', '도둑'],
          confidence: 0.9,
        },
      ],
      characters: [
        { name: '형사', mentionCount: 4 },
        { name: '도둑', mentionCount: 4 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '형사',
        actions: ['running', 'sprint-start', 'jumping', 'sport-athletics'],
      },
      {
        sceneIndex: 0,
        character: '도둑',
        actions: ['running', 'jumping', 'falling', 'climbing'],
      },
    ],
  },

  // ─── 골든 28: 복싱 링 위 격투 ───────────────────────
  {
    id: 'golden-28',
    description: '복싱 시합 최종 라운드 + 긴장 → 격투/타격 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '링 위에서 두 선수가 마지막 라운드를 맞붙는다.',
          meta: {
            location: '체육관',
            cameraAngle: 'medium',
            emotion: 'tense',
            mood: 'action',
            timeOfDay: 'evening',
            pacing: 'fast',
          },
          lines: [
            { index: 0, speaker: '도전자', text: '이번 라운드에 끝낸다!' },
            { index: 1, speaker: '챔피언', text: '어디 해봐.' },
          ],
          characters: ['도전자', '챔피언'],
          confidence: 0.9,
        },
      ],
      characters: [
        { name: '도전자', mentionCount: 5 },
        { name: '챔피언', mentionCount: 4 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '도전자',
        actions: ['sport-boxing', 'fighting', 'jumping', 'standing'],
      },
      {
        sceneIndex: 0,
        character: '챔피언',
        actions: ['sport-boxing', 'fighting', 'standing', 'falling'],
      },
    ],
  },

  // ─── 골든 29: 성문 공방 (활·도끼) ───────────────────
  {
    id: 'golden-29',
    description: '공성전 원거리/도끼 전투 + 분노 → 활/도끼 무기 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '성벽 위 궁수가 시위를 당기고, 아래에선 도끼를 든 전사가 성문을 내리친다.',
          meta: {
            location: '전장',
            cameraAngle: 'medium',
            emotion: 'angry',
            mood: 'action',
            timeOfDay: 'evening',
            props: ['활', '전투도끼'],
          },
          lines: [
            { index: 0, speaker: '궁수', text: '화살 한 발이면 충분하다.' },
            { index: 1, speaker: '전사', text: '성문을 부숴라!' },
          ],
          characters: ['궁수', '전사'],
          confidence: 0.92,
        },
      ],
      characters: [
        { name: '궁수', mentionCount: 5 },
        { name: '전사', mentionCount: 5 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '궁수',
        actions: ['archery', 'standing', 'kneeling', 'fighting'],
      },
      {
        sceneIndex: 0,
        character: '전사',
        actions: ['weapon-axe', 'fighting', 'jumping', 'running'],
      },
    ],
  },

  // ─── 골든 30: 옥상 총격전 ───────────────────────────
  {
    id: 'golden-30',
    description: '야간 총격전(low-angle, dark) → 총기/엄폐 포즈',
    analyzed: {
      format: 'screenplay',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '옥상에서 요원이 엄폐하며 총을 겨눈다.',
          meta: {
            location: '옥상',
            cameraAngle: 'low-angle',
            emotion: 'tense',
            mood: 'dark',
            timeOfDay: 'night',
            props: ['권총', '탄창'],
          },
          lines: [
            { index: 0, speaker: '요원', text: '탄창 하나 남았다.' },
            { index: 1, text: '총성이 밤하늘을 갈랐다.' },
          ],
          characters: ['요원'],
          confidence: 0.88,
        },
      ],
      characters: [{ name: '요원', mentionCount: 5 }],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '요원',
        actions: ['weapon-gun', 'shooting', 'kneeling', 'fighting'],
      },
    ],
  },

  // ─── 골든 31: 건물 도약과 추락 ──────────────────────
  {
    id: 'golden-31',
    description: '건물 사이 도약 → 추락 — 2장면 점프/낙하 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '주인공이 옥상 난간을 박차고 건너편으로 도약한다.',
          meta: {
            location: '야외',
            cameraAngle: 'wide',
            emotion: 'tense',
            mood: 'action',
            timeOfDay: 'noon',
            pacing: 'fast',
          },
          lines: [{ index: 0, speaker: '주인공', text: '한 번만 버텨줘!' }],
          characters: ['주인공'],
          confidence: 0.9,
        },
        {
          index: 1,
          slug: 'scene-01',
          summary: '발이 미끄러져 아래로 떨어진다.',
          meta: {
            location: '야외',
            cameraAngle: 'bird-eye',
            emotion: 'surprised',
            mood: 'action',
            timeOfDay: 'noon',
            pacing: 'fast',
          },
          lines: [{ index: 0, speaker: '주인공', text: '으아악!!' }],
          characters: ['주인공'],
          confidence: 0.87,
        },
      ],
      characters: [{ name: '주인공', mentionCount: 6 }],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '주인공',
        actions: ['jumping', 'sport-highjump', 'running', 'landing'],
      },
      {
        sceneIndex: 1,
        character: '주인공',
        actions: ['falling', 'jumping', 'hanging', 'landing'],
      },
    ],
  },

  // ─── 골든 32: 축구 결승골 ───────────────────────────
  {
    id: 'golden-32',
    description: '축구 경기 결승골 + 환호 → 구기/환호 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '후반 종료 직전 스트라이커가 결승골을 넣는다.',
          meta: {
            location: '야외',
            cameraAngle: 'wide',
            emotion: 'happy',
            mood: 'action',
            timeOfDay: 'noon',
            pacing: 'fast',
          },
          lines: [
            { index: 0, speaker: '스트라이커', text: '들어갔다!!!' },
            { index: 1, speaker: '골키퍼', text: '막았어야 했는데...' },
          ],
          characters: ['스트라이커', '골키퍼'],
          confidence: 0.9,
        },
      ],
      characters: [
        { name: '스트라이커', mentionCount: 4 },
        { name: '골키퍼', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '스트라이커',
        actions: ['sport-soccer', 'sport-ball', 'running', 'jumping'],
      },
      {
        sceneIndex: 0,
        character: '골키퍼',
        actions: ['sport-soccer', 'sport-ball', 'falling', 'jumping'],
      },
    ],
  },

  // ─── 골든 33: 수영 결승 · 다이빙 스타트 ─────────────
  {
    id: 'golden-33',
    description: '수영 결승 스타트 다이빙(low-angle) → 수영/다이빙 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '출발대에 선 선수들이 신호와 함께 물속으로 뛰어든다.',
          meta: {
            location: '수영장',
            cameraAngle: 'low-angle',
            emotion: 'tense',
            mood: 'action',
            timeOfDay: 'morning',
            pacing: 'fast',
          },
          lines: [
            { index: 0, speaker: '코치', text: '스타트만 잡으면 이긴다!' },
            { index: 1, speaker: '선수', text: '숨 참고... 간다!' },
          ],
          characters: ['코치', '선수'],
          confidence: 0.88,
        },
      ],
      characters: [
        { name: '선수', mentionCount: 5 },
        { name: '코치', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '선수',
        actions: ['sport-swimming', 'sport-diving', 'jumping', 'sprint-start'],
      },
      {
        sceneIndex: 0,
        character: '코치',
        actions: ['standing', 'finger-pointing', 'cheering'],
      },
    ],
  },

  // ─── 골든 34: 자전거·스케이트보드 질주 ──────────────
  {
    id: 'golden-34',
    description: '자전거/스케이트보드 질주와 낙차 → 탈것/균형 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '자전거를 탄 소년이 스케이트보드 무리를 앞질러 언덕을 내려간다.',
          meta: {
            location: '거리',
            cameraAngle: 'medium',
            emotion: 'happy',
            mood: 'action',
            timeOfDay: 'evening',
            pacing: 'fast',
          },
          lines: [
            { index: 0, speaker: '소년', text: '따라올 수 있으면 따라와 봐!' },
            { index: 1, speaker: '친구', text: '너무 빨라, 브레이크!' },
          ],
          characters: ['소년', '친구'],
          confidence: 0.86,
        },
      ],
      characters: [
        { name: '소년', mentionCount: 5 },
        { name: '친구', mentionCount: 4 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '소년',
        actions: ['cycling', 'sport-skateboard', 'jumping', 'running'],
      },
      {
        sceneIndex: 0,
        character: '친구',
        actions: ['sport-skateboard', 'falling', 'jumping', 'cycling'],
      },
    ],
  },

  // ═══ prop ═══
  // ─── 골든 35: 비 오는 날 우산 ─────────────────────────
  {
    id: 'golden-35',
    description: '비 오는 거리 + 우산 → 우산/보행 소품 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '지우와 하준이 빗속에서 우산을 나눠 쓰고 걷는다.',
          meta: {
            location: '거리',
            cameraAngle: 'medium',
            emotion: 'neutral',
            mood: 'calm',
            timeOfDay: 'evening',
            props: ['우산', '빗물'],
          },
          lines: [
            { index: 0, text: '빗줄기가 굵어졌다.' },
            { index: 1, speaker: '지우', text: '우산 하나뿐인데, 같이 쓸래?' },
            { index: 2, speaker: '하준', text: '고마워. 어깨 젖겠다.' },
          ],
          characters: ['지우', '하준'],
          confidence: 0.85,
        },
      ],
      characters: [
        { name: '지우', mentionCount: 3 },
        { name: '하준', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '지우',
        actions: ['umbrella', 'with-prop', 'walking', 'standing'],
      },
      {
        sceneIndex: 0,
        character: '하준',
        actions: ['umbrella', 'with-prop', 'walking', 'standing'],
      },
    ],
  },

  // ─── 골든 36: 야외 사진 촬영 ──────────────────────────
  {
    id: 'golden-36',
    description: '공원 사진 촬영 → 촬영/포즈잡기 소품 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '사진작가가 공원에서 모델을 촬영한다.',
          meta: {
            location: '공원',
            cameraAngle: 'medium',
            emotion: 'happy',
            mood: 'calm',
            timeOfDay: 'noon',
            props: ['카메라', '삼각대'],
          },
          lines: [
            { index: 0, speaker: '사진작가', text: '자, 한 걸음만 앞으로!' },
            { index: 1, speaker: '모델', text: '이렇게요?' },
          ],
          characters: ['사진작가', '모델'],
          confidence: 0.85,
        },
      ],
      characters: [
        { name: '사진작가', mentionCount: 4 },
        { name: '모델', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '사진작가',
        actions: ['photographing', 'with-prop', 'standing', 'finger-pointing'],
      },
      {
        sceneIndex: 0,
        character: '모델',
        actions: ['v-sign', 'facial-expression', 'standing', 'jumping'],
      },
    ],
  },

  // ─── 골든 37: 운전 ────────────────────────────────────
  {
    id: 'golden-37',
    description: '차 안 운전 → 운전/탑승 소품 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '택시 기사가 손님을 태우고 야간 도로를 달린다.',
          meta: {
            location: '차 안',
            cameraAngle: 'medium',
            emotion: 'neutral',
            mood: 'calm',
            timeOfDay: 'night',
            props: ['핸들', '자동차', '내비게이션'],
          },
          lines: [
            { index: 0, speaker: '기사', text: '어디로 모실까요?' },
            { index: 1, speaker: '승객', text: '시청 앞으로 가주세요.' },
          ],
          characters: ['기사', '승객'],
          confidence: 0.85,
        },
      ],
      characters: [
        { name: '기사', mentionCount: 3 },
        { name: '승객', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '기사',
        actions: ['driving', 'with-vehicle', 'sitting', 'chair-sit'],
      },
      {
        sceneIndex: 0,
        character: '승객',
        actions: ['with-vehicle', 'sitting', 'chair-sit', 'thinking'],
      },
    ],
  },

  // ─── 골든 38: 진료/치료 ───────────────────────────────
  {
    id: 'golden-38',
    description: '병원 진료 → 치료/문진 직업 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '의사가 진료실에서 환자를 진찰한다.',
          meta: {
            location: '병원',
            cameraAngle: 'medium',
            emotion: 'neutral',
            mood: 'calm',
            timeOfDay: 'morning',
            props: ['청진기', '진료차트'],
          },
          lines: [
            { index: 0, speaker: '의사', text: '숨을 크게 들이쉬어 보세요.' },
            { index: 1, speaker: '환자', text: '여기가 계속 결려요.' },
          ],
          characters: ['의사', '환자'],
          confidence: 0.85,
        },
      ],
      characters: [
        { name: '의사', mentionCount: 4 },
        { name: '환자', mentionCount: 4 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '의사',
        actions: ['treatment', 'with-prop', 'standing', 'desk-work'],
      },
      {
        sceneIndex: 0,
        character: '환자',
        actions: ['treatment', 'sitting', 'chair-sit', 'lying'],
      },
    ],
  },

  // ─── 골든 39: 악수 / 명함 교환 ────────────────────────
  {
    id: 'golden-39',
    description: '비즈니스 미팅 악수·명함 → 악수/소품 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '팀장과 거래처 담당자가 악수하며 명함을 주고받는다.',
          meta: {
            location: '사무실',
            cameraAngle: 'medium',
            emotion: 'happy',
            mood: 'calm',
            timeOfDay: 'morning',
            props: ['명함', '서류가방'],
          },
          lines: [
            { index: 0, speaker: '팀장', text: '먼 길 오시느라 고생 많으셨습니다.' },
            { index: 1, speaker: '거래처', text: '잘 부탁드립니다. 제 명함입니다.' },
          ],
          characters: ['팀장', '거래처'],
          confidence: 0.85,
        },
      ],
      characters: [
        { name: '팀장', mentionCount: 3 },
        { name: '거래처', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '팀장',
        actions: ['handshake', 'with-prop', 'standing', 'facial-expression'],
      },
      {
        sceneIndex: 0,
        character: '거래처',
        actions: ['handshake', 'with-prop', 'standing', 'facial-expression'],
      },
    ],
  },

  // ─── 골든 40: 쇼핑 ────────────────────────────────────
  {
    id: 'golden-40',
    description: '쇼핑 거리 + 와이드 → 짐 들기/보행 소품 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '지민과 친구가 쇼핑백을 잔뜩 들고 거리를 걷는다.',
          meta: {
            location: '거리',
            cameraAngle: 'wide',
            emotion: 'happy',
            mood: 'calm',
            timeOfDay: 'noon',
            props: ['쇼핑백', '진열대'],
          },
          lines: [
            { index: 0, speaker: '지민', text: '이걸 다 사버渡네!' },
            { index: 1, speaker: '친구', text: '내 팔 빠지겠어~' },
          ],
          characters: ['지민', '친구'],
          confidence: 0.85,
        },
      ],
      characters: [
        { name: '지민', mentionCount: 3 },
        { name: '친구', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '지민',
        actions: ['carrying', 'with-prop', 'walking', 'facial-expression'],
      },
      {
        sceneIndex: 0,
        character: '친구',
        actions: ['carrying', 'with-prop', 'walking', 'facial-expression'],
      },
    ],
  },

  // ─── 골든 41: 야근 데스크 업무 ────────────────────────
  {
    id: 'golden-41',
    description: '사무실 야근 + slow pacing → 책상 업무/착석 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '지훈이 늦은 밤 사무실 책상에서 서류를 정리한다.',
          meta: {
            location: '사무실',
            cameraAngle: 'medium',
            emotion: 'neutral',
            mood: 'calm',
            pacing: 'slow',
            timeOfDay: 'night',
            props: ['노트북', '머그컵', '서류'],
          },
          lines: [
            { index: 0, text: '형광등만 남은 사무실은 조용했다.' },
            { index: 1, speaker: '지훈', text: '이것만 끝내면 퇴근이다.' },
          ],
          characters: ['지훈'],
          confidence: 0.8,
        },
      ],
      characters: [{ name: '지훈', mentionCount: 3 }],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '지훈',
        actions: ['desk-work', 'chair-sit', 'sitting', 'with-prop'],
      },
    ],
  },

  // ─── 골든 42: 무대 노래 ───────────────────────────────
  {
    id: 'golden-42',
    description: '무대 열창 + low-angle → 노래/환호 소품 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '가수가 무대에서 마이크를 잡고 열창하고 관객이 환호한다.',
          meta: {
            location: '무대',
            cameraAngle: 'low-angle',
            emotion: 'happy',
            mood: 'action',
            timeOfDay: 'night',
            props: ['마이크', '스탠드조명'],
          },
          lines: [
            { index: 0, speaker: '가수', text: '다 같이 불러주세요!' },
            { index: 1, speaker: '관객', text: '와아아아!!' },
          ],
          characters: ['가수', '관객'],
          confidence: 0.85,
        },
      ],
      characters: [
        { name: '가수', mentionCount: 4 },
        { name: '관객', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '가수',
        actions: ['singing', 'with-prop', 'standing', 'jumping'],
      },
      {
        sceneIndex: 0,
        character: '관객',
        actions: ['cheering', 'jumping', 'facial-expression', 'standing'],
      },
    ],
  },

  // ═══ multi ═══
  // ─── 골든 43: 재회 포옹 (2인 + 클로즈업 눈물) ────────
  {
    id: 'golden-43',
    description: '공항 재회 포옹 → 애정/포옹 포즈, 클로즈업에서 눈물 표정',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '오래 떨어져 있던 지훈과 하윤이 공항에서 서로를 끌어안는다.',
          meta: {
            location: '공항',
            cameraAngle: 'medium',
            emotion: 'romantic',
            mood: 'romantic',
            timeOfDay: 'evening',
          },
          lines: [
            { index: 0, speaker: '지훈', text: '보고 싶었어.' },
            { index: 1, speaker: '하윤', text: '나도... 진짜 오래 기다렸어.' },
          ],
          characters: ['지훈', '하윤'],
          confidence: 0.9,
        },
        {
          index: 1,
          slug: 'scene-01',
          summary: '하윤의 눈에 눈물이 맺힌다.',
          meta: {
            location: '공항',
            cameraAngle: 'closeup',
            emotion: 'sad',
            mood: 'romantic',
            timeOfDay: 'evening',
          },
          lines: [{ index: 0, speaker: '하윤', text: '울지 않으려고 했는데...' }],
          characters: ['하윤'],
          confidence: 0.88,
        },
      ],
      characters: [
        { name: '지훈', mentionCount: 4 },
        { name: '하윤', mentionCount: 5 },
      ],
    },
    expectedActionKeywords: [
      { sceneIndex: 0, character: '지훈', actions: ['affection', 'hugging', 'standing'] },
      { sceneIndex: 0, character: '하윤', actions: ['affection', 'hugging', 'standing'] },
      {
        sceneIndex: 1,
        character: '하윤',
        actions: ['crying', 'facial-expression', 'affection', 'hugging'],
      },
    ],
  },

  // ─── 골든 44: 업어주기 (piggyback) ───────────────────
  {
    id: 'golden-44',
    description: '형이 동생을 업고 언덕을 오르다 내려놓고 나란히 걷는다',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '태윤이 지친 동생 소미를 업고 언덕길을 오른다.',
          meta: {
            location: 'outdoor',
            cameraAngle: 'wide',
            emotion: 'happy',
            mood: 'calm',
            timeOfDay: 'noon',
          },
          lines: [
            { index: 0, speaker: '태윤', text: '업혀. 내가 데려다줄게.' },
            { index: 1, speaker: '소미', text: '무겁지 않아?' },
          ],
          characters: ['태윤', '소미'],
          confidence: 0.88,
        },
        {
          index: 1,
          slug: 'scene-01',
          summary: '언덕 위에서 내려놓고 둘이 나란히 걷는다.',
          meta: {
            location: '들판',
            cameraAngle: 'medium',
            emotion: 'happy',
            mood: 'calm',
            timeOfDay: 'evening',
          },
          lines: [{ index: 0, speaker: '소미', text: '이제 나 혼자 걸을 수 있어!' }],
          characters: ['태윤', '소미'],
          confidence: 0.85,
        },
      ],
      characters: [
        { name: '태윤', mentionCount: 5 },
        { name: '소미', mentionCount: 4 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '태윤',
        actions: ['piggyback', 'carrying', 'squatting', 'walking'],
      },
      {
        sceneIndex: 0,
        character: '소미',
        actions: ['piggyback', 'sitting', 'hand-gesture', 'facial-expression'],
      },
      { sceneIndex: 1, character: '태윤', actions: ['walking', 'standing', 'hand-gesture'] },
      {
        sceneIndex: 1,
        character: '소미',
        actions: ['walking', 'hand-gesture', 'facial-expression'],
      },
    ],
  },

  // ─── 골든 45: 다툼 / 따돌림 (3인) ────────────────────
  {
    id: 'golden-45',
    description: '교실 따돌림 3인 장면 — 가해자/피해자/방관자 각각의 기대 포즈',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '준호가 교실 구석에서 민지를 몰아세우고, 세영은 멀찍이 지켜본다.',
          meta: {
            location: '학교',
            cameraAngle: 'medium',
            emotion: 'angry',
            mood: 'tense',
            timeOfDay: 'noon',
          },
          lines: [
            { index: 0, speaker: '준호', text: '너 때문에 다 망쳤잖아!' },
            { index: 1, speaker: '민지', text: '...내가 안 그랬어.' },
            { index: 2, speaker: '세영', text: '(아무 말도 하지 못했다)' },
          ],
          characters: ['준호', '민지', '세영'],
          confidence: 0.9,
        },
      ],
      characters: [
        { name: '준호', mentionCount: 5 },
        { name: '민지', mentionCount: 4 },
        { name: '세영', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '준호',
        actions: ['bullying', 'fighting', 'finger-pointing', 'standing'],
      },
      {
        sceneIndex: 0,
        character: '민지',
        actions: ['kneeling', 'squatting', 'sitting', 'crying'],
      },
      {
        sceneIndex: 0,
        character: '세영',
        actions: ['standing', 'arms-crossed', 'facial-expression'],
      },
    ],
  },

  // ─── 골든 46: 보호 (protecting) ──────────────────────
  {
    id: 'golden-46',
    description: '형이 동생을 몸으로 막아서고, 이어 홀로 맞선다',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '무너지는 잔해 앞에서 도현이 동생 유나를 감싸 안고 몸을 낮춘다.',
          meta: {
            location: 'outdoor',
            cameraAngle: 'low-angle',
            emotion: 'fear',
            mood: 'tense',
            timeOfDay: 'night',
          },
          lines: [
            { index: 0, speaker: '도현', text: '눈 감아! 내가 막을게!' },
            { index: 1, speaker: '유나', text: '오빠...!' },
          ],
          characters: ['도현', '유나'],
          confidence: 0.9,
        },
        {
          index: 1,
          slug: 'scene-01',
          summary: '도현이 동생을 뒤로 밀어내고 홀로 맞선다.',
          meta: {
            location: '골목',
            cameraAngle: 'low-angle',
            emotion: 'angry',
            mood: 'action',
            timeOfDay: 'night',
          },
          lines: [{ index: 0, speaker: '도현', text: '여기서부터는 내가 상대한다.' }],
          characters: ['도현'],
          confidence: 0.88,
        },
      ],
      characters: [
        { name: '도현', mentionCount: 6 },
        { name: '유나', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '도현',
        actions: ['protecting', 'supporting', 'squatting', 'fighting'],
      },
      {
        sceneIndex: 0,
        character: '유나',
        actions: ['kneeling', 'squatting', 'eye-cover', 'crying'],
      },
      {
        sceneIndex: 1,
        character: '도현',
        actions: ['fighting', 'protecting', 'standing', 'finger-pointing'],
      },
    ],
  },

  // ─── 골든 47: 응원 군중 (cheering) ───────────────────
  {
    id: 'golden-47',
    description: '경기장 응원 군중 + 선수 → 환호/역동 포즈, 결승선 클로즈업',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '관중이 일제히 일어나 환호하고, 선수 하람이 마지막 직선 구간을 달린다.',
          meta: {
            location: '경기장',
            cameraAngle: 'wide',
            emotion: 'happy',
            mood: 'action',
            timeOfDay: 'noon',
            pacing: 'fast',
          },
          lines: [
            { index: 0, speaker: '관중', text: '가라!! 하람!!!' },
            { index: 1, speaker: '하람', text: '조금만... 더!' },
          ],
          characters: ['관중', '하람'],
          confidence: 0.9,
        },
        {
          index: 1,
          slug: 'scene-01',
          summary: '결승선을 통과한 하람의 얼굴이 클로즈업된다.',
          meta: {
            location: '경기장',
            cameraAngle: 'closeup',
            emotion: 'happy',
            mood: 'calm',
            timeOfDay: 'noon',
          },
          lines: [{ index: 0, speaker: '하람', text: '해냈다...!' }],
          characters: ['하람'],
          confidence: 0.9,
        },
      ],
      characters: [
        { name: '하람', mentionCount: 6 },
        { name: '관중', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '관중',
        actions: ['cheering', 'jumping', 'hand-gesture', 'v-sign'],
      },
      {
        sceneIndex: 0,
        character: '하람',
        actions: ['running', 'sport-athletics', 'jumping'],
      },
      {
        sceneIndex: 1,
        character: '하람',
        actions: ['facial-expression', 'cheering', 'v-sign', 'crying'],
      },
    ],
  },

  // ─── 골든 48: 동물과 함께 (with-animal) ──────────────
  {
    id: 'golden-48',
    description: '공원 산책 중 강아지와 노는 모녀 → 동물 동반 포즈, 이어 뛰어나가는 강아지 추격',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '가을이 강아지 콩이를 쓰다듬고, 엄마가 옆에 서서 지켜본다.',
          meta: {
            location: '공원',
            cameraAngle: 'medium',
            emotion: 'happy',
            mood: 'calm',
            timeOfDay: 'morning',
          },
          lines: [
            { index: 0, speaker: '가을', text: '콩아, 앉아!' },
            { index: 1, speaker: '엄마', text: '잘 하네, 우리 콩이.' },
          ],
          characters: ['가을', '엄마'],
          confidence: 0.87,
        },
        {
          index: 1,
          slug: 'scene-01',
          summary: '목줄을 놓친 콩이가 뛰어나가고 가을이 뒤쫓는다.',
          meta: {
            location: 'outdoor',
            cameraAngle: 'wide',
            emotion: 'surprised',
            mood: 'comic',
            timeOfDay: 'morning',
            pacing: 'fast',
          },
          lines: [{ index: 0, speaker: '가을', text: '콩아, 거기 서!!' }],
          characters: ['가을'],
          confidence: 0.85,
        },
      ],
      characters: [
        { name: '가을', mentionCount: 6 },
        { name: '엄마', mentionCount: 3 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '가을',
        actions: ['with-animal', 'sitting', 'squatting', 'walking'],
      },
      { sceneIndex: 0, character: '엄마', actions: ['with-animal', 'standing', 'walking'] },
      {
        sceneIndex: 1,
        character: '가을',
        actions: ['running', 'with-animal', 'walking', 'jumping'],
      },
    ],
  },

  // ─── 골든 49: 마법 / 판타지 수련 (magic) ─────────────
  {
    id: 'golden-49',
    description: '마탑 수련 — 마법사와 제자, 소환진 발동',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '마법사 레안이 마법진 위에서 주문을 잇고, 제자 시아가 무릎을 꿇고 지켜본다.',
          meta: {
            location: '마탑',
            cameraAngle: 'low-angle',
            emotion: 'tense',
            mood: 'dark',
            timeOfDay: 'night',
            props: ['마법진', '수정구'],
          },
          lines: [
            { index: 0, speaker: '레안', text: '손을 떼지 마라. 진이 흐트러진다.' },
            { index: 1, speaker: '시아', text: '네, 스승님...!' },
          ],
          characters: ['레안', '시아'],
          confidence: 0.9,
        },
        {
          index: 1,
          slug: 'scene-01',
          summary: '소환진이 폭발하듯 빛나며 둘이 뒤로 밀려난다.',
          meta: {
            location: '마탑',
            cameraAngle: 'wide',
            emotion: 'surprised',
            mood: 'action',
            timeOfDay: 'night',
            props: ['마법진'],
          },
          lines: [{ index: 0, speaker: '시아', text: '스승님, 이건...!!' }],
          characters: ['레안', '시아'],
          confidence: 0.88,
        },
      ],
      characters: [
        { name: '레안', mentionCount: 5 },
        { name: '시아', mentionCount: 5 },
      ],
    },
    expectedActionKeywords: [
      {
        sceneIndex: 0,
        character: '레안',
        actions: ['magic', 'fighting', 'standing'],
      },
      { sceneIndex: 0, character: '시아', actions: ['kneeling', 'prayer', 'magic', 'standing'] },
      { sceneIndex: 1, character: '레안', actions: ['magic', 'fighting', 'jumping', 'falling'] },
      { sceneIndex: 1, character: '시아', actions: ['falling', 'jumping', 'magic'] },
    ],
  },

  // ─── 골든 50: 계단 · 벽 기대기 (stair / wall-lean) ───
  {
    id: 'golden-50',
    description: '밤 골목 계단 — 벽에 기대 대화하다 계단을 뛰어 내려간다',
    analyzed: {
      format: 'novel',
      seed: 0,
      modelVersion: 'rule-only',
      scenes: [
        {
          index: 0,
          slug: 'scene-00',
          summary: '재하가 벽에 기대 서 있고, 은채는 계단에 걸터앉아 있다.',
          meta: {
            location: '골목',
            cameraAngle: 'medium',
            emotion: 'neutral',
            mood: 'calm',
            timeOfDay: 'night',
            pacing: 'slow',
          },
          lines: [
            { index: 0, speaker: '재하', text: '여기 있으면 소리가 잘 들려.' },
            { index: 1, speaker: '은채', text: '...그러네.' },
          ],
          characters: ['재하', '은채'],
          confidence: 0.85,
        },
        {
          index: 1,
          slug: 'scene-01',
          summary: '멀리서 비명이 들리자 재하가 계단을 뛰어 내려간다.',
          meta: {
            location: 'outdoor',
            cameraAngle: 'wide',
            emotion: 'tense',
            mood: 'action',
            timeOfDay: 'night',
            pacing: 'fast',
          },
          lines: [{ index: 0, speaker: '재하', text: '너는 여기 있어!' }],
          characters: ['재하'],
          confidence: 0.88,
        },
      ],
      characters: [
        { name: '재하', mentionCount: 6 },
        { name: '은채', mentionCount: 4 },
      ],
    },
    expectedActionKeywords: [
      { sceneIndex: 0, character: '재하', actions: ['wall-lean', 'leaning', 'standing', 'stair'] },
      {
        sceneIndex: 0,
        character: '은채',
        actions: ['stair', 'sitting', 'floor-lean-sitting', 'knee-up-sitting'],
      },
      { sceneIndex: 1, character: '재하', actions: ['running', 'stair', 'falling', 'jumping'] },
    ],
  },
]
