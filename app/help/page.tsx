import HelpBrowser from '@/components/help-browser';
import {notFound,permanentRedirect} from 'next/navigation';
import {publicHelpSlug} from '@/server/public-reads';
import {publicLocale,publicMetadata,publicPolicy,publishedArticles,localizedPath,type LocaleQuery} from '@/server/public-pages';
export const dynamic='force-dynamic';
export async function generateMetadata({searchParams}:{searchParams:LocaleQuery}){const locale=publicLocale((await searchParams).locale);return publicMetadata('/help',locale,locale==='fr'?'Aide':'Help');}
export default async function HelpPage({searchParams}:{searchParams:LocaleQuery}){
 const query=await searchParams,locale=publicLocale(query.locale);
 if(!(await publicPolicy()).feature_help)notFound();
 if(query.article){const input=typeof query.article==='string'?query.article:'';if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(input))notFound();let canonical:string;try{canonical=await publicHelpSlug(locale,input)}catch(error){if(error instanceof Error&&error.message==='NOT_FOUND')notFound();throw error}permanentRedirect(localizedPath('/help/'+canonical,locale));}
 return <HelpBrowser initialLocale={locale} initialArticles={await publishedArticles(locale)}/>;
}
