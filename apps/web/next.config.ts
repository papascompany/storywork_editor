import path from 'path'

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 모노레포 루트를 명시해 lockfile 감지 경고 제거
  outputFileTracingRoot: path.join(__dirname, '../../'),

  // 외부 이미지 도메인 허용 (Supabase Storage)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wjpyeqckuxyfeytuzgon.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Transpile monorepo packages
  // NOTE: @storywork/ai-script 은 Node.js 전용(fs/import.meta.url 사용)이라
  //   transpile 에서 제외하고 dist/ 빌드를 사용한다.
  //   Vercel 배포 전 pnpm --filter @storywork/ai-script build 선행 필수.
  transpilePackages: [
    '@storywork/editor-core',
    '@storywork/editor-layers',
    '@storywork/editor-history',
    '@storywork/editor-template',
    '@storywork/editor-pose',
    '@storywork/editor-text',
    '@storywork/editor-bubble',
    '@storywork/editor-effects',
    '@storywork/editor-export',
    '@storywork/editor-ui',
    '@storywork/ai-recommend',
    '@storywork/ai-layout',
    '@storywork/pdf-engine',
    '@storywork/schema',
    '@storywork/ui',
    '@storywork/utils',
  ],
  experimental: {
    // React 19 + Server Actions
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  webpack: (config) => {
    // .js import 를 .ts/.tsx 로 resolve (ESM TypeScript 소스 직접 컴파일 지원)
    config.resolve = config.resolve ?? {}
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    }

    // @storywork/ai-script 은 Node.js 서버 전용 패키지 (fs/import.meta.url 사용)
    // webpack 번들에 포함하지 않고 런타임 require 로 처리
    const originalExternals = config.externals ?? []
    config.externals = [
      ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals]),
      '@storywork/ai-script',
    ]

    return config
  },
}

export default nextConfig
