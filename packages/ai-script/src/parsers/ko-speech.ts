/**
 * ko-speech.ts — 한국어 화자귀속 1층 룰 엔진 (SCRIPT-KO-01)
 *
 * research 2026-07-21 §4.1 "3단 하이브리드"의 1층:
 *  - 발화동사 **어간 패턴** 매칭 — 활용형 전체(했다/하며/한다/하자/묻자/외치며…)를 커버.
 *    어간 사전은 정규식 조각으로 관리하며, 향후 Kiwi(LGPL v3, 별도 프로세스 게이트)
 *    형태소 분석기가 같은 시그니처(SPEECH_VERB_RE 탐지)를 대체할 수 있게 모듈 경계 유지
 *  - **따옴표 규약 delimiter 플러그인** (gutenberg-dialog 언어 플러그인 패턴):
 *    큰따옴표(곧은/굽은)·「」·『』 = 대화, 대시(—/―/–) 행 = 대화
 *  - **캐릭터 ID 레지스트리** (BookNLP 패턴): 호격(아/야)·애칭 '이'(민준이→민준)·
 *    성+이름(김민준↔민준) 별칭을 canonical ID 로 병합, 최근 언급 추적(대명사 해소)
 *
 * 귀속 우선순위 (NAACL 2025: 명시적 인용 인접은 룰로 거의 완벽):
 *  1. 후행 발화동사: "…" (이)라고/하고 철수가 말했다
 *  2. 선행 발화동사: 철수가 말했다. "…"
 *  3. 선행 행동 귀속: 영희가 고개를 들었다. "…" (같은 단락 최근접 인물)
 *  4. 대명사(그/그녀) + 발화동사 → 레지스트리 최근 언급 인물
 *  5. 화자 교대 보정 (CSN-SAPR 패턴): 대화-전용 단락 + 최근 화자 2인 확립 시
 *
 * 결정론: 정규식·사전 기반 — 같은 입력 → 같은 출력.
 */

import { isLikelyName } from './utils.js'

// ─────────────────────────────────────────────
// 발화동사 어간 패턴 사전
// ─────────────────────────────────────────────
// 각 항목은 "어간 + 축약/활용 분기"를 담은 정규식 조각.
// 하다-류는 `X(?:했|하|한|할|해)`, 치다-류는 `X(?:쳤|치|친|칠)` 식으로
// 과거축약(했/쳤/렸/였)과 현재·연결·관형 활용을 함께 커버한다.

const HA = '(?:했|하|한다|할|해)' // 하다-류 공통 분기 ('한'은 관형 오탐 → 한다만)
const SPEECH_VERB_PATTERNS: readonly string[] = [
  `말${HA}`,
  `(?:이야기|얘기)${HA}`,
  `대답${HA}`,
  `대꾸${HA}`,
  `답${HA}`,
  `반문${HA}`,
  `되물(?:었|으며|으면서)`,
  `물(?:었다|었고|었지만|으며|으면서|어보)`,
  `묻(?:는다|자|기도|곤)`,
  `설명${HA}`,
  `지적${HA}`,
  `반박${HA}`,
  `항변${HA}`,
  `재촉${HA}`,
  `호소${HA}`,
  `부탁${HA}`,
  `애원${HA}`,
  `하소연${HA}`,
  `푸념${HA}`,
  `명령${HA}`,
  `지시${HA}`,
  `제안${HA}`,
  `권${HA}`,
  `혼잣말(?:을)?\\s*${HA}`,
  `외(?:쳤|치며|치면서|친다|칠)`,
  `소리(?:쳤|치며|치면서|친다|칠)`,
  `소리(?:\\s*질렀|지르며|지른다)`,
  `고함(?:쳤|치며|친다)`,
  `다그(?:쳤|치며|친다)`,
  `받아(?:쳤|치며|친다)`,
  `쏘아붙(?:였|이며|인다)`,
  `내뱉(?:었|으며|는다)`,
  `덧붙(?:였|이며|인다)`,
  `부르짖(?:었|으며|는다)`,
  `속삭(?:였|이며|인다)`,
  `중얼(?:거렸|거리며|거린다|댔|대며)`,
  `웅얼(?:거렸|거리며|거린다|댔|대며)`,
  `투덜(?:거렸|거리며|거린다|댔|대며)`,
  `구시렁(?:거렸|거리며|거린다|댔|대며)`,
  `읊조(?:렸|리며|린다)`,
  `되뇌(?:었|였|며)`,
  `털어놓(?:았|으며|는다)`,
  `밝(?:혔|히며|힌다)`,
  `입을\\s*(?:열었|뗐|떼며)`,
  `말을\\s*(?:이었|잇|꺼냈|꺼내며|받았|받으며|건넸|건네며)`,
] as const

