import type { MetadataRoute } from 'next';
import {readManifest} from '@gifters/db';import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  if(!(await readManifest()).feature_pwa)notFound();
  return {
    name: 'Gifters World',
    short_name: 'Gifters World',
    description: 'Give and you shall receive.',
    start_url: '/',
    id:'/',scope:'/',
    icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}],
    display: 'standalone',
    background_color: '#f7f5ff',
    theme_color: '#6d4aff',
  };
}
