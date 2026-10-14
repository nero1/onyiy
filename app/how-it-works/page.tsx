import {PublishedPage,publicLocale,publicMetadata,type LocaleQuery} from '@/server/public-pages';
export const dynamic='force-dynamic';
export async function generateMetadata({searchParams}:{searchParams:LocaleQuery}){const locale=publicLocale((await searchParams).locale);return publicMetadata('/how-it-works',locale,locale==='fr'?'Comment ça marche':'How it works');}
export default async function Page({searchParams}:{searchParams:LocaleQuery}){return <PublishedPage locale={publicLocale((await searchParams).locale)} slug='mechanics'/>;}
