/**
 * favicon — Next.js 동적 아이콘 (admin)
 * 검정 배경 + lime "A" 글자 (admin 식별용, web 은 "S")
 *
 * 생성 사이즈: 32×32 (favicon용)
 * Next.js 가 자동으로 /icon 경로에 서빙
 */

import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: '#111111',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#dceeb1',
          lineHeight: 1,
          marginTop: -1,
        }}
      >
        A
      </span>
    </div>,
    {
      ...size,
    },
  )
}
