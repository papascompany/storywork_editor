import path from 'path'

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 모노레포 루트를 명시해 lockfile 감지 경고 제거
  outputFileTracingRoot: path.join(__dirname, '../../'),

  // Transpile monorepo packages
  transpilePackages: [
    '@storywork/editor-core',
    '@storywork/editor-layers',
    '@storywork/editor-history',
    '@storywork/editor-template',
    '@storywork/editor-pose',
    '@storywork/editor-text',
    '@storywork/editor-effects',
    '@storywork/editor-export',
    '@storywork/editor-ui',
    '@storywork/ai-script',
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
    return config
  },
}

export default nextConfig
