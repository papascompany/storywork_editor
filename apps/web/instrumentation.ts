/**
 * apps/web/instrumentation.ts
 *
 * Next.js 서버 부트 훅 — 프로세스 시작 시 1회 실행된다 (FOLLOWUP-70-5).
 *
 * 중앙 env 검증 모듈(./src/env)을 import 하면 그 모듈 로드 시점에 validateEnv() 가 돌아
 * 서버 환경변수를 부팅 시점에 검증한다. 진짜 프로덕션(VERCEL_ENV !== 'preview')에서
 * 필수 변수(CRON_SECRET·DATABASE_URL 등) 누락 시 throw → 배포/부팅 게이트로 작동한다.
 * (기존엔 env 모듈이 어디서도 import 되지 않아 검증이 아예 돌지 않았고, cron 은 런타임 401 로만 방어했다.)
 *
 * - 서버 시크릿은 Edge 런타임에 주입되지 않으므로 Node.js 런타임에서만 검증한다.
 * - preview 배포는 서버 env 를 갖지 않으므로 env.ts 가 preview 를 throw 대상에서 제외한다.
 */
export async function register(): Promise<void> {
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    await import('./src/env')
  }
}
