// deploy-retrigger 2026-06-08: 레포 PUBLIC 복귀 후 BLOCKED 커밋 반영을 위한
// turbo-ignore 강제 빌드 트리거 (핸드오프 §9). 기능 변경 없음.
import { ThemeProvider, ToastProvider } from '@storywork/ui'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'

import './globals.css'

export const metadata: Metadata = {
  title: 'StoryWork Admin',
  description: 'StoryWork 관리자 콘솔 — 판형/템플릿/리소스 관리',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

/**
 * Pretendard Variable — 한/영 균형 가변 폰트 (PERF-ADMIN-04).
 * CSS 변수: --font-pretendard (globals.css :root 의 --nike-font-text 에서 참조)
 *
 * - 서브셋: KS X 1001 한글 2,350자 + 라틴·기호 (2.0MB → 0.5MB, wght 축 유지).
 *   재생성은 scripts/subset-pretendard.py. 밖의 음절(똠·햏 등)은 글자 단위 fallback.
 * - preload 끔: preload 된 폰트는 Chrome 이 잠깐 렌더를 막아 FCP 를 늦춘다
 *   (실측 브로드밴드 248→144ms, Slow 4G 608→444ms). CSS 에서 바로 발견되므로
 *   폰트 도착 시각은 preload 와 거의 같다(725 vs 757ms), CLS 0.0002.
 */
const pretendard = localFont({
  src: [
    {
      path: '../public/fonts/PretendardVariable.subset.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  variable: '--font-pretendard',
  display: 'swap',
  preload: false,
  fallback: [
    'Pretendard',
    'Noto Sans KR',
    '-apple-system',
    'BlinkMacSystemFont',
    'system-ui',
    'sans-serif',
  ],
})

const themeInitScript = `(function(){try{var s=localStorage.getItem('sw-admin-theme');var d=s==='light'||s==='dark'?s:s==='system'||!s?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):'light';if(d==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // --font-pretendard 는 :root 에서 계산되는 --nike-font-* 가 참조하므로 <html> 에 둬야 한다.
    // <body> 에 두면 :root 에서 미정의 → fallback 'Pretendard Variable' 로 고정돼 웹폰트가 쓰이지
    // 않았다(로컬에 Pretendard 가 설치된 PC 에서만 Pretendard 로 보였음, 2026-11-18 발견).
    <html lang="ko" suppressHydrationWarning className={pretendard.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={pretendard.className}>
        <ThemeProvider defaultTheme="system" storageKey="sw-admin-theme">
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
