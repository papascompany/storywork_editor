import '@testing-library/jest-dom'

// @hookform/resolvers/zod 가 Zod v4 에서 검증 실패 시 ZodError 를 unhandled rejection 으로 던진다.
// 이는 라이브러리 내부 동작이며 테스트 결과에는 영향 없음.
// vitest 가 이를 "unhandled error" 로 잡아 경고를 출력하므로 전역 핸들러로 무시한다.
if (typeof process !== 'undefined') {
  process.on('unhandledRejection', (reason) => {
    // ZodError 관련 rejection 은 무시
    if (reason !== null && typeof reason === 'object' && '_zod' in (reason as object)) {
      return
    }
  })
}
