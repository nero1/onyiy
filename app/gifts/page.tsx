import NativePortal from "@/components/native-portal";
import DashboardApp from "@/components/dashboard-app";
import { readManifest } from "@gifters/db";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!(await readManifest()).feature_gifts) notFound();
  return process.env.APP_ENV === "testnet" ? (
    <NativePortal />
  ) : (
    <DashboardApp />
  );
}
