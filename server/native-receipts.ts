import {financialEnvironmentIn} from './financial-config';
import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import {
  assets,
  cryptoObligations,
  ledgerJournals,
  ledgerPostings,
  ledgerAccounts,
  signedAttemptStatus,
  type DbExecutor,
} from "@gifters/db";
/** Closed own-account projection. Actual member cost subtracts the committed
 * fee refund; the canonical hash comes from the verified settlement journal. */
export async function ownNativeReceipts(
  tx: DbExecutor,
  userId: string,
  id?: string,
  after?: string,
) {
  const environment=await financialEnvironmentIn(tx);
  const refund = sql<string>`coalesce((select sum(p.amount_base_units) from ${ledgerJournals} j join ${ledgerPostings} p on p.journal_id=j.id join ${ledgerAccounts} a on a.id=p.account_id where j.business_key='crypto-fee-refund:'||${cryptoObligations.id}::text and p.direction='credit' and a.owner_id=${userId}::uuid and a.purpose='available_payable'),0)`;
  return tx
    .select({
      id: cryptoObligations.id,
      asset: assets.symbol,
      decimals: assets.decimals,
      environment: cryptoObligations.environment,
      chain_id: assets.chainId,
      gross_base_units: cryptoObligations.grossBaseUnits,
      net_base_units: cryptoObligations.netBaseUnits,
      approved_fee_base_units: cryptoObligations.chargeBaseUnits,
      refunded_fee_base_units: refund,
      fee_base_units: sql<string>`(${cryptoObligations.chargeBaseUnits}-${refund})::text`,
      settled_at: cryptoObligations.completedAt,
      tx_hash: sql<
        string | null
      >`(select s.tx_hash from ${ledgerJournals} j join ${signedAttemptStatus} s on s.id=(j.metadata->>'attempt_id')::uuid where j.business_key='crypto-settle:'||${cryptoObligations.id}::text limit 1)`,
    })
    .from(cryptoObligations)
    .innerJoin(assets, eq(assets.id, cryptoObligations.assetId))
    .where(
      and(
        eq(cryptoObligations.userId, userId),
        eq(cryptoObligations.environment, environment),
        inArray(cryptoObligations.kind, ["withdrawal", "recovery"]),
        eq(cryptoObligations.sourcePurpose, "available_payable"),
        eq(cryptoObligations.status, "settled"),
        id ? eq(cryptoObligations.id, id) : undefined,
        after ? gt(cryptoObligations.id, after) : undefined,
      ),
    )
    .orderBy(asc(cryptoObligations.id))
    .limit(100);
}