/** 발화동사 활용형 매처 (Kiwi 어댑터 교체 지점) */
export const SPEECH_VERB_RE = new RegExp(`(?:${SPEECH_VERB_PATTERNS.join('|')})`)

// ─────────────────────────────────────────────
// 따옴표 규약 delimiter 플러그인
// ─────────────────────────────────────────────

export interface ExtractedQuote {
  text: string
  /** 단락 내 시작/끝 오프셋 (열림 기호 포함 앞/뒤) */
  start: number
  end: number
}

/** 대화 인용 기호 쌍 — 작은따옴표(''‘’)는 생각/강조 관행이라 대화로 취급하지 않음 */
const DIALOGUE_QUOTE_RE = /["“”「『]([^"“”」』\n]{1,200})["“”」』]/g

/** 대시 대화 행 (출판 관행: — 대사) */
const DASH_LINE_RE = /^[—―–-]\s*(.{1,200})$/

/** 단락에서 대화 인용을 위치와 함께 추출 */
export function extractDialogueQuotes(para: string): ExtractedQuote[] {
  const out: ExtractedQuote[] = []
  const re = new RegExp(DIALOGUE_QUOTE_RE.source, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(para)) !== null) {
    const text = m[1] ?? ''
    out.push({ text, start: m.index, end: m.index + m[0].length })
  }

  // 인용 기호가 전혀 없으면 대시 대화 행 검사 (행 단위)
  if (out.length === 0) {
    let offset = 0
    for (const line of para.split('\n')) {
      const dm = DASH_LINE_RE.exec(line.trim())
      if (dm && line.trim().length > 1) {
        out.push({ text: dm[1] ?? '', start: offset, end: offset + line.length })
      }
      offset += line.length + 1
    }
  }
  return out
}

// ─────────────────────────────────────────────
// 캐릭터 ID 레지스트리 (BookNLP 패턴)
// ─────────────────────────────────────────────

export class CharacterRegistry {
  /** canonical → 언급 수 */
  private counts = new Map<string, number>()
  /** alias → canonical */
  private aliases = new Map<string, string>()
  /** 최근 언급 순서 (canonical, 마지막 요소가 가장 최근) — 인물 확정 항목만 */
  private recency: string[] = []
  /** 인물로 확정된 canonical (발화 귀속 또는 인물성 술어 동반 언급) */
  private persons = new Set<string>()

  /**
   * 표기형을 canonical ID 로 정규화.
   * - 호격 '아/야' 제거: 민준아 → 민준 (3자 이상일 때만)
   * - 애칭 '이' 제거: 민준이 → 민준 (기지 인물이거나 3자 이상일 때)
   * - 성+이름 병합: 김민준 ↔ 민준 (기지 canonical 의 접미 일치)
   */
  normalize(raw: string): string {
    const known = this.aliases.get(raw)
    if (known) return known

    let name = raw
    // 호격 제거 (민준아/영희야) — 기지 인물일 때만 (김수아 같은 본명 오탐 방지)
    if (name.length >= 3 && /[아야]$/.test(name)) {
      const base = name.slice(0, -1)
      if (this.counts.has(base) || this.aliases.has(base)) name = base
    }
    // 애칭 '이' 제거 (민준이 → 민준)
    if (name.length >= 3 && name.endsWith('이')) {
      const base = name.slice(0, -1)
      if (this.counts.has(base) || base.length >= 2) name = base
    }
    // 성+이름: 기존 canonical 이 name 의 접미(길이차 1)면 병합 (김민준 → 민준)
    if (name.length >= 3) {
      for (const canon of this.counts.keys()) {
        if (name.length - canon.length === 1 && name.endsWith(canon)) {
          this.aliases.set(raw, canon)
          return canon
        }
      }
    }
    // 역방향: name(2자)이 기존 3자 canonical 의 접미면 그 canonical 사용하지 않고
    // 짧은 이름을 canonical 로 승격 — 기존 긴 형태를 alias 로 재배선
    if (name.length === 2) {
      for (const canon of [...this.counts.keys()]) {
        if (canon.length - name.length === 1 && canon.endsWith(name)) {
          const count = this.counts.get(canon) ?? 0
          this.counts.delete(canon)
          this.counts.set(name, (this.counts.get(name) ?? 0) + count)
          this.aliases.set(canon, name)
          this.recency = this.recency.map((c) => (c === canon ? name : c))
          if (this.persons.delete(canon)) this.persons.add(name)
        }
      }
    }

    if (name !== raw) this.aliases.set(raw, name)
    return name
  }

