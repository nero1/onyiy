import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gifters World',
    short_name: 'Gifters World',
    description: 'Give and you shall receive.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f5ff',
    theme_color: '#6d4aff',
  };
}
