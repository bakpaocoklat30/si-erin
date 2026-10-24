/** @type {import('next').NextConfig} */
// Trigger restart untuk reload Prisma Client
const nextConfig = {
  output: 'standalone',

  images: {
    unoptimized: true,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },

  
  async rewrites() {
    return [
      {
        source: '/uploads/:filename',
        destination: '/api/files/uploads/:filename',
      },
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ];
  },

  poweredByHeader: false,

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
