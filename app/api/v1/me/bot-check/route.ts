import {handleApiRequest} from '@/server/api';export const runtime='nodejs';export const dynamic='force-dynamic';export const POST=(request:Request)=>handleApiRequest('POST',['me','bot-check'],request);

export const maxDuration=60;
