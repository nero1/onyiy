import NativePortal from "@/components/native-portal";
import DashboardApp from "@/components/dashboard-app";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return process.env.APP_ENV === "testnet" ? (
    <NativePortal />
  ) : (
    <DashboardApp />
  );
}
