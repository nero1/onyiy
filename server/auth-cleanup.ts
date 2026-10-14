import {and,asc,eq,inArray,sql} from 'drizzle-orm';
import {authFlows,authSessions,authRefreshTokens,authTotpReplays,rateLimits,readManifest,type DbExecutor} from '@gifters/db';
import {operationalRetentionHeld} from './maintenance';

/** Bounded coordination cleanup. Active families and refresh replay windows
 * remain intact; future TOTP steps are never removed because of clock skew. */
export async function cleanupAuthentication(tx:DbExecutor){
 if(operationalRetentionHeld())return {deleted:0,held:true,more_possible:false};
 const policy=await readManifest(tx),limit=Math.min(policy.job_policy.chunk_size,100);let deleted=0;
 const flows=await tx.select({id:authFlows.stateHash}).from(authFlows).where(sql`${authFlows.expiresAt}<clock_timestamp()-interval '60 seconds'`).orderBy(asc(authFlows.expiresAt)).limit(limit).for('update',{skipLocked:true});
 if(flows.length)deleted+=(await tx.delete(authFlows).where(inArray(authFlows.stateHash,flows.map(row=>row.id))).returning({id:authFlows.stateHash})).length;
 const rates=await tx.select({id:rateLimits.keyHash}).from(rateLimits).where(sql`${rateLimits.expiresAt}<clock_timestamp()-${rateLimits.windowSeconds}*interval '1 second'`).orderBy(asc(rateLimits.expiresAt)).limit(limit).for('update',{skipLocked:true});
 if(rates.length)deleted+=(await tx.delete(rateLimits).where(inArray(rateLimits.keyHash,rates.map(row=>row.id))).returning({id:rateLimits.keyHash})).length;
 // Replay rows are immutable and the service deliberately has no UPDATE
 // privilege. Delete exact retired keys; concurrent cleanup is idempotent.
 const replay=await tx.select().from(authTotpReplays).where(and(sql`${authTotpReplays.acceptedAt}<clock_timestamp()-interval '10 minutes'`,sql`${authTotpReplays.timeStep}<floor(extract(epoch from clock_timestamp())/30)-20`)).orderBy(asc(authTotpReplays.acceptedAt)).limit(limit);
 for(const row of replay)deleted+=(await tx.delete(authTotpReplays).where(and(eq(authTotpReplays.factorId,row.factorId),eq(authTotpReplays.timeStep,row.timeStep))).returning({id:authTotpReplays.factorId})).length;
 const closed=sql`${authSessions.absoluteExpiresAt}<clock_timestamp()-${policy.retention_policy.http_replay_days}*interval '1 day'`;
 const families=tx.select({id:authSessions.id}).from(authSessions).where(closed);
 const tokens=await tx.select({id:authRefreshTokens.tokenHash}).from(authRefreshTokens).where(and(inArray(authRefreshTokens.sessionId,families),sql`${authRefreshTokens.expiresAt}<clock_timestamp()-${policy.retention_policy.http_replay_days}*interval '1 day'`)).orderBy(asc(authRefreshTokens.expiresAt)).limit(limit).for('update',{skipLocked:true});
 if(tokens.length)deleted+=(await tx.delete(authRefreshTokens).where(inArray(authRefreshTokens.tokenHash,tokens.map(row=>row.id))).returning({id:authRefreshTokens.tokenHash})).length;
 const sessions=await tx.select({id:authSessions.id}).from(authSessions).where(and(closed,sql`not exists(${tx.select({id:authRefreshTokens.tokenHash}).from(authRefreshTokens).where(eq(authRefreshTokens.sessionId,authSessions.id))})`)).orderBy(asc(authSessions.absoluteExpiresAt)).limit(limit).for('update',{skipLocked:true});
 if(sessions.length)deleted+=(await tx.delete(authSessions).where(inArray(authSessions.id,sessions.map(row=>row.id))).returning({id:authSessions.id})).length;
 const more=(await tx.select({id:authFlows.stateHash}).from(authFlows).where(sql`${authFlows.expiresAt}<clock_timestamp()-interval '60 seconds'`).limit(1)).length>0
 ||(await tx.select({id:rateLimits.keyHash}).from(rateLimits).where(sql`${rateLimits.expiresAt}<clock_timestamp()-${rateLimits.windowSeconds}*interval '1 second'`).limit(1)).length>0
 ||(await tx.select({id:authTotpReplays.factorId}).from(authTotpReplays).where(and(sql`${authTotpReplays.acceptedAt}<clock_timestamp()-interval '10 minutes'`,sql`${authTotpReplays.timeStep}<floor(extract(epoch from clock_timestamp())/30)-20`)).limit(1)).length>0
 ||(await tx.select({id:authRefreshTokens.tokenHash}).from(authRefreshTokens).where(and(inArray(authRefreshTokens.sessionId,families),sql`${authRefreshTokens.expiresAt}<clock_timestamp()-${policy.retention_policy.http_replay_days}*interval '1 day'`)).limit(1)).length>0
 ||(await tx.select({id:authSessions.id}).from(authSessions).where(and(closed,sql`not exists(${tx.select({id:authRefreshTokens.tokenHash}).from(authRefreshTokens).where(eq(authRefreshTokens.sessionId,authSessions.id))})`)).limit(1)).length>0;
 return {deleted,held:false,more_possible:more};
}
