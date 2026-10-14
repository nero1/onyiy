import ApplicationPortal from '@/components/application-portal';
import {PublicCatalog,publicLocale,publicMetadata,publicPolicy,type LocaleQuery} from '@/server/public-pages';
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export async function generateMetadata({searchParams}:{searchParams:LocaleQuery}){const locale=publicLocale((await searchParams).locale);return publicMetadata('/gifts',locale,locale==='fr'?'Catalogue des dons':'Gift catalog');}

export default async function Page({searchParams}:{searchParams:LocaleQuery}) {
  const locale=publicLocale((await searchParams).locale);
  if (!(await publicPolicy()).feature_gifts) notFound();
  return <><PublicCatalog locale={locale}/><ApplicationPortal native={process.env.APP_ENV === "testnet"}/></>;
}
