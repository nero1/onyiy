import {PublishedPage,publicLocale,publicMetadata,type LocaleQuery} from '@/server/public-pages';
export const dynamic='force-dynamic';
export async function generateMetadata({searchParams}:{searchParams:LocaleQuery}){const locale=publicLocale((await searchParams).locale);return publicMetadata('/terms',locale,locale==='fr'?'Conditions de test':'Test terms');}
export default async function Page({searchParams}:{searchParams:LocaleQuery}){return <PublishedPage locale={publicLocale((await searchParams).locale)} slug='terms'/>;}
