/**
 * 성능 마이크로 벤치마크.
 * 100 객체 add → toJson → fromJson 라운드트립 < 200ms
 *
 * pnpm --filter @storywork/editor-core bench
 */
import { Rect } from 'fabric'
import { bench, describe } from 'vitest'

import { StoryCanvas } from '../src/canvas/StoryCanvas.js'
import type { Format, ObjectKind } from '../src/types.js'

const B5: Format = {
  id: 'b5-bench',
  widthMm: 182,
  heightMm: 257,
  dpi: 96,
}

const KINDS: ObjectKind[] = ['pose', 'background', 'decoration', 'text', 'prop']

describe('StoryCanvas 성능', () => {
  bench(
    '100 객체 add → toJson → loadJson 라운드트립 < 200ms',
    async () => {
      const canvas = new StoryCanvas({ format: B5 })

      // 100개 객체 추가
      for (let i = 0; i < 100; i++) {
        const kind = KINDS[i % KINDS.length] as ObjectKind
        const rect = new Rect({
          left: (i % 10) * 15,
          top: Math.floor(i / 10) * 25,
          width: 10 + (i % 5),
          height: 20 + (i % 3),
        })
        canvas.addObject({ kind }, rect)
      }

      // 직렬화
      const json = canvas.toJson()

      // 역직렬화
      const canvas2 = new StoryCanvas({ format: B5 })
      await canvas2.loadJson(json)
      canvas2.dispose()

      canvas.dispose()
    },
    {
      time: 2000, // 2초 동안 반복
      warmupTime: 500,
    },
  )

  bench(
    '빈 페이지 toJson (베이스라인)',
    () => {
      const canvas = new StoryCanvas({ format: B5 })
      canvas.toJson()
      canvas.dispose()
    },
    {
      time: 1000,
      warmupTime: 200,
    },
  )
})
