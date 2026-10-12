import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gifters World',
  description: 'Give and you shall receive almost double what you gave.',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
