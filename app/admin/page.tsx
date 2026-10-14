import ApplicationPortal from '@/components/application-portal';
import {publicPolicy} from '@/server/public-pages';
import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page(){if(!(await publicPolicy()).feature_admin)notFound();return <ApplicationPortal native={process.env.APP_ENV==='testnet'}/>;}
