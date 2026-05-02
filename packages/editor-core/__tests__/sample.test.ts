import { describe, expect, it } from 'vitest'

import * as editorCore from '../src/index.js'

describe('@storywork/editor-core', () => {
  it('모듈이 import 됩니다', () => {
    expect(editorCore).toBeDefined()
  })
})
