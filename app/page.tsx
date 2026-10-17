import {selectedPaymentEnvironment} from '@gifters/config';
import {isReadOnlyPreview} from '@gifters/config';
import ApplicationPortal from '@/components/application-portal';
import {PublicCatalog,publicLocale,publicMetadata,type LocaleQuery} from '@/server/public-pages';

export const dynamic = "force-dynamic";

export async function generateMetadata({searchParams}:{searchParams:LocaleQuery}){return publicMetadata('/',publicLocale((await searchParams).locale));}

export default async function HomePage({searchParams}:{searchParams:LocaleQuery}) {
  const locale=publicLocale((await searchParams).locale);
  return <><PublicCatalog locale={locale}/>{!isReadOnlyPreview()&&<ApplicationPortal environment={selectedPaymentEnvironment()}/>}</>;
}
