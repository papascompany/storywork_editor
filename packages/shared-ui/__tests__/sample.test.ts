import { describe, expect, it } from 'vitest'

import * as ui from '../src/index.js'

describe('@storywork/ui', () => {
  it('모듈이 import 됩니다', () => {
    expect(ui).toBeDefined()
  })
})
