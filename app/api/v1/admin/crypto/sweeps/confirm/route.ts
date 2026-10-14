import {handleApiRequest} from '@/server/api';export const runtime='nodejs';export const dynamic='force-dynamic';export const POST=(request:Request)=>handleApiRequest('POST',['admin','crypto','sweeps','confirm'],request);

export const maxDuration=60;
