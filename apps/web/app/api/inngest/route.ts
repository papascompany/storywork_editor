/**
 * apps/web/app/api/inngest/route.ts
 *
 * Inngest serve() 핸들러 — Next.js App Router Route Handler.
 *
 * Inngest Dev Server (로컬) 또는 Inngest Cloud (프로덕션) 가
 * 이 엔드포인트를 통해 함수를 발견(introspect)하고 실행합니다.
 *
 * 등록된 함수:
 *   - pdfBuildJob ('pdf/build.requested')
 *
 * 환경변수:
 *   INNGEST_SIGNING_KEY  — Inngest Cloud 서명 검증 (prod)
 *   INNGEST_EVENT_KEY    — Inngest 이벤트 전송 키
 *   INNGEST_DEV          — '1' 이면 dev 서버 연동 (로컬)
 *
 * 로컬 실행:
 *   npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
 */

import { inngest, pdfBuildJob } from '@storywork/workers'
import { serve } from 'inngest/next'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [pdfBuildJob],
})
