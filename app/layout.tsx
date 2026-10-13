import type { Metadata } from 'next';
import './globals.css';
import PublicInformation from '@/components/public-information';

export const metadata: Metadata = {
  title: 'Gifters World',
  description: 'Give and you shall receive almost double what you gave.',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body><PublicInformation/>{children}</body>
    </html>
  );
}
