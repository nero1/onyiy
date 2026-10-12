import HelpBrowser from '@/components/help-browser';
import {readManifest} from '@gifters/db';import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function HelpPage(){const manifest=await readManifest();if(!manifest.feature_help)notFound();return <HelpBrowser/>}
