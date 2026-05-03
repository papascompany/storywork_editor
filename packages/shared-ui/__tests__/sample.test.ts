import { describe, expect, it } from 'vitest'

import * as ui from '../src/index.js'

describe('@storywork/ui', () => {
  it('모듈이 import 됩니다', () => {
    expect(ui).toBeDefined()
  })

  it('컴포넌트 exports 가 정의됩니다', () => {
    expect(ui.Button).toBeDefined()
    expect(ui.Input).toBeDefined()
    expect(ui.Card).toBeDefined()
    expect(ui.Dialog).toBeDefined()
    expect(ui.Sheet).toBeDefined()
  })

  it('ThemeProvider export 가 정의됩니다', () => {
    expect(ui.ThemeProvider).toBeDefined()
    expect(ui.useTheme).toBeDefined()
    expect(ui.themeScript).toBeDefined()
  })

  it('cn 유틸이 export 됩니다', () => {
    expect(ui.cn).toBeDefined()
    expect(ui.cn('a', 'b')).toBe('a b')
  })

  it('토큰 exports 가 정의됩니다', () => {
    expect(ui.brand).toBeDefined()
    expect(ui.spacing).toBeDefined()
    expect(ui.radius).toBeDefined()
    expect(ui.breakpoints).toBeDefined()
  })
})
