'use client';
import dynamic from 'next/dynamic';
import { useAppearance } from './appearance-provider';
const NativePortal = dynamic(() => import('./native-portal'), { ssr: false });
const DashboardApp = dynamic(() => import('./dashboard-app'), { ssr: false });
export default function ApplicationPortal({ native }: { native: boolean }) {
  const { locale } = useAppearance();
  return <section aria-label={locale === 'fr' ? 'Mon compte' : 'My account'}>{native ? <NativePortal/> : <DashboardApp/>}</section>;
}
