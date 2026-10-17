import crypto from 'node:crypto';
import {and,asc,eq,sql} from 'drizzle-orm';
import {z} from 'zod';
import {manifestDefinition,transparencySettingKeys,validateManifestValue,parseManifest,validateSecurityCeilings,validatePublicText} from '@gifters/config';
import {auditEvents,helpArticles,slugRedirects,queueEntries,queuePartitions,cycles,planVersions,xManifest,operationKeys,readManifest,type DbExecutor} from '@gifters/db';
import {databaseNow} from './auth';
const reason=z.string().trim().min(3).max(500);const slug=z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
export const settingInput=z.object({key:z.string().min(1).max(150),value:z.unknown(),version:z.number().int().positive(),reason}).strict();
export const priorityInput=z.object({entry_id:z.string().uuid(),enabled:z.boolean(),revision:z.number().int().positive(),reason}).strict();
export const helpInput=z.object({id:z.string().uuid().optional(),locale:z.enum(['en','fr']),slug,title:z.string().trim().min(1).max(200),body:z.string().trim().min(1).max(20000),published:z.boolean(),version:z.number().int().nonnegative(),reason}).strict();
async function prior(tx:DbExecutor,key:string,body:unknown){const digest=crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');const [old]=await tx.select().from(operationKeys).where(eq(operationKeys.businessKey,key)).limit(1);if(old){if(old.requestHash!==digest)throw new Error('VERSION_CONFLICT');return {digest,result:old.result}}return {digest,result:null}}
async function save(tx:DbExecutor,key:string,digest:string,result:Record<string,unknown>){await tx.insert(operationKeys).values({businessKey:key,requestHash:digest,result});return result}
export async function editSetting(tx:DbExecutor,actorId:string,input:z.infer<typeof settingInput>,requestKey:string){
 await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('financial-policy',0))`);
 // Lock the bounded configuration set in a stable order; validate the resulting whole policy.
 const rows=await tx.select().from(xManifest).orderBy(asc(xManifest.key)).limit(1001).for('update');if(rows.length>1000)throw new Error('CONFIGURATION_INVALID');
 const manifest=await readManifest(tx);if(!manifest.feature_admin)throw new Error('FEATURE_DISABLED');const definition=manifestDefinition(input.key);if(!definition)throw new Error('INVALID_INPUT');
 const key=`setting:${actorId}:${requestKey.toLowerCase()}`,saved=await prior(tx,key,input);if(saved.result)return saved.result;
 if(transparencySettingKeys.has(input.key)||manifest.deployment_profile==='transparent'&&['feature_bootstrap','feature_priority','terms_content','public_stats_policy'].includes(input.key))throw new Error('FORBIDDEN');
 const row=rows.find(r=>r.key===input.key);if(!row||row.version!==input.version)throw new Error('VERSION_CONFLICT');const value=validateManifestValue(input.key,input.value,definition.scope);
 // Active/used plan snapshots are immutable. Lifecycle/economics use their own service.
 if(input.key.startsWith('plan_config_')||input.key.startsWith('asset_config_'))throw new Error('FORBIDDEN');
 const resultManifest=parseManifest({...manifest,[input.key]:value});validateSecurityCeilings(resultManifest);
 const now=await databaseNow(tx);await tx.update(xManifest).set({value,version:row.version+1,updatedBy:actorId,updatedAt:now}).where(eq(xManifest.key,input.key));
 await tx.insert(auditEvents).values({actorUserId:actorId,action:'manifest_edit',targetType:'x_manifest',targetId:input.key,reason:input.reason,beforeState:{version:row.version,value:row.value},afterState:{version:row.version+1,value}});
 return save(tx,key,saved.digest,{key:input.key,value,scope:row.scope,version:row.version+1});
}
export async function editPriority(tx:DbExecutor,actorId:string,input:z.infer<typeof priorityInput>,requestKey:string){
 const manifest=await readManifest(tx);if(!manifest.feature_admin||!manifest.feature_priority)throw new Error('FEATURE_DISABLED');const [entry]=await tx.select().from(queueEntries).where(eq(queueEntries.id,input.entry_id)).limit(1);if(!entry)throw new Error('NOT_FOUND');
 // Partition before entry, matching allocation/rank maintenance lock order.
 const [partition]=await tx.select().from(queuePartitions).where(eq(queuePartitions.id,entry.partitionId)).for('update');const [current]=await tx.select().from(queueEntries).where(eq(queueEntries.id,input.entry_id)).for('update');
 const key=`priority:${actorId}:${requestKey.toLowerCase()}`,saved=await prior(tx,key,input);if(saved.result)return saved.result;
 if(current.status!=='waiting'||current.priorityRevision!==input.revision)throw new Error('VERSION_CONFLICT');if(current.kind!=='member')throw new Error('FORBIDDEN');
 const [cycle]=await tx.select({id:cycles.id}).from(cycles).where(eq(cycles.id,current.cycleId!)).limit(1);if(!cycle)throw new Error('CONFIGURATION_INVALID');
 let ticket=current.priorityTicket;if(input.enabled&&ticket===null){ticket=partition.nextPriorityTicket;if(ticket>1099511627775)throw new Error('CONFIGURATION_INVALID');await tx.update(queuePartitions).set({nextPriorityTicket:ticket+1}).where(eq(queuePartitions.id,partition.id));}if(!input.enabled)ticket=null;
 await tx.update(queueEntries).set({priorityTicket:ticket,priorityRevision:current.priorityRevision+1}).where(eq(queueEntries.id,current.id));
 await tx.insert(auditEvents).values({actorUserId:actorId,action:input.enabled?'priority_enable':'priority_revoke',targetType:'queue_entry',targetId:current.id,reason:input.reason,beforeState:{priority_ticket:current.priorityTicket?.toString()??null,revision:current.priorityRevision},afterState:{priority_ticket:ticket?.toString()??null,revision:current.priorityRevision+1}});
 return save(tx,key,saved.digest,{entry_id:current.id,display_ticket:current.ticket.toString(),priority_ticket:ticket?.toString()??null,revision:current.priorityRevision+1});
}
export async function editHelp(tx:DbExecutor,actorId:string,input:z.infer<typeof helpInput>,requestKey:string){
 // Serialize locale/slug reservations, including redirects; IDs never become a public credential.
 await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('help-editor',0))`);const policy=await readManifest(tx);if(!policy.feature_admin||!policy.feature_help)throw new Error('FEATURE_DISABLED');
 const key=`help:${actorId}:${requestKey.toLowerCase()}`,saved=await prior(tx,key,input);if(saved.result)return saved.result;
 validatePublicText(input.title);validatePublicText(input.body);
 const [reserved]=await tx.select().from(slugRedirects).where(and(eq(slugRedirects.locale,input.locale),eq(slugRedirects.oldSlug,input.slug))).limit(1);if(reserved&&reserved.articleId!==input.id)throw new Error('VERSION_CONFLICT');
 const [collision]=await tx.select({id:helpArticles.id}).from(helpArticles).where(and(eq(helpArticles.locale,input.locale),eq(helpArticles.slug,input.slug))).limit(1);if(collision&&collision.id!==input.id)throw new Error('VERSION_CONFLICT');
 const now=await databaseNow(tx);let id=input.id,version=1;
 if(id){const [old]=await tx.select().from(helpArticles).where(eq(helpArticles.id,id)).limit(1).for('update');if(!old)throw new Error('NOT_FOUND');if(old.version!==input.version||old.locale!==input.locale)throw new Error('VERSION_CONFLICT');version=old.version+1;if(old.slug!==input.slug)await tx.insert(slugRedirects).values({locale:old.locale,oldSlug:old.slug,articleId:id}).onConflictDoNothing();await tx.update(helpArticles).set({slug:input.slug,title:input.title,body:input.body,published:input.published,version,updatedAt:now,editedBy:actorId}).where(eq(helpArticles.id,id));}
 else{const existing=await tx.select({id:helpArticles.id}).from(helpArticles).where(eq(helpArticles.locale,input.locale)).limit(101);if(existing.length>=100)throw new Error('CONFIGURATION_INVALID');if(input.version!==0)throw new Error('VERSION_CONFLICT');const [{created}]=await tx.insert(helpArticles).values({locale:input.locale,slug:input.slug,title:input.title,body:input.body,published:input.published,editedBy:actorId}).returning({created:helpArticles.id});id=created;}
 await tx.insert(auditEvents).values({actorUserId:actorId,action:'help_publish',targetType:'help_article',targetId:id,reason:input.reason,afterState:{locale:input.locale,slug:input.slug,published:input.published,version}});
 return save(tx,key,saved.digest,{id,version,slug:input.slug,published:input.published});
}
export async function settings(tx:DbExecutor){const manifest=await readManifest(tx);const rows=await tx.select({key:xManifest.key,version:xManifest.version,scope:xManifest.scope}).from(xManifest).orderBy(asc(xManifest.key)).limit(1001);if(rows.length>1000)throw new Error('CONFIGURATION_INVALID');return rows.filter(row=>Object.hasOwn(manifest,row.key)).map(row=>({...row,value:manifest[row.key]}));}
