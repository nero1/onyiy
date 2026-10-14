import {handleApiRequest} from '@/server/api';export const runtime='nodejs';export const dynamic='force-dynamic';export const GET=(request:Request)=>handleApiRequest('GET',['statistics'],request);

export const maxDuration=60;
