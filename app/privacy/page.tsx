import {PublishedPage,publicLocale,publicMetadata,type LocaleQuery} from '@/server/public-pages';
export const dynamic='force-dynamic';
export async function generateMetadata({searchParams}:{searchParams:LocaleQuery}){const locale=publicLocale((await searchParams).locale);return publicMetadata('/privacy',locale,locale==='fr'?'Confidentialité':'Privacy');}
export default async function Page({searchParams}:{searchParams:LocaleQuery}){return <PublishedPage locale={publicLocale((await searchParams).locale)} slug='privacy'/>;}