  /**
   * 언급 기록 (서사 순서대로 호출 — 최근성 추적).
   * isPerson=true 이거나 이미 인물 확정된 경우에만 최근성 목록에 오른다 —
   * '간판이/불빛이' 류 무생물 주어가 대명사·행동 귀속을 오염시키지 않게 한다.
   */
  mention(raw: string, isPerson = false): string {
    const canon = this.normalize(raw)
    this.counts.set(canon, (this.counts.get(canon) ?? 0) + 1)
    if (isPerson) this.persons.add(canon)
    if (this.persons.has(canon)) {
      this.recency = this.recency.filter((c) => c !== canon)
      this.recency.push(canon)
    }
    return canon
  }

  /** 발화 귀속 등으로 인물 확정 */
  confirmPerson(raw: string): string {
    return this.mention(raw, true)
  }

  isPerson(raw: string): boolean {
    return this.persons.has(this.normalize(raw))
  }

  /** 가장 최근 언급된 인물 (대명사 그/그녀 해소용) */
  mostRecent(): string | undefined {
    return this.recency[this.recency.length - 1]
  }

  size(): number {
    return this.counts.size
  }
}

// ─────────────────────────────────────────────
// 귀속 엔진
// ─────────────────────────────────────────────

/** 이름 + 주격/보조 조사 — 서사 언급 수집용 */
const NAME_MENTION_RE = /([가-힣]{2,4})(?:이|가|은|는|께서|도)(?=\s|$|,)/g

/** 대명사 주어 */
const PRONOUN_RE = /(?:그녀|그)(?:이|가|은|는|께서|도)?(?=\s|$|,)/

/** 이름 + 조사 + (짧은 부사구) + 발화동사 */
const NAME_SPEECH_RE = new RegExp(
  `([가-힣]{2,4})(?:이|가|은|는|께서|도)\\s+(?:[가-힣\\s,]{0,20}?)?${SPEECH_VERB_RE.source}`,
)

/** 대명사 + 발화동사 */
const PRONOUN_SPEECH_RE = new RegExp(
  `(?:그녀|그)(?:이|가|은|는|께서|도)?\\s+(?:[가-힣\\s,]{0,20}?)?${SPEECH_VERB_RE.source}`,
)

/**
 * 인물성(animacy) 술어 힌트 — 언급 직후 ~18자 안에 사람다운 행동 술어가 오면
 * 인물로 확정한다 (BookNLP NER 의 룰 근사). '간판이 흔들렸다' 류를 걸러낸다.
 * 신체어는 동사 앵커와 묶어야 오탐이 없다 — '불빛이 그의 얼굴을 비췄다'에서
 * 맨 '얼굴' 매칭으로 불빛이 인물이 되는 사고 방지.
 */
const ANIMATE_HINT_RE = new RegExp(
  '(?:' +
    [
      // 이동/자세
      '앉',
      '일어[나섰]',
      '섰다',
      '서\\s?있',
      '걷',
      '걸[었어]',
      '뛰',
      '달[렸려]',
      '들어[가오왔갔섰]',
      '돌아[보봤왔]',
      '다가[가왔섰]',
      '물러[났서]',
      '멈[췄춰]',
      '기다[렸리]',
      '움직[였이]',
      // 신체어 + 동사 앵커
      '고개를\\s*(?:들|저|끄덕|돌|숙)',
      '눈을\\s*(?:감|뜨|맞|가늘)',
      '손을\\s*(?:들|흔|내밀|잡|뻗)',
      '입을\\s*(?:열|다물|뗐|떼|삐죽)',
      '한숨을\\s*(?:쉬|내쉬|삼)',
      '숨을\\s*(?:들이|내쉬|죽|골)',
      '어깨를\\s*(?:으쓱|들썩|움츠)',
      '팔짱을',
      '미소를',
      '눈물[이을]\\s*(?:흘|차|글썽|맺|쏟)',
      '말을\\s*(?:잃|삼|아꼈)',
      // 시선/표정/생각
      '바라보',
      '쳐다보',
      '올려다보',
      '내려다보',
      '살폈',
      '살피',
      '웃',
      '울(?:었|고|며|음)',
      '끄덕',
      '저었',
      '생각[했하]',
      '생각에\\s*잠',
      // 일상 행위
      '읽고',
      '읽었',
      '마셨',
      '먹[었고]',
      '열었',
      // 발화동사 전체
      SPEECH_VERB_RE.source,
    ].join('|') +
    ')',
)

export interface AttributionContext {
  registry: CharacterRegistry
  /** 직전 대화 화자 (canonical) */
  lastSpeaker?: string
  /** 그 이전의 다른 화자 (교대 보정용) */
  prevSpeaker?: string
}

export function createAttributionContext(): AttributionContext {
  return { registry: new CharacterRegistry() }
}

