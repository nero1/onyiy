'use client';
import dynamic from 'next/dynamic';
import { useAppearance } from './appearance-provider';
const NativePortal = dynamic(() => import('./native-portal'), { ssr: false });
const DashboardApp = dynamic(() => import('./dashboard-app'), { ssr: false });
export default function ApplicationPortal({ environment }: { environment:'simulation'|'testnet'|'mainnet' }) {
  const { locale } = useAppearance();
  return <section aria-label={locale === 'fr' ? 'Mon compte' : 'My account'}>{environment!=='simulation' ? <NativePortal environment={environment}/> : <DashboardApp/>}</section>;
}
