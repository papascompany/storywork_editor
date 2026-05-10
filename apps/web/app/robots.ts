import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/editor/internal/'],
    },
    sitemap: 'https://storywork-editor-web.vercel.app/sitemap.xml',
  }
}
