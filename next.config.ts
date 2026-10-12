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
      { source: '/api/v1/me/withdrawals/:id/cancel', destination: '/api/v1/me/withdrawals/cancel?withdrawal_id=:id' },
      { source: '/api/v1/admin/simulation/withdrawals/:id/control', destination: '/api/v1/admin/simulation/withdrawals/control?withdrawal_id=:id' },
      { source: '/api/v1/admin/simulation/withdrawals/:id/resolve', destination: '/api/v1/admin/simulation/withdrawals/resolve?withdrawal_id=:id' },
      { source: '/api/v1/admin/jobs/:id/replay', destination: '/api/v1/admin/jobs/replay?job_id=:id' },
      { source: '/api/v1/me/withdrawals/:id/confirm', destination: '/api/v1/me/withdrawals/confirm?withdrawal_id=:id' },
      { source: '/api/v1/admin/plans/:id/activate', destination: '/api/v1/admin/plans/activate?plan_id=:id' },
      { source: '/api/v1/admin/queue/:id', destination: '/api/v1/admin/queue?plan_id=:id' },
    ];
  },
};

export default nextConfig;
