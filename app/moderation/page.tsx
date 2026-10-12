import AccountPortal from '@/components/account-portal';
import {readManifest} from '@gifters/db';import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page(){if(!(await readManifest()).feature_moderation)notFound();return <AccountPortal staff/>}
