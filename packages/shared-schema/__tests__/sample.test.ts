import { describe, expect, it } from 'vitest'

import * as schema from '../src/index.js'

describe('@storywork/schema', () => {
  it('모듈이 import 됩니다', () => {
    expect(schema).toBeDefined()
  })
})
