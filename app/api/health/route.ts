import { validateRuntimeEnv } from '@gifters/config';
import { databaseHealthy } from '@gifters/db';
import {withContext} from '@gifters/db';
import {publicOperationsHealth} from '@/server/operational-diagnostics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = validateRuntimeEnv();
    if (!await databaseHealthy()) {
      return Response.json({ status: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    return Response.json({
      status: 'ok',
      environment: config.appEnv,
      database: config.dbProvider,
      cache: config.cacheProvider,
      signer: process.env.SIGNER_PROVIDER ?? 'disabled',
      mainnet: false,
      framework: 'nextjs',
      operations:await withContext({access:'service'},publicOperationsHealth),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ status: 'misconfigured' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
