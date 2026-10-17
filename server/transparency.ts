import {realStatisticsPreview} from './activity';
import crypto from 'node:crypto';
import {z} from 'zod';
import {and,asc,eq,exists,isNull,lt,sql} from 'drizzle-orm';
import {manifestDefinition,manifestSchema,parseManifest,transparencyDefaults,validateSecurityCeilings,type Manifest} from '@gifters/config';
import {assets,plans,planVersions,auditEvents,chainObservations,cryptoEvents,cryptoInvoices,giftInvoices,operationKeys,outbox,profilePreviews,queueEntries,queuePartitions,readManifest,users,xManifest,type DbExecutor} from '@gifters/db';
import {databaseNow} from './auth';
import {presentationFromManifest,planFinancialPresentation,type PublicQueueDisclosure} from './presentation';
const digest=(value:unknown)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const overrides=z.object({transparency_content:manifestSchema.shape.transparency_content.optional(),verified_activity_policy:manifestSchema.shape.verified_activity_policy.optional(),queue_disclosure_policy:manifestSchema.shape.queue_disclosure_policy.optional(),public_receipt_policy:manifestSchema.shape.public_receipt_policy.optional(),transparency_snapshot_policy:manifestSchema.shape.transparency_snapshot_policy.optional()}).strict();
const options=z.object({preset:z.enum(['transparent','test_iteration']).default('transparent'),bootstrap:z.enum(['labelled','disabled']).default('labelled'),priority:z.enum(['disclosed','disabled']).default('disabled'),activity:z.enum(['verified','labelled_demo','disabled']).default('verified'),public_stats_enabled:z.boolean().default(false),overrides:overrides.optional()}).strict();
export const profilePreviewInput=options;
export const profileStageInput=options.extend({expected_revision:z.number().int().positive(),manifest_version:z.string().regex(/^[a-f0-9]{64}$/),reason:z.string().trim().min(10).max(500)}).strict();
export const profileCommitInput=z.object({stage_id:z.string().uuid(),expected_revision:z.number().int().positive()}).strict();
type Options=z.infer<typeof options>;
type Settings=Partial<Manifest>;
async function rowsAndVersion(tx:DbExecutor,lock=false){
 const query=tx.select().from(xManifest).orderBy(asc(xManifest.key)).limit(1001);
 const rows=lock?await query.for('update'):await query;
 if(rows.length>1000)throw new Error('CONFIGURATION_INVALID');
 return {rows,version:digest(rows.map(row=>[row.key,row.version]))};
}
async function partitionVersions(tx:DbExecutor,lock=false){
 const query=tx.select({id:queuePartitions.id,revision:queuePartitions.revision}).from(queuePartitions).orderBy(asc(queuePartitions.id)).limit(1001);
 const rows=lock?await query.for('update'):await query;
 if(rows.length>1000)throw new Error('CONFIGURATION_INVALID');return rows.map(row=>({id:row.id,revision:String(row.revision)}));
}
function proposedSettings(manifest:Manifest,input:Options):Settings{
 if(process.env.APP_ENV==='mainnet'&&(input.preset==='test_iteration'||input.activity==='labelled_demo'))throw new Error('FEATURE_DISABLED');
 const original=manifest;manifest={...manifest,...input.overrides};
 if(digest(original.transparency_content)!==digest(manifest.transparency_content)&&original.transparency_content.version===manifest.transparency_content.version)throw new Error('CONFIGURATION_INVALID');
 const transparent=input.preset==='transparent',revision=manifest.profile_revision+1;
 const settings:Settings={...input.overrides,deployment_profile:input.preset,feature_transparency:transparent,
  bootstrap_presentation:transparent?input.bootstrap:'legacy',priority_presentation:transparent?input.priority:'legacy',activity_presentation:transparent?input.activity:'fixtures',
  feature_bootstrap:transparent?input.bootstrap!=='disabled':manifest.feature_bootstrap,feature_priority:transparent?input.priority!=='disabled':manifest.feature_priority,
  feature_activity:transparent?input.activity!=='disabled':manifest.feature_activity,
  public_stats_policy:{...manifest.public_stats_policy,enabled:transparent?input.public_stats_enabled:manifest.public_stats_policy.enabled},
  queue_disclosure_policy:transparent?(input.overrides?.queue_disclosure_policy??transparencyDefaults.queue_disclosure_policy):manifest.queue_disclosure_policy,
  public_receipt_policy:transparent?(input.overrides?.public_receipt_policy??transparencyDefaults.public_receipt_policy):manifest.public_receipt_policy,
 };
 const material=original.deployment_profile!=='transparent'||original.bootstrap_presentation!==settings.bootstrap_presentation||original.priority_presentation!==settings.priority_presentation||original.feature_bootstrap!==settings.feature_bootstrap||original.feature_priority!==settings.feature_priority||digest(original.transparency_content)!==digest(manifest.transparency_content);
 if(transparent&&material){const content=manifest.transparency_content,network=process.env.APP_ENV==='mainnet'?{en:'Real-money mainnet payments. Check the asset, network, fees and destination before confirming.',fr:'Paiements réels sur le réseau principal. Vérifiez la monnaie, le réseau, les frais et le destinataire avant de confirmer.'}:process.env.APP_ENV==='testnet'?{en:'Test networks only; payments have no real monetary value.',fr:'Réseaux de test uniquement ; les paiements n’ont aucune valeur monétaire réelle.'}:{en:'GIV simulation only; no real monetary value or wallet redemption.',fr:'Simulation GIV uniquement ; aucune valeur monétaire réelle ni conversion vers un portefeuille.'};
  settings.terms_content={version:`${content.version}-p${revision}`,body:{en:[network.en,content.en.mechanics,content.en.risk,content.en.fees,content.en.slots,input.bootstrap==='disabled'?'No new platform-controlled positions are served; existing credits remain.':'Platform-controlled positions may receive allocations to the developer/platform-designated wallet; they are not ordinary paying members.',input.priority==='disabled'?'New administrative priority is disabled; subsequent serving follows admission order.':'Administrative priority may change receiving order; joining numbers remain separate.'].join('\n\n'),fr:[network.fr,content.fr.mechanics,content.fr.risk,content.fr.fees,content.fr.slots,input.bootstrap==='disabled'?'Aucune nouvelle allocation aux positions contrôlées ; les crédits existants sont conservés.':'Les positions contrôlées peuvent recevoir des allocations vers le portefeuille développeur/désigné ; ce ne sont pas des membres ayant payé.',input.priority==='disabled'?'La nouvelle priorité administrative est désactivée ; l’ordre de réception suit l’admission.':'Une priorité administrative peut modifier l’ordre de réception ; les numéros d’arrivée restent distincts.'].join('\n\n')}};
 }
 const result=parseManifest({...manifest,...settings,profile_revision:revision});validateSecurityCeilings(result);return settings;
}
async function impact(tx:DbExecutor){
 const [queue]=await tx.execute<{waiting:string;untouched_system:string;partial_system:string;remaining_system_slots:string;priority_positions:string}>(sql`select count(*)::text as waiting,count(*) filter(where kind='bootstrap' and credited_count=0)::text as untouched_system,count(*) filter(where kind='bootstrap' and credited_count>0)::text as partial_system,coalesce(sum(required_count-credited_count) filter(where kind='bootstrap'),0)::text as remaining_system_slots,count(*) filter(where priority_ticket is not null)::text as priority_positions from ${queueEntries} where status='waiting'`);
 const [obligations]=await tx.execute<{business_obligations:string}>(sql`select count(*)::text as business_obligations from public.crypto_obligations where source_purpose like 'bootstrap_%' and status not in ('settled','cancelled')`);
 return {...queue,...obligations,financial_deletion:false,existing_obligations_retained:true};
}
async function previewSample(tx:DbExecutor,manifest:Manifest,settings:Settings){
 const [row]=await tx.select({version:planVersions,asset:assets,partition:queuePartitions}).from(planVersions).innerJoin(assets,eq(assets.id,planVersions.assetId)).innerJoin(plans,eq(plans.id,planVersions.planId)).innerJoin(queuePartitions,eq(queuePartitions.planVersionId,planVersions.id)).where(and(eq(assets.environment,process.env.APP_ENV??'simulation'),eq(planVersions.active,true))).orderBy(asc(planVersions.id)).limit(1);
 if(!row)return null;
 const [queue]=await tx.execute<{system_positions:string;system_remaining_slots:string}>(sql`select count(*)::text as system_positions,coalesce(sum(required_count-credited_count),0)::text as system_remaining_slots from ${queueEntries} where partition_id=${row.partition.id} and kind='bootstrap' and status='waiting'`);
 const [priority]=await tx.execute<{positions:string}>(sql`select count(*)::text as positions from ${queueEntries} where partition_id=${row.partition.id} and status='waiting' and priority_ticket is not null`);
 const next={...manifest,...settings},now=await databaseNow(tx),projected:PublicQueueDisclosure={...queue,priority_positions:priority.positions,queue_revision:String(row.partition.revision),snapshot_at:now.toISOString()};
 if(!next.feature_bootstrap||next.bootstrap_presentation==='disabled'){projected.system_positions='0';projected.system_remaining_slots='0';}
 if(!next.feature_priority||next.priority_presentation==='disabled')projected.priority_positions='0';
 return {plan:planFinancialPresentation(row.version,row.asset),queue:projected,projected:true};
}
export async function releaseProfile(tx:DbExecutor,input:Options=options.parse({})){
 const manifest=await readManifest(tx),version=await rowsAndVersion(tx),proposal=proposedSettings(manifest,input);
 const unclassified=await tx.select({id:users.id}).from(users).where(eq(users.publicationClassification,'unreviewed')).orderBy(asc(users.id)).limit(1001);
 return {current:presentationFromManifest(manifest),proposed:presentationFromManifest(parseManifest({...manifest,...proposal,profile_revision:manifest.profile_revision+1})),settings:proposal,
  controls:{transparency_content:manifest.transparency_content,verified_activity_policy:manifest.verified_activity_policy,queue_disclosure_policy:manifest.queue_disclosure_policy,public_receipt_policy:manifest.public_receipt_policy,transparency_snapshot_policy:manifest.transparency_snapshot_policy},
  expected_revision:manifest.profile_revision,manifest_version:version.version,impact:await impact(tx),preview_sample:await previewSample(tx,manifest,proposal),statistics_preview:await realStatisticsPreview(tx,parseManifest({...manifest,...proposal,profile_revision:manifest.profile_revision+1})),readiness:manifest.financial_readiness_record,readiness_version:version.rows.find(row=>row.key==='financial_readiness_record')?.version??1,
  assessment:{unclassified_accounts_at_least:unclassified.length,presentation_does_not_approve_finance:true,mainnet_enabled:false,unresolved:['mainnet_registry_and_execution','isolated_custody_and_signing','funding_refund_and_closure_model','target_jurisdictions_and_review','approved_copy_and_terms','operating_and_gas_budget','hosted_capacity_alerts_and_restore_acceptance']},preview_only:!manifest.feature_transparency};
}
export async function stageProfile(tx:DbExecutor,actorId:string,input:z.infer<typeof profileStageInput>,requestKey:string){
 const key=`profile-stage:${actorId}:${requestKey}`,hash=digest(input);await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key},0))`);
 const [old]=await tx.select().from(operationKeys).where(eq(operationKeys.businessKey,key)).limit(1);if(old){if(old.requestHash!==hash)throw new Error('VERSION_CONFLICT');return old.result;}
 const manifest=await readManifest(tx);if(!manifest.feature_admin)throw new Error('FEATURE_DISABLED');const version=await rowsAndVersion(tx);
 if(manifest.profile_revision!==input.expected_revision||version.version!==input.manifest_version)throw new Error('VERSION_CONFLICT');
 await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`profile-stage-owner:${actorId}`},0))`);
 const now=await databaseNow(tx),pending=await tx.select({id:profilePreviews.id}).from(profilePreviews).where(and(eq(profilePreviews.actorUserId,actorId),isNull(profilePreviews.committedAt),sql`${profilePreviews.expiresAt}>clock_timestamp()`)).limit(5);
 if(pending.length>=5)throw new Error('RATE_LIMITED');
 const settings=proposedSettings(manifest,input),summary=await impact(tx),partitions=await partitionVersions(tx),statistics=await realStatisticsPreview(tx,parseManifest({...manifest,...settings,profile_revision:manifest.profile_revision+1}));
 const [stage]=await tx.insert(profilePreviews).values({actorUserId:actorId,expectedRevision:input.expected_revision,manifestVersion:version.version,proposal:{settings,reason:input.reason,statistics_preview:statistics},impact:summary,partitionVersions:partitions,createdAt:now,expiresAt:new Date(now.getTime()+manifest.transparency_snapshot_policy.preview_ttl_minutes*60000)}).returning({id:profilePreviews.id,expiresAt:profilePreviews.expiresAt});
 const result={stage_id:stage.id,expires_at:stage.expiresAt.toISOString(),expected_revision:input.expected_revision,proposed:presentationFromManifest(parseManifest({...manifest,...settings,profile_revision:manifest.profile_revision+1})),impact:summary,statistics_preview:statistics};
 await tx.insert(operationKeys).values({businessKey:key,requestHash:hash,result});return result;
}
export async function commitProfile(tx:DbExecutor,actorId:string,input:z.infer<typeof profileCommitInput>,requestKey:string){
 const [transition]=await tx.execute<{allowed:boolean}>(sql`select current_setting('gw.profile_transition',true)='true' as allowed`);if(!transition?.allowed)throw new Error('FORBIDDEN');
 const key=`profile-commit:${actorId}:${requestKey}`,stageKey=`profile-stage-commit:${input.stage_id}`,hash=digest(input);
 const [stage]=await tx.select().from(profilePreviews).where(and(eq(profilePreviews.id,input.stage_id),eq(profilePreviews.actorUserId,actorId))).for('update');if(!stage)throw new Error('NOT_FOUND');
 const [prior]=await tx.select().from(operationKeys).where(eq(operationKeys.businessKey,stageKey)).limit(1);if(prior){if(prior.requestHash!==hash)throw new Error('VERSION_CONFLICT');return prior.result;}
 const [request]=await tx.select().from(operationKeys).where(eq(operationKeys.businessKey,key)).limit(1);if(request){if(request.requestHash!==hash)throw new Error('VERSION_CONFLICT');return request.result;}
 await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('financial-policy',0))`);
 const version=await rowsAndVersion(tx,true),manifest=await readManifest(tx),now=await databaseNow(tx);
 if(!manifest.feature_admin)throw new Error('FEATURE_DISABLED');
 if(stage.committedAt||stage.expiresAt<=now||input.expected_revision!==stage.expectedRevision||manifest.profile_revision!==stage.expectedRevision||version.version!==stage.manifestVersion)throw new Error('VERSION_CONFLICT');
 const partitions=await partitionVersions(tx,true);if(digest(partitions)!==digest(stage.partitionVersions))throw new Error('VERSION_CONFLICT');
 const proposal=stage.proposal as {settings:Settings;reason:string;statistics_preview:Awaited<ReturnType<typeof realStatisticsPreview>>};const next=parseManifest({...manifest,...proposal.settings,profile_revision:manifest.profile_revision+1});validateSecurityCeilings(next);
 if(next.deployment_profile==='transparent'&&next.public_stats_policy.enabled&&(!manifest.public_stats_policy.enabled||manifest.deployment_profile!=='transparent')&&digest(await realStatisticsPreview(tx,next))!==digest(proposal.statistics_preview))throw new Error('VERSION_CONFLICT');
 await tx.execute(sql`select set_config('gw.profile_switch','true',true)`);
 // Notify existing members once without copying private staff reasons. These
 // outbox identities survive retries and profile rollback.
 const prefix=`profile-switch:${stage.id}:`,environment=process.env.APP_ENV??'simulation';
 await tx.insert(outbox).select(tx.select({retiredAt:sql<Date|null>`null::timestamptz`.as('retired_at'),retiredPayloadHash:sql<string|null>`null::text`.as('retired_payload_hash'),requestId:sql<string|null>`nullif(current_setting('gw.request_id',true),'')::uuid`.as('request_id'),redactedAt:sql<Date|null>`null::timestamptz`.as('redacted_at'),redactedPayloadHash:sql<string|null>`null::text`.as('redacted_payload_hash'),id:sql<string>`gen_random_uuid()`.as('id'),businessKey:sql<string>`${prefix}||${users.id}::text`.as('business_key'),environment:sql<string>`${environment}`.as('environment'),kind:sql<string>`'notification'`.as('kind'),payload:sql`jsonb_build_object('user_id',${users.id},'title_key','account_update','body',case when ${users.locale}='fr' then 'Les informations de la file ont changé. Consultez votre position réelle et les nouvelles conditions avant un autre don.' else 'Queue disclosures changed. Review your actual receiving position and updated terms before another gift.' end)`.as('payload'),dispatchedAt:sql<Date|null>`null::timestamptz`.as('dispatched_at'),createdAt:sql<Date>`clock_timestamp()`.as('created_at')}).from(users).where(exists(tx.select({id:queueEntries.id}).from(queueEntries).where(and(eq(queueEntries.beneficiaryUserId,users.id),eq(queueEntries.kind,'member'),eq(queueEntries.status,'waiting')))))).onConflictDoNothing({target:outbox.businessKey});
 if(next.deployment_profile==='transparent'&&(!next.feature_bootstrap||next.bootstrap_presentation==='disabled'))await tx.update(queueEntries).set({status:'removed',cancelledCount:sql`${queueEntries.requiredCount}-${queueEntries.creditedCount}`}).where(and(eq(queueEntries.kind,'bootstrap'),eq(queueEntries.status,'waiting')));
 if(next.deployment_profile==='transparent'&&(!next.feature_priority||next.priority_presentation==='disabled'))await tx.update(queueEntries).set({priorityTicket:null,priorityRevision:sql`${queueEntries.priorityRevision}+1`}).where(and(eq(queueEntries.status,'waiting'),sql`${queueEntries.priorityTicket} is not null`));
 await tx.update(giftInvoices).set({status:'expired'}).where(and(eq(giftInvoices.status,'quoted'),isNull(giftInvoices.submittedAt),lt(giftInvoices.profileRevision,next.profile_revision)));
 await tx.update(cryptoInvoices).set({status:'expired'}).where(and(eq(cryptoInvoices.status,'quoted'),lt(cryptoInvoices.profileRevision,next.profile_revision),sql`not exists(${tx.select({id:chainObservations.id}).from(chainObservations).where(eq(chainObservations.invoiceId,cryptoInvoices.id))})`,sql`not exists(${tx.select({id:cryptoEvents.id}).from(cryptoEvents).where(eq(cryptoEvents.invoiceId,cryptoInvoices.id))})`));
 for(const [name,value] of Object.entries({...proposal.settings,profile_revision:next.profile_revision})){
  const row=version.rows.find(row=>row.key===name);if(!row||!manifestDefinition(name))throw new Error('CONFIGURATION_INVALID');
  await tx.update(xManifest).set({value,version:row.version+1,updatedBy:actorId,updatedAt:now}).where(eq(xManifest.key,name));
 }
 const result={profile_revision:next.profile_revision,profile:next.deployment_profile,presentation:presentationFromManifest(next),financial_deletion:false,existing_obligations_retained:true};
 await tx.insert(auditEvents).values({actorUserId:actorId,action:'profile.commit',targetType:'release_profile',targetId:stage.id,reason:proposal.reason,beforeState:{profile:manifest.deployment_profile,revision:manifest.profile_revision,impact:stage.impact},afterState:{...result,settings:proposal.settings}});
 await tx.update(profilePreviews).set({committedAt:now}).where(eq(profilePreviews.id,stage.id));
 await tx.insert(operationKeys).values([{businessKey:key,requestHash:hash,result},{businessKey:stageKey,requestHash:hash,result}]);return result;
}
export async function assertProfileRevision(tx:DbExecutor,revision?:number){const manifest=await readManifest(tx);if(revision!==undefined&&revision!==manifest.profile_revision||manifest.deployment_profile==='transparent'&&revision===undefined)throw new Error('VERSION_CONFLICT');return manifest;}
export async function publicPresentation(tx:DbExecutor){const manifest=await readManifest(tx);if(!manifest.feature_transparency)throw new Error('FEATURE_DISABLED');return presentationFromManifest(manifest);}
export const publicationInput=z.object({enabled:z.boolean(),revision:z.number().int().positive()}).strict();
export async function publicationConsent(tx:DbExecutor,userId:string,input?:z.infer<typeof publicationInput>,requestKey?:string){
 const [user]=await tx.select().from(users).where(eq(users.id,userId)).for('no key update');if(!user)throw new Error('NOT_FOUND');
 if(!input)return {activity_opt_in:user.activityOptIn,revision:user.activityRevision};
 if(!requestKey)throw new Error('INVALID_INPUT');
 const key=`publication-consent:${userId}:${requestKey}`,hash=digest(input),[prior]=await tx.select().from(operationKeys).where(eq(operationKeys.businessKey,key)).limit(1);
 if(prior){if(prior.requestHash!==hash)throw new Error('VERSION_CONFLICT');return prior.result;}
 if(input.revision!==user.activityRevision)throw new Error('VERSION_CONFLICT');
 const manifest=await readManifest(tx);if(input.enabled&&(user.status!=='active'||user.role!=='member'||!user.consentedAt||!user.ageConfirmedAt||user.consentVersion!==manifest.terms_content.version))throw new Error('CONSENT_REQUIRED');
 const revision=user.activityRevision+(user.activityOptIn===input.enabled?0:1);
 if(user.activityOptIn!==input.enabled)await tx.update(users).set({activityOptIn:input.enabled,activityRevision:revision,updatedAt:await databaseNow(tx)}).where(eq(users.id,userId));
 const result={activity_opt_in:input.enabled,revision};await tx.insert(operationKeys).values({businessKey:key,requestHash:hash,result});
 await tx.insert(auditEvents).values({actorUserId:userId,action:'publication.consent',targetType:'user',targetId:userId,beforeState:{enabled:user.activityOptIn,revision:user.activityRevision},afterState:result});return result;
}

export const readinessInput=z.object({version:z.number().int().positive(),record:manifestSchema.shape.financial_readiness_record,reason:z.string().trim().min(10).max(500)}).strict();
export async function recordReadiness(tx:DbExecutor,actorId:string,input:z.infer<typeof readinessInput>,requestKey:string){
 const key=`profile-readiness:${actorId}:${requestKey}`,hash=digest(input),[prior]=await tx.select().from(operationKeys).where(eq(operationKeys.businessKey,key)).limit(1);if(prior){if(prior.requestHash!==hash)throw new Error('VERSION_CONFLICT');return prior.result;}
 const [row]=await tx.select().from(xManifest).where(eq(xManifest.key,'financial_readiness_record')).for('update');if(!row||row.version!==input.version)throw new Error('VERSION_CONFLICT');
 const [transition]=await tx.execute<{allowed:boolean}>(sql`select current_setting('gw.profile_transition',true)='true' as allowed`);if(!transition?.allowed)throw new Error('FORBIDDEN');
 await tx.execute(sql`select set_config('gw.profile_switch','true',true)`);await tx.update(xManifest).set({value:input.record,version:row.version+1,updatedBy:actorId,updatedAt:await databaseNow(tx)}).where(eq(xManifest.key,row.key));
 const result={record:input.record,version:row.version+1,mainnet_enabled:false};await tx.insert(operationKeys).values({businessKey:key,requestHash:hash,result});await tx.insert(auditEvents).values({actorUserId:actorId,action:'readiness.record',targetType:'release_profile',reason:input.reason,beforeState:row.value,afterState:result});return result;
}
