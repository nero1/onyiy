import {handleApiRequest} from '@/server/api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleApiRequest('POST',['admin', 'simulation', 'reorgs', 'reconfirm'],request)}

export const maxDuration=60;
