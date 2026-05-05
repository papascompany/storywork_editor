import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    // jsdom 환경에서 fabric 브라우저 엔트리를 사용한다
    // fabric/node 는 bundled canvas 컴파일이 필요하므로 사용하지 않는다
    environment: 'jsdom',
    setupFiles: ['__tests__/setup.ts'],
    include: ['__tests__/**/*.test.ts', 'src/**/*.test.ts'],
  },
})
