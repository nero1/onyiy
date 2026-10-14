import {handleApiRequest} from '@/server/api';export const runtime='nodejs';export const dynamic='force-dynamic';export const GET=(request:Request)=>handleApiRequest('GET',['admin','crypto','obligations'],request);

export const maxDuration=60;
