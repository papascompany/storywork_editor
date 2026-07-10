import path from 'path'

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),

  transpilePackages: ['@storywork/schema', '@storywork/ui', '@storywork/utils'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3001'],
    },
  },

  // 포즈 썸네일 등 Supabase Storage 이미지 허용
  images: {
    remotePatterns: [
      // Supabase Storage — 실제 프로젝트 호스트로 고정 (와일드카드 금지)
      {
        protocol: 'https',
        hostname: 'wjpyeqckuxyfeytuzgon.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      // Supabase Storage public URL (signed URL 없이)
      {
        protocol: 'https',
        hostname: 'wjpyeqckuxyfeytuzgon.supabase.co',
        pathname: '/storage/v1/render/**',
      },
      // localhost Supabase (로컬 개발 환경)
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/**',
      },
    ],
  },

  webpack: (config) => {
    config.resolve = config.resolve ?? {}
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    }
    return config
  },
}

export default nextConfig
