import {z} from 'zod';
import {currentRequestId as requestId,readManifest} from '@gifters/db';
import {authenticate,requireStepUp} from './auth';
import {boundedJson} from './request-body';
export function ok(data: unknown, status = 200) {
  return Response.json({ data, meta: { request_id: requestId() } }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function current(request:Request){return (await authenticate(request)).user;}

export async function admin(request:Request,preview=false){const identity=await authenticate(request);if(identity.user.role!=='admin'||identity.user.status!=='active')throw new Error('FORBIDDEN');await requireStepUp(identity);const policy=await readManifest();if(!policy.feature_admin&&request.method!=='GET'&&!preview)throw new Error('FEATURE_DISABLED');return identity.user;}

export async function moderator(request:Request){const identity=await authenticate(request);if(!['admin','moderator'].includes(identity.user.role)||identity.user.status!=='active')throw new Error('FORBIDDEN');await requireStepUp(identity);return identity.user;}

export async function json(request: Request) {
  return boundedJson(request);
}

export function idempotencyKey(request: Request) {
  const key = request.headers.get('Idempotency-Key');
  if (!key) throw new Error('INVALID_INPUT');
  return z.string().uuid().parse(key).toLowerCase();
}

export function resourceId(request: Request, queryKey: string, publicPath: RegExp) {
  const url = new URL(request.url);
  const match = publicPath.exec(url.pathname);
  return z.string().uuid().parse(match?.[1] ?? url.searchParams.get(queryKey));
}
