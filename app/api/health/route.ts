import { validateRuntimeEnv } from '@gifters/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = validateRuntimeEnv();
    return Response.json({
      status: 'ok',
      environment: config.appEnv,
      database: config.dbProvider,
      cache: config.cacheProvider,
      signer: process.env.SIGNER_PROVIDER ?? 'disabled',
      mainnet: false,
      framework: 'nextjs',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ status: 'misconfigured' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
