import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer', 'puppeteer-core', '@prisma/client', 'prisma', 'sharp'],

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],
  },
}

export default nextConfig
