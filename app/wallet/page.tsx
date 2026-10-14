import ApplicationPortal from '@/components/application-portal';
import { readManifest } from "@gifters/db";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!(await readManifest()).feature_wallets) notFound();
  return <ApplicationPortal native={process.env.APP_ENV === "testnet"}/>;
}
