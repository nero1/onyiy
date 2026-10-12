import { handleApiRequest } from '@/server/api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
export async function POST(request:Request) {
  return handleApiRequest('POST',['internal','tick'],request);
}
