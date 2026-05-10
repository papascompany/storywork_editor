/**
 * Apple Touch Icon (iOS 홈스크린)
 * 180×180, 검정 배경 + lime "S"
 */

import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        borderRadius: 40,
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontSize: 120,
          fontWeight: 700,
          color: '#dceeb1', // block-lime
          lineHeight: 1,
          marginTop: -6,
        }}
      >
        S
      </span>
    </div>,
    {
      ...size,
    },
  )
}
