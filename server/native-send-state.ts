import {sql} from 'drizzle-orm';
import {cryptoObligations,signedAttemptStatus} from '@gifters/db';
/** Display progress from durable attempts without rewriting financial state.
 * An older broadcast remains submitted while its replacement is only signed. */
export function nativeSendDisplayStatus(){return sql<string>`case when ${cryptoObligations.status}='signing' then case
 when exists(select 1 from ${signedAttemptStatus} a where a.obligation_id=${cryptoObligations.id} and a.status='broadcast') then 'broadcast'
 when exists(select 1 from ${signedAttemptStatus} a where a.obligation_id=${cryptoObligations.id} and a.status='signed') then 'signed'
 else ${cryptoObligations.status} end else ${cryptoObligations.status} end`;}
/** Prefer the confirmed winner over any superseded replacement. */
export function nativeSendTransactionHash(){return sql<string|null>`(select a.tx_hash from ${signedAttemptStatus} a
 where a.obligation_id=${cryptoObligations.id}
 order by case a.status when 'confirmed' then 0 when 'failed' then 1 when 'broadcast' then 2 when 'signed' then 3 else 4 end,a.created_at desc,a.id desc limit 1)`;}
