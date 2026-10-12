import {handleApiRequest} from '@/server/api';
export const runtime='nodejs';export const dynamic='force-dynamic';
export function GET(request:Request){return handleApiRequest('GET',["me", "account"],request)}
export function POST(request:Request){return handleApiRequest('POST',["me", "account"],request)}
