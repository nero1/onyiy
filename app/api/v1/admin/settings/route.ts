import {handleApiRequest} from '@/server/api';
export const runtime='nodejs';export const dynamic='force-dynamic';
export function GET(request:Request){return handleApiRequest('GET',["admin", "settings"],request)}
export function POST(request:Request){return handleApiRequest('POST',["admin", "settings"],request)}
