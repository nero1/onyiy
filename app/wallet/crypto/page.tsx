import {readManifest} from '@gifters/db';
import {notFound} from 'next/navigation';
import {selectedPaymentEnvironment} from '@gifters/config';
import NativePortal from '@/components/native-portal';
export const dynamic='force-dynamic';
export default async function Page(){const environment=selectedPaymentEnvironment();if(environment==='simulation'||!(await readManifest()).feature_wallets)notFound();return <NativePortal environment={environment}/>}
