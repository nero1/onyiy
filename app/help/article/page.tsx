import {notFound,permanentRedirect} from 'next/navigation';
import {publicHelpSlug} from '@/server/public-reads';
import {PublishedPage,publicLocale,publicMetadata,publishedArticles,localizedPath,type LocaleQuery} from '@/server/public-pages';
export const dynamic='force-dynamic';
type Props={searchParams:LocaleQuery};
async function resolve(props:Props){const query=await props.searchParams,slug=typeof query.slug==='string'?query.slug:'',locale=publicLocale(query.locale);if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug))notFound();let canonical:string;try{canonical=await publicHelpSlug(locale,slug)}catch(error){if(error instanceof Error&&error.message==='NOT_FOUND')notFound();throw error}if(canonical!==slug)permanentRedirect(localizedPath('/help/'+canonical,locale));const article=(await publishedArticles(locale)).find(row=>row.slug===canonical);if(!article)notFound();return {locale,slug:canonical,article};}
export async function generateMetadata(props:Props){const value=await resolve(props);return publicMetadata('/help/'+value.slug,value.locale,value.article.title,value.article.body.slice(0,160));}
export default async function Page(props:Props){const value=await resolve(props);return <PublishedPage locale={value.locale} slug={value.slug}/>;}
