import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@gifters/cache', '@gifters/config', '@gifters/db', '@gifters/domain'],
  poweredByHeader: false,
  outputFileTracingIncludes: {
    '/*': ['./xmanifest.json'],
  },
  async rewrites() {
    return [
      { source: '/api/v1/me/withdrawals/:id/confirm', destination: '/api/v1/me/withdrawals/confirm?withdrawal_id=:id' },
      { source: '/api/v1/admin/plans/:id/activate', destination: '/api/v1/admin/plans/activate?plan_id=:id' },
      { source: '/api/v1/admin/queue/:id', destination: '/api/v1/admin/queue?plan_id=:id' },
    ];
  },
};

export default nextConfig;
