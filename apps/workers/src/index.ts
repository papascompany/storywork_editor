/**
 * StoryWork Workers — Inngest 함수 진입점
 *
 * M4+ 에서 실제 함수를 등록합니다.
 * 현재는 Inngest 클라이언트 초기화 스텁입니다.
 */
import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'storywork',
  name: 'StoryWork Workers',
})

// 향후 함수 등록 예시 (M4):
// export const analyzescript = inngest.createFunction(...)
// export const buildPdf = inngest.createFunction(...)
