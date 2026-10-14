import {handleApiRequest} from '@/server/api';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){return handleApiRequest('GET',['auth','2fa','status'],request);}

export const maxDuration=60;
