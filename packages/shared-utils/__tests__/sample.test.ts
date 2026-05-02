import { describe, expect, it } from 'vitest'

import * as utils from '../src/index.js'

describe('@storywork/utils', () => {
  it('모듈이 import 됩니다', () => {
    expect(utils).toBeDefined()
  })
})
