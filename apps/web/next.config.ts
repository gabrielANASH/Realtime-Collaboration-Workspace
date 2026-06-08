import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: ['@workspace/shared'],
};

export default nextConfig;
