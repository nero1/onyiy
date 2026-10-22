import {withPreview} from '@/server/preview-reads';
import {isReadOnlyPreview, validateRuntimeEnv } from '@gifters/config';
import { databaseHealthy } from '@gifters/db';
import {publicPreviewManifest,withContext} from '@gifters/db';
import {publicOperationsHealth} from '@/server/operational-diagnostics';
import {admitPublicMiss} from '@/server/public-admission';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let pending:Promise<Response>|undefined;
let cached:{response:Response;until:number}|undefined;
export async function GET(request:Request){
  if(cached&&cached.until>performance.now())return cached.response.clone();
  if(!pending){
    pending=(async()=>{try{await admitPublicMiss(request);return await probe()}catch{return Response.json({status:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})}})();
    const current=pending;
    void current.then(response=>{cached={response:response.clone(),until:performance.now()+(response.ok?5000:1000)};}).finally(()=>{if(pending===current)pending=undefined;});
  }
  return (await pending).clone();
}
async function probe() {
  try {
    const config = validateRuntimeEnv();
    if(isReadOnlyPreview()){await withPreview(tx=>publicPreviewManifest(tx));return Response.json({status:'ok',environment:config.appEnv,deployment:'preview',read_only:true,signer:'disabled',mainnet:false},{headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});}
    if (!await databaseHealthy()) {
      return Response.json({ status: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    return Response.json({
      status: 'ok',
      environment: config.appEnv,
      deployment: process.env.VERCEL_ENV ?? 'unhosted',
      database: config.dbProvider,
      cache: config.cacheProvider,
      signer: process.env.SIGNER_PROVIDER ?? 'disabled',
      mainnet: config.appEnv==='mainnet'&&process.env.MAINNET_ENABLED==='true',
      framework: 'nextjs',
      operations:await withContext({access:'service'},publicOperationsHealth),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ status: 'misconfigured' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

export const maxDuration=60;
