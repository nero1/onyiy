import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@gifters/cache', '@gifters/config', '@gifters/db', '@gifters/domain', '@gifters/chains'],
  poweredByHeader: false,
  outputFileTracingIncludes: {
    '/*': ['./xmanifest.json'],
  },
  async headers(){return [{source:'/sw.js',headers:[{key:'Cache-Control',value:'no-cache'},{key:'Service-Worker-Allowed',value:'/'},{key:'X-Content-Type-Options',value:'nosniff'}]},{source:'/offline.html',headers:[{key:'Cache-Control',value:'public, max-age=0, must-revalidate'},{key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}]}] },
  async rewrites() {
    return [
      {source:'/help/:slug',destination:'/help?article=:slug'},
      { source: '/api/v1/admin/simulation/allocations/:id/reorg', destination: '/api/v1/admin/simulation/allocations/reorg?allocation_id=:id' },
      { source: '/api/v1/admin/simulation/reorgs/:id/reconfirm', destination: '/api/v1/admin/simulation/reorgs/reconfirm?review_id=:id' },
      { source: '/api/v1/gifts/invoices/:id/cancel', destination: '/api/v1/gifts/invoices/cancel?invoice_id=:id' },
      { source: '/api/v1/gifts/invoices/:id/transaction', destination: '/api/v1/gifts/invoices/transaction?invoice_id=:id' },
      { source: '/api/v1/admin/simulation/invoices/:id/control', destination: '/api/v1/admin/simulation/invoices/control?invoice_id=:id' },
      { source: '/api/v1/admin/simulation/invoices/:id/resolve', destination: '/api/v1/admin/simulation/invoices/resolve?invoice_id=:id' },
      { source: '/api/v1/admin/reconcile/reports/:id', destination: '/api/v1/admin/reconcile/report?report_id=:id' },
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
