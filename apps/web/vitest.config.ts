import path from 'path'

import { defineConfig } from 'vitest/config'

// React 플러그인은 vitest 의 vite 버전과 충돌을 피하기 위해
// defineConfig (vitest/config) 에서 직접 import 한다.
// JSX 변환은 vitest 기본 esbuild transform 으로 처리된다.

export default defineConfig({
  resolve: {
    alias: {
      // monorepo workspace packages — src 직접 참조 (dist 빌드 불필요)
      '@storywork/editor-core': path.resolve(__dirname, '../../packages/editor-core/src/index.ts'),
      '@storywork/editor-layers': path.resolve(
        __dirname,
        '../../packages/editor-layers/src/index.ts',
      ),
      '@storywork/editor-history': path.resolve(
        __dirname,
        '../../packages/editor-history/src/index.ts',
      ),
      '@storywork/editor-export': path.resolve(
        __dirname,
        '../../packages/editor-export/src/index.ts',
      ),
      '@storywork/editor-text': path.resolve(__dirname, '../../packages/editor-text/src/index.ts'),
      '@storywork/schema/editor': path.resolve(
        __dirname,
        '../../packages/shared-schema/src/editor/v1.ts',
      ),
      '@storywork/schema': path.resolve(__dirname, '../../packages/shared-schema/src/index.ts'),
      '@storywork/ui': path.resolve(__dirname, '../../packages/shared-ui/src/index.ts'),
      '@storywork/utils': path.resolve(__dirname, '../../packages/shared-utils/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['__tests__/setup.ts'],
    include: [
      '__tests__/**/*.test.ts',
      '__tests__/**/*.test.tsx',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
    ],
    passWithNoTests: true,
  },
})
