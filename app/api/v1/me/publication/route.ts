import {handleApiRequest} from '@/server/api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export const GET=(request:Request)=>handleApiRequest('GET',['me', 'publication'],request);
export const POST=(request:Request)=>handleApiRequest('POST',['me', 'publication'],request);