/**
 * 서사 텍스트에서 인물 언급을 레지스트리에 기록.
 * 언급 직후 인물성 술어(ANIMATE_HINT_RE)가 따라오면 인물로 확정한다.
 */
export function recordMentions(text: string, registry: CharacterRegistry): void {
  const re = new RegExp(NAME_MENTION_RE.source, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const raw = m[1] ?? ''
    if (!isLikelyName(raw)) continue
    const after = text.slice(re.lastIndex, re.lastIndex + 18)
    registry.mention(raw, ANIMATE_HINT_RE.test(after))
  }
}

/** 창(window) 텍스트에서 이름+발화동사 귀속 시도 */
function findSpeakerInWindow(window: string, registry: CharacterRegistry): string | undefined {
  const m = NAME_SPEECH_RE.exec(window)
  if (m && isLikelyName(m[1] ?? '')) return registry.confirmPerson(m[1] ?? '')
  // 대명사 + 발화동사 → 최근 언급 인물
  if (PRONOUN_SPEECH_RE.test(window)) return registry.mostRecent()
  return undefined
}

/** 창 텍스트에서 최근접(마지막) 인물 언급 — 행동 귀속용 (인물 확정 항목만) */
function findNearestMention(window: string, registry: CharacterRegistry): string | undefined {
  const re = new RegExp(NAME_MENTION_RE.source, 'g')
  let last: string | undefined
  let m: RegExpExecArray | null
  while ((m = re.exec(window)) !== null) {
    const raw = m[1] ?? ''
    if (!isLikelyName(raw)) continue
    const after = window.slice(re.lastIndex, re.lastIndex + 18)
    const canon = registry.mention(raw, ANIMATE_HINT_RE.test(after))
    if (registry.isPerson(canon)) last = canon
  }
  if (last) return last
  // 대명사 단독 주어(발화동사 없이)도 행동 귀속으로 허용
  if (PRONOUN_RE.test(window)) return registry.mostRecent()
  return undefined
}

/** 단락이 인용 전용(서사 없이 대사만)인지 */
function isQuoteOnlyParagraph(para: string, quotes: ExtractedQuote[]): boolean {
  let rest = ''
  let pos = 0
  for (const q of quotes) {
    rest += para.slice(pos, q.start)
    pos = q.end
  }
  rest += para.slice(pos)
  return rest.replace(/[\s.!?…,~\-—―]/g, '').length === 0
}

export interface AttributedQuote extends ExtractedQuote {
  speaker?: string
}

/**
 * 단락 하나의 인용들에 화자를 귀속한다. ctx 는 서사 순서대로 갱신된다.
 */
export function attributeParagraph(para: string, ctx: AttributionContext): AttributedQuote[] {
  const quotes = extractDialogueQuotes(para)
  const { registry } = ctx

  if (quotes.length === 0) {
    // 서사 단락 — 인물 언급만 기록
    recordMentions(para, registry)
    return []
  }

  const quoteOnly = isQuoteOnlyParagraph(para, quotes)
  const attributed: AttributedQuote[] = []

  for (let i = 0; i < quotes.length; i++) {
    const q = quotes[i]
    if (!q) continue
    const preStart = i === 0 ? 0 : (quotes[i - 1]?.end ?? 0)
    const preWindow = para.slice(preStart, q.start)
    const postEnd = i + 1 < quotes.length ? (quotes[i + 1]?.start ?? para.length) : para.length
    const postWindow = para.slice(q.end, postEnd)

    // 서사 창의 인물 언급을 먼저 기록 (대명사 해소가 최신 상태를 보게)
    recordMentions(preWindow, registry)

    // 1) 후행 발화동사  2) 선행 발화동사
    let speaker =
      findSpeakerInWindow(postWindow, registry) ?? findSpeakerInWindow(preWindow, registry)

    // 3) 선행 행동 귀속 (같은 단락 서사 창의 최근접 인물)
    if (!speaker && preWindow.trim().length > 0) {
      speaker = findNearestMention(preWindow, registry)
    }

    // 4) 인용 전용 단락 + 직전 단락 화자 없음 → 직전 서사의 최근접 인물은
    //    이미 3)에서 소진 — 교대 보정 시도
    if (!speaker && quoteOnly && ctx.lastSpeaker) {
      if (ctx.prevSpeaker && ctx.prevSpeaker !== ctx.lastSpeaker) {
        speaker = ctx.prevSpeaker // A-B 교대: 마지막 화자의 상대
      }
    }

    if (speaker) {
      if (speaker !== ctx.lastSpeaker) {
        ctx.prevSpeaker = ctx.lastSpeaker
        ctx.lastSpeaker = speaker
      }
    }

    attributed.push({ ...q, speaker })
    recordMentions(postWindow, registry)
  }

  return attributed
}
