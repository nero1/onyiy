import {handleApiRequest} from '@/server/api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function POST(request:Request){return handleApiRequest('POST',['internal','prices'],request)}
