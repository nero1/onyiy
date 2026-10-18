import AccountPortal from '@/components/account-portal';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{preview?:string|string[]}>}){const query=await searchParams,preview=query.preview==='admin'||query.preview==='moderation'?query.preview:undefined;return <AccountPortal staff={preview==='moderation'} preview={preview}/>}
