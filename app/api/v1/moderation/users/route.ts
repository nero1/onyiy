import {handleApiRequest} from '@/server/api';
export const runtime='nodejs';export const dynamic='force-dynamic';
export function GET(request:Request){return handleApiRequest('GET',["moderation", "users"],request)}
export function POST(request:Request){return handleApiRequest('POST',["moderation", "users"],request)}
