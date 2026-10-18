import {queueAdjustmentCopy} from '../lib/notification-copy';
import crypto from 'node:crypto';
import {and,isNull,desc,eq,lt,or,sql} from 'drizzle-orm';
import {z} from 'zod';
import {outbox,users,queueEntries,notifications,notificationViews,readManifest,type DbExecutor} from '@gifters/db';
import {databaseNow} from './auth';
import {environmentKey,equalText} from './auth-crypto';
const cursorSchema=z.object({user:z.string().uuid(),at:z.string().datetime(),id:z.string().uuid(),limit:z.number().int().positive().max(100),exp:z.number().int()}).strict();
function sign(value:string){const key=environmentKey('AUTH_ACCESS_KEY');try{return crypto.createHmac('sha256',key).update('notifications-cursor-v1:'+value).digest('base64url')}finally{key.fill(0)}}
function encode(value:z.infer<typeof cursorSchema>){const data=Buffer.from(JSON.stringify(value)).toString('base64url');return data+'.'+sign(data)}
function decode(value:string,user:string,limit:number){try{if(value.length>1024)throw Error();const [body,signature,...rest]=value.split('.');if(rest.length||!equalText(signature??'',sign(body)))throw Error();const row=cursorSchema.parse(JSON.parse(Buffer.from(body,'base64url').toString()));if(row.user!==user||row.limit!==limit||row.exp<=Date.now()/1000)throw Error();return row}catch{throw new Error('INVALID_INPUT')}}
export async function notificationPage(tx:DbExecutor,user:string,requested?:number,cursor?:string){const manifest=await readManifest(tx);if(!manifest.feature_notifications)throw new Error('FEATURE_DISABLED');const limit=requested??manifest.notification_page_size;if(!Number.isSafeInteger(limit)||limit<1||limit>manifest.pagination_policy.max_size)throw new Error('INVALID_INPUT');const after=cursor?decode(cursor,user,limit):undefined;
 const rows=await tx.select({id:notifications.id,title_key:notifications.titleKey,body:notifications.body,created_at:notifications.createdAt,read_at:notifications.readAt,stamp:sql<string>`to_char(${notifications.createdAt} at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`}).from(notifications).where(and(eq(notifications.userId,user),isNull(notifications.retiredAt),after?or(lt(notifications.createdAt,sql`${after.at}::text::timestamptz`),and(eq(notifications.createdAt,sql`${after.at}::text::timestamptz`),lt(notifications.id,after.id))):undefined)).orderBy(desc(notifications.createdAt),desc(notifications.id)).limit(limit+1);const more=rows.length>limit;const page=rows.slice(0,limit),last=page.at(-1);return {items:page.map(({stamp,...item})=>item),has_more:more,next_cursor:more&&last?encode({user,at:last.stamp,id:last.id,limit,exp:Math.floor(Date.now()/1000)+3600}):null};}
export async function notificationBadge(tx:DbExecutor,user:string){const [row]=await tx.select({has_new:sql<boolean>`bool_or(${notificationViews.userId} is null or (${notifications.createdAt},${notifications.id})>(${notificationViews.seenAt},${notificationViews.seenId}))`,seen_at:sql<Date|null>`max(${notificationViews.seenAt})`}).from(notifications).leftJoin(notificationViews,eq(notificationViews.userId,notifications.userId)).where(and(eq(notifications.userId,user),isNull(notifications.retiredAt)));return {has_new:!!row?.has_new,seen_at:row?.seen_at??null};}
export async function seeNotifications(tx:DbExecutor,user:string,newestId:string){const manifest=await readManifest(tx);if(!manifest.feature_notifications)throw new Error('FEATURE_DISABLED');const [row]=await tx.select({at:notifications.createdAt}).from(notifications).where(and(eq(notifications.id,newestId),eq(notifications.userId,user),isNull(notifications.retiredAt))).limit(1);if(!row)throw new Error('NOT_FOUND');
 // The timestamp originates only from an owned loaded notice, never client time.
 await tx.insert(notificationViews).select(tx.select({userId:notifications.userId,seenAt:notifications.createdAt,seenId:notifications.id,updatedAt:sql<Date>`clock_timestamp()`.as('updated_at')}).from(notifications).where(and(eq(notifications.id,newestId),eq(notifications.userId,user),isNull(notifications.retiredAt))).limit(1)).onConflictDoUpdate({target:notificationViews.userId,set:{seenAt:sql`excluded.seen_at`,seenId:sql`excluded.seen_id`,updatedAt:sql`excluded.updated_at`},setWhere:sql`(${notificationViews.seenAt},${notificationViews.seenId})<(excluded.seen_at,excluded.seen_id)`});return notificationBadge(tx,user);}
export async function readNotification(tx:DbExecutor,user:string,id:string){if(!(await readManifest(tx)).feature_notifications)throw new Error('FEATURE_DISABLED');const [row]=await tx.update(notifications).set({readAt:sql`coalesce(${notifications.readAt},clock_timestamp())`}).where(and(eq(notifications.userId,user),eq(notifications.id,id),isNull(notifications.retiredAt))).returning({id:notifications.id,read_at:notifications.readAt,stamp:sql<string>`to_char(${notifications.createdAt} at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`});if(!row)throw new Error('NOT_FOUND');return row;}

/** Queue one safe notice per waiting member in the changed partition. The
 * caller holds its partition lock; durable identities make retries harmless. */
export async function queueAdjustmentNotices(tx:DbExecutor,partitionId:string,changeId:string){
 const policy=await readManifest(tx);if(policy.deployment_profile!=='transparent'||policy.priority_presentation!=='disclosed')return;
 const prefix=`queue-adjustment:${changeId}:`,environment=process.env.APP_ENV??'simulation';
 await tx.execute(sql`insert into ${outbox} (business_key,environment,kind,payload)
  select ${prefix}||${users.id}::text,${environment},'notification',jsonb_build_object(
   'user_id',${users.id},'title_key','account_update','body',case when ${users.locale}='fr'
    then ${queueAdjustmentCopy.fr}
    else ${queueAdjustmentCopy.en} end)
  from ${users} where ${users.status}<>'deleted' and exists(select 1 from ${queueEntries}
   where ${queueEntries.partitionId}=${partitionId}::uuid and ${queueEntries.beneficiaryUserId}=${users.id}
    and ${queueEntries.kind}='member' and ${queueEntries.status}='waiting')
  on conflict (business_key) do nothing`);
}
