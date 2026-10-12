import MemberPortal from '@/components/member-portal';import {readManifest} from '@gifters/db';import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page(){if(!(await readManifest()).feature_wallets)notFound();return <MemberPortal kind="history"/>}
