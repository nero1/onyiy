import {isReadOnlyPreview} from '@gifters/config';
import type { MetadataRoute } from 'next';
import { canonicalOrigin, publicPolicy } from '@/server/public-pages';
export const dynamic = 'force-dynamic';
export default async function robots(): Promise<MetadataRoute.Robots> {
  if(isReadOnlyPreview())return {rules:{userAgent:'*',disallow:'/'}};
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/admin', '/moderation', '/settings', '/wallet', '/points', '/referrals', '/notifications', '/share', '/recover'] },
    sitemap: canonicalOrigin(await publicPolicy()) + '/sitemap.xml',
  };
}
