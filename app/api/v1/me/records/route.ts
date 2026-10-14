import {handleApiRequest} from '@/server/api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export function GET(request:Request){return handleApiRequest('GET',['me','records'],request)}

export const maxDuration=60;
