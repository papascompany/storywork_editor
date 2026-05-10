import { withThemeByClassName } from '@storybook/addon-themes'
import type { Preview } from '@storybook/react'

// shared-ui 전역 스타일 import
import '../../../packages/shared-ui/src/styles/globals.css'
// 마케팅 토큰 (mkt-* CSS 변수, 유틸리티 클래스) — Marketing 스토리에 필요
import '../../web/app/globals.css'

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // 모바일 viewport 프리셋
    viewport: {
      viewports: {
        mobile360: {
          name: '모바일 360',
          styles: { width: '360px', height: '800px' },
          type: 'mobile',
        },
        mobile390: {
          name: 'iPhone 14 (390)',
          styles: { width: '390px', height: '844px' },
          type: 'mobile',
        },
        mobile414: {
          name: 'iPhone Plus (414)',
          styles: { width: '414px', height: '896px' },
          type: 'mobile',
        },
        tablet768: {
          name: '태블릿 768',
          styles: { width: '768px', height: '1024px' },
          type: 'tablet',
        },
        desktop1280: {
          name: '데스크톱 1280',
          styles: { width: '1280px', height: '800px' },
          type: 'desktop',
        },
      },
    },
    // a11y 기본 설정
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
  },
  decorators: [
    // 다크모드 토글: html.dark 클래스 전략
    withThemeByClassName({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
  ],
}

export default preview
