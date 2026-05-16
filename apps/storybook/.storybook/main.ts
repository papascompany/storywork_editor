import path from 'path'

import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(ts|tsx)', '../stories/**/*.mdx'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y', '@storybook/addon-themes'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal(cfg) {
    cfg.resolve ??= {}
    cfg.resolve.alias = {
      ...(cfg.resolve.alias as Record<string, string> | undefined),
      // next/* → lightweight mocks so marketing components compile in Vite
      'next/link': path.resolve(__dirname, '../__mocks__/next-link.tsx'),
      'next/image': path.resolve(__dirname, '../__mocks__/next-image.tsx'),
      'next/navigation': path.resolve(__dirname, '../__mocks__/next-navigation.ts'),
      // apps/web 의 @/* path alias — Header.tsx 등 marketing 컴포넌트 의존
      '@/': `${path.resolve(__dirname, '../../web')}/`,
    }
    return cfg
  },
}

export default config
