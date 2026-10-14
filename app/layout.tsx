import ProductFooter from '@/components/product-footer';
import AppearanceProvider from '@/components/appearance-provider';
import NavigationFrame from '@/components/navigation-frame';
import {headers} from 'next/headers';
import {publicPolicy} from '@/server/public-pages';
import './globals.css';
import PublicInformation from '@/components/public-information';

export async function generateMetadata(){const locale=(await headers()).get('x-public-locale')==='fr'?'fr':'en',policy=await publicPolicy();return {title:'Gifters World',description:policy.product_content.short_description[locale],manifest:'/manifest.webmanifest'};}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale=(await headers()).get('x-public-locale')==='fr'?'fr':'en';
  const policy=await publicPolicy();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body><AppearanceProvider locale={locale}><NavigationFrame policy={policy}/><PublicInformation/>{children}<ProductFooter content={policy.product_content} help={policy.feature_help}/></AppearanceProvider></body>
    </html>
  );
}
