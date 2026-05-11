import { describe, expect, it } from 'vitest'

import * as mod from '../src/index.js'

describe('@storywork/editor-text', () => {
  it('모듈이 import 됩니다', () => {
    expect(mod).toBeDefined()
  })

  it('AddTextCommand 클래스를 export 한다', () => {
    expect(mod.AddTextCommand).toBeDefined()
    expect(typeof mod.AddTextCommand).toBe('function')
  })

  it('EditTextCommand 클래스를 export 한다', () => {
    expect(mod.EditTextCommand).toBeDefined()
    expect(typeof mod.EditTextCommand).toBe('function')
  })

  it('createTextObject 함수를 export 한다', () => {
    expect(mod.createTextObject).toBeDefined()
    expect(typeof mod.createTextObject).toBe('function')
  })

  it('attachTextInputMode 함수를 export 한다', () => {
    expect(mod.attachTextInputMode).toBeDefined()
    expect(typeof mod.attachTextInputMode).toBe('function')
  })

  it('hasForbiddenLineEnd 함수를 export 한다', () => {
    expect(mod.hasForbiddenLineEnd).toBeDefined()
    expect(typeof mod.hasForbiddenLineEnd).toBe('function')
  })

  it('SUPPORTED_FONTS 배열을 export 한다', () => {
    expect(Array.isArray(mod.SUPPORTED_FONTS)).toBe(true)
    expect(mod.SUPPORTED_FONTS.length).toBeGreaterThan(0)
  })
})
