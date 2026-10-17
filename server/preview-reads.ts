import {searchPublishedHelpRows} from './help-search';
import {and,asc,eq} from 'drizzle-orm';
import {validateRuntimeEnv} from '@gifters/config';
import {db,publicPreviewTransaction,publicPreviewManifest,assets,plans,planVersions,helpArticles,slugRedirects,type DbExecutor} from '@gifters/db';
import {planFinancialPresentation} from './presentation';

export function withPreview<T>(fn:(tx:DbExecutor)=>Promise<T>){
 const environment=validateRuntimeEnv().appEnv;
 if(!['simulation','testnet','mainnet'].includes(environment))throw new Error('CONFIGURATION_INVALID');
 return publicPreviewTransaction(db(),environment as 'simulation'|'testnet'|'mainnet',fn);
}
export async function previewManifest(){return withPreview(async tx=>{
 const policy=await publicPreviewManifest(tx);
 return {policy,data:{...policy,read_only_preview:true,configuration_available:true,payment_environment:validateRuntimeEnv().appEnv}};
});}
export async function previewCatalog(){return withPreview(async tx=>{
 const policy=await publicPreviewManifest(tx),environment=validateRuntimeEnv().appEnv;
 if(!policy.feature_gifts)throw new Error('FEATURE_DISABLED');
 const currencies=await tx.select({id:assets.id,symbol:assets.symbol,network:assets.chainId,decimals:assets.decimals,enabled:assets.enabled,environment:assets.environment}).from(assets).where(eq(assets.environment,environment)).orderBy(asc(assets.symbol)).limit(21);
 if(currencies.length>20)throw new Error('CONFIGURATION_INVALID');
 const rows=await tx.select({id:plans.id,name:plans.name,slug:plans.slug,status:plans.status,asset_id:assets.id,asset:assets.symbol,symbol:assets.symbol,network:assets.chainId,environment:assets.environment,decimals:assets.decimals,version_id:planVersions.id,amount_base_units:planVersions.amountBaseUnits,usd_reference:planVersions.usdReference,receipts_required:planVersions.receiptsRequired,receiver_bps:planVersions.receiverBps,marketing_bps:planVersions.marketingBps,referral_bps:planVersions.referralBps,developer_bps:planVersions.developerBps,reserve_bps:planVersions.reserveBps}).from(planVersions).innerJoin(plans,eq(plans.id,planVersions.planId)).innerJoin(assets,eq(assets.id,planVersions.assetId)).where(and(eq(assets.environment,environment),eq(planVersions.active,true))).orderBy(asc(plans.name),asc(assets.symbol)).limit(801);
 if(rows.length>800)throw new Error('CONFIGURATION_INVALID');
 const entries=rows.map(row=>({...row,profile_revision:policy.profile_revision,plan:planFinancialPresentation({amountBaseUnits:row.amount_base_units,usdReference:row.usd_reference,receiverBps:row.receiver_bps,marketingBps:row.marketing_bps,referralBps:row.referral_bps,developerBps:row.developer_bps,reserveBps:row.reserve_bps,receiptsRequired:row.receipts_required},{symbol:row.asset,decimals:row.decimals,chainId:row.network,environment:row.environment})}));
 return {policy,data:{mode:environment,read_only_preview:true,execution_enabled:false,assets:currencies.map(row=>({...row,key:row.symbol.toLowerCase()})),plans:entries}};
});}
export async function previewHelp(locale:'en'|'fr'){return withPreview(async tx=>{
 const policy=await publicPreviewManifest(tx);if(!policy.feature_help)throw new Error('FEATURE_DISABLED');
 const data=await tx.select({locale:helpArticles.locale,slug:helpArticles.slug,title:helpArticles.title,body:helpArticles.body,version:helpArticles.version}).from(helpArticles).where(and(eq(helpArticles.locale,locale),eq(helpArticles.published,true))).orderBy(asc(helpArticles.slug)).limit(101);
 if(data.length>100||Buffer.byteLength(JSON.stringify(data))>3*1024*1024)throw new Error('CONFIGURATION_INVALID');return {policy,data};
});}
export async function previewHelpRedirect(locale:'en'|'fr',slug:string){return withPreview(async tx=>{
 const rows=await tx.select({slug:helpArticles.slug}).from(slugRedirects).innerJoin(helpArticles,eq(helpArticles.id,slugRedirects.articleId)).where(and(eq(slugRedirects.locale,locale),eq(slugRedirects.oldSlug,slug),eq(helpArticles.published,true))).limit(1);
 if(!rows[0])throw new Error('NOT_FOUND');return rows[0].slug;
});}

export async function previewHelpSearch(locale:'en'|'fr',query:string){return withPreview(async tx=>{
 const policy=await publicPreviewManifest(tx);if(!policy.feature_help)throw new Error('FEATURE_DISABLED');
 const rows=await searchPublishedHelpRows(tx,locale,query);return {policy,data:{locale,query,rows}};
});}
