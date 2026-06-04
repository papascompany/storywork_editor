/**
 * apps/workers/src/inngest-client.ts
 *
 * Inngest 클라이언트 초기화.
 * eventKey 는 환경변수 INNGEST_EVENT_KEY 에서 읽습니다.
 * 개발 모드에서는 키 없이도 동작합니다.
 *
 * 사용:
 *   import { inngest } from './inngest-client.js'
 */

import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'storywork',
  name: 'StoryWork Workers',
  // eventKey 는 Inngest SDK 가 INNGEST_EVENT_KEY 환경변수를 자동으로 읽습니다.
  // 명시적으로 넘기면 테스트에서 오버라이드 가능합니다.
})
