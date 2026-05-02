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
}

export default nextConfig
