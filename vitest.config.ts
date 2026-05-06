import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 각 패키지에서 직접 vitest run 하는 방식 사용
    // 루트에서 실행 시 모든 워크스페이스 패키지 테스트를 포함
    include: [
      'packages/*/src/**/*.test.ts',
      'packages/*/__tests__/**/*.test.ts',
      'scripts/__tests__/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    globals: true,
    environment: 'node',
  },
})
