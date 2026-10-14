import {handleApiRequest} from '@/server/api';
export const runtime='nodejs';export const dynamic='force-dynamic';
export function POST(request:Request){return handleApiRequest('POST',["me", "appeals"],request)}

export const maxDuration=60;
