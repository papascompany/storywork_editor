// ─────────────────────────────────────────────
// default-templates.ts — 기본 5 프리셋 인라인 정의
//
// API 가 비어있거나 오프라인일 때 사용.
// DOM/Node 양쪽에서 import 가능.
// ─────────────────────────────────────────────

import type { TemplateSpec } from './template-types.js'

/**
 * 기본 판형 (B5 130×200, bleed 3mm, safe 5mm)
 */
const DEFAULT_FORMAT = {
  widthMm: 130,
  heightMm: 200,
  bleedMm: 3,
  safeMm: 5,
}

/**
 * 기본 5 프리셋 템플릿.
 *
 * 좌표는 모두 정규화 (0..1).
 * M4 ai-layout 이 이 데이터를 그대로 활용한다.
 */
export const DEFAULT_TEMPLATES: TemplateSpec[] = [
  {
    id: 'default-1on1',
    name: '1대1 대화',
    formatId: 'default-b5',
    format: DEFAULT_FORMAT,
    intent: '두 캐릭터 대화 장면',
    slots: [
      {
        id: 'bg',
        kind: 'background',
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        rotation: 0,
        preferredTags: [],
        locked: true,
        hint: '배경',
      },
      {
        id: 'left-pose',
        kind: 'pose',
        x: 0.05,
        y: 0.25,
        w: 0.38,
        h: 0.65,
        rotation: 0,
        preferredTags: [],
        locked: false,
        hint: '왼쪽 화자',
      },
      {
        id: 'right-pose',
        kind: 'pose',
        x: 0.57,
        y: 0.25,
        w: 0.38,
        h: 0.65,
        rotation: 0,
        preferredTags: [],
        locked: false,
        hint: '오른쪽 화자',
      },
      {
        id: 'bubble-left',
        kind: 'speech-bubble',
        x: 0.05,
        y: 0.04,
        w: 0.42,
        h: 0.18,
        rotation: 0,
        preferredTags: [],
        locked: false,
        hint: '왼쪽 말풍선',
      },
      {
        id: 'bubble-right',
        kind: 'speech-bubble',
        x: 0.53,
        y: 0.04,
        w: 0.42,
        h: 0.18,
        rotation: 0,
        preferredTags: [],
        locked: false,
        hint: '오른쪽 말풍선',
      },
    ],
  },
  {
    id: 'default-fullshot',
    name: '풀샷 단독',
    formatId: 'default-b5',
    format: DEFAULT_FORMAT,
    intent: '캐릭터 1명 중앙 전신',
    slots: [
      {
        id: 'bg',
        kind: 'background',
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        rotation: 0,
        preferredTags: [],
        locked: true,
        hint: '배경',
      },
      {
        id: 'center-pose',
        kind: 'pose',
        x: 0.2,
        y: 0.1,
        w: 0.6,
        h: 0.85,
        rotation: 0,
        preferredTags: ['fullshot', 'standing'],
        locked: false,
        hint: '중앙 전신 캐릭터',
      },
      {
        id: 'caption',
        kind: 'speech-bubble',
        x: 0.1,
        y: 0.04,
        w: 0.8,
        h: 0.1,
        rotation: 0,
        preferredTags: ['caption'],
        locked: false,
        hint: '내레이션 박스',
      },
    ],
  },
  {
    id: 'default-closeup',
    name: '클로즈업',
    formatId: 'default-b5',
    format: DEFAULT_FORMAT,
    intent: '얼굴 클로즈업 + 감정 강조',
    slots: [
      {
        id: 'bg',
        kind: 'background',
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        rotation: 0,
        preferredTags: [],
        locked: true,
        hint: '배경',
      },
      {
        id: 'face-pose',
        kind: 'pose',
        x: 0.1,
        y: 0.05,
        w: 0.8,
        h: 0.7,
        rotation: 0,
        preferredTags: ['closeup', 'face'],
        locked: false,
        hint: '얼굴 클로즈업',
      },
      {
        id: 'bubble',
        kind: 'speech-bubble',
        x: 0.05,
        y: 0.78,
        w: 0.9,
        h: 0.18,
        rotation: 0,
        preferredTags: [],
        locked: false,
        hint: '대사',
      },
    ],
  },
  {
    id: 'default-landscape',
    name: '풍경 단독',
    formatId: 'default-b5',
    format: DEFAULT_FORMAT,
    intent: '장면 전환 / 풍경 효과',
    slots: [
      {
        id: 'bg',
        kind: 'background',
        x: 0,
        y: 0,
        w: 1,
        h: 0.75,
        rotation: 0,
        preferredTags: ['landscape', 'wide'],
        locked: false,
        hint: '배경 (와이드)',
      },
      {
        id: 'caption-top',
        kind: 'speech-bubble',
        x: 0.05,
        y: 0.78,
        w: 0.9,
        h: 0.18,
        rotation: 0,
        preferredTags: ['caption'],
        locked: false,
        hint: '내레이션 박스',
      },
    ],
  },
  {
    id: 'conti-2x4',
    name: '콘티 2×4',
    formatId: 'default-b5',
    format: DEFAULT_FORMAT,
    intent: '콘티 시트 (8컷 그리드) — CONTI-02',
    // ai-layout conti-sheet.ts CONTI_GRID 와 동일 레이아웃의 정규화 근사.
    // 상단 헤더 영역(제목 행)을 비우고 2열×4행 컷 프레임을 배치한다.
    slots: Array.from({ length: 8 }, (_, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      return {
        id: `cut-r${row + 1}c${col + 1}`,
        kind: 'background' as const,
        x: 0.05 + col * 0.475,
        y: 0.09 + row * 0.225,
        w: 0.425,
        h: 0.2,
        rotation: 0,
        preferredTags: [],
        locked: false,
        hint: `컷 ${i + 1}`,
      }
    }),
  },
  {
    id: 'default-3panel',
    name: '3분할 컷',
    formatId: 'default-b5',
    format: DEFAULT_FORMAT,
    intent: '세 장면 연속 컷',
    slots: [
      {
        id: 'panel-top',
        kind: 'background',
        x: 0.02,
        y: 0.02,
        w: 0.96,
        h: 0.3,
        rotation: 0,
        preferredTags: [],
        locked: false,
        hint: '상단 컷',
      },
      {
        id: 'panel-mid',
        kind: 'background',
        x: 0.02,
        y: 0.35,
        w: 0.96,
        h: 0.3,
        rotation: 0,
        preferredTags: [],
        locked: false,
        hint: '중간 컷',
      },
      {
        id: 'panel-bot',
        kind: 'background',
        x: 0.02,
        y: 0.68,
        w: 0.96,
        h: 0.3,
        rotation: 0,
        preferredTags: [],
        locked: false,
        hint: '하단 컷',
      },
    ],
  },
]
