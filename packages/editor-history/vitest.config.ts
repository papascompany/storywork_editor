import { resolve } from 'path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@storywork/editor-core': resolve(__dirname, '../editor-core/src/index.ts'),
      '@storywork/editor-layers': resolve(__dirname, '../editor-layers/src/index.ts'),
      '@storywork/schema/editor': resolve(__dirname, '../shared-schema/src/editor/v1.ts'),
      '@storywork/schema/prisma': resolve(__dirname, '../shared-schema/src/prisma.ts'),
      '@storywork/schema': resolve(__dirname, '../shared-schema/src/index.ts'),
      '@storywork/utils': resolve(__dirname, '../shared-utils/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['__tests__/setup.ts'],
    include: ['__tests__/**/*.test.ts', 'src/**/*.test.ts'],
  },
})
