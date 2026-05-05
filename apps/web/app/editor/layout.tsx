/**
 * /editor 전용 레이아웃
 *
 * H7: user-scalable=no — 편집기에서 핀치줌이 캔버스 인터랙션과 충돌하는 것을 방지.
 *     Next.js 15 viewport export 방식으로 <meta name="viewport"> 를 override 한다.
 *     루트 layout.tsx 의 viewport 는 건드리지 않아 admin/landing 에는 영향 없음.
 *
 * H6: editor.css 에서 touch-action: none 과 body[data-route="editor"] 스타일 적용.
 *     body dataset 설정은 EditorShell(client) 의 useEffect 에서 처리한다.
 */

import type { Viewport } from 'next'

import './editor.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return children
}
