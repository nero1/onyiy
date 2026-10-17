import {handleApiRequest} from '@/server/api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export const POST=(request:Request)=>handleApiRequest('POST',['admin', 'release-profiles', 'commit'],request);
