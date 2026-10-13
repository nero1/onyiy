import {beneficiaryLiabilityPurposes} from '@gifters/domain';
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  assets,cryptoObligations,signedAttemptStatus,
  ledgerAccounts,
  ledgerPostings,
  signerHealth,
  priceQuotes,
  readManifest,
  withContext,
} from "@gifters/db";
import { readRegistry } from "@gifters/chains";
import {
  registryAsset,
  adapter,
  financialConfiguration,
  platformAddress,
  assertFinancialEnvironment,
} from "./financial-config";
import { openFinancialAlert } from "./financial-alerts";
import { priceUnits } from "@gifters/domain";
export async function monitorFinancials(assetKey?:string) {
  assertFinancialEnvironment();
  const registry = readRegistry().filter((v) => v.enabled && v.verified && (!assetKey||v.key===assetKey)).slice(0,8),
    observations: unknown[] = [];
  for (const item of registry) {
    try {
      const chain = await adapter(item),
        sender = await platformAddress(item, "RECEIVING"),
        [physical, nativePhysical, height] = await Promise.all([
          chain.getBalance(item, sender, true),
          chain.getNativeBalance(sender, true),chain.currentBlockHeight(),
        ]);
      const result = await withContext({ access: "service" }, async (tx) => {
        const config = await financialConfiguration(tx, item),
          policy = await readManifest(tx);
        const [asset] = await tx
          .select()
          .from(assets)
          .where(
            and(
              eq(assets.environment, "testnet"),
              eq(assets.symbol, item.key.toUpperCase()),
              eq(assets.chainId, item.network),
            ),
          )
          .limit(1);
        if (!asset) return { asset_key: item.key, state: "not_provisioned" };
        const [liability] = await tx
          .select({
            amount: sql<string>`coalesce(sum(case when ${ledgerPostings.direction}='credit' then ${ledgerPostings.amountBaseUnits} else -${ledgerPostings.amountBaseUnits} end),0)::text`,
          })
          .from(ledgerAccounts)
          .leftJoin(
            ledgerPostings,
            eq(ledgerPostings.accountId, ledgerAccounts.id),
          )
          .where(
            and(
              eq(ledgerAccounts.assetId, asset.id),
              inArray(ledgerAccounts.purpose, beneficiaryLiabilityPurposes),
            ),
          );
        const [health] = await tx
            .select()
            .from(signerHealth)
            .where(
              eq(signerHealth.treasuryFingerprint, config.treasuryFingerprint),
            )
            .limit(1),
          reserved = BigInt(health?.nativeReserved ?? "0");
        const [rate] = await tx
          .select()
          .from(priceQuotes)
          .where(
            and(
              eq(priceQuotes.assetId, asset.id),
              sql`${priceQuotes.expiresAt}>clock_timestamp()`,
            ),
          )
          .orderBy(sql`${priceQuotes.observedAt} desc`)
          .limit(1);
        const label = `${item.chain}:${item.network}:${config.treasuryFingerprint}`;
        const priceStale=!rate||Date.now()-rate.observedAt.getTime()>policy.price_max_age_minutes*60000;if(priceStale)await openFinancialAlert(tx,`price:${item.key}:${label}`,"chain_exception","warning",{asset_key:item.key,reason:"PRICE_STALE"});
        const held=await tx.select({id:cryptoObligations.id,status:cryptoObligations.status,created:cryptoObligations.createdAt}).from(cryptoObligations).where(and(eq(cryptoObligations.assetId,asset.id),sql`${cryptoObligations.completedAt} is null`,inArray(cryptoObligations.status,['approved','signing','broadcast','exception','awaiting_requote']),sql`${cryptoObligations.createdAt}<clock_timestamp()-${policy.crypto_monitor_policy.exception_age_hours}*interval '1 hour'`)).orderBy(asc(cryptoObligations.createdAt),asc(cryptoObligations.id)).limit(100);
        for(const obligation of held)await openFinancialAlert(tx,`hold:${obligation.id}`,"chain_exception","warning",{asset_key:item.key,obligation_id:obligation.id,reason:"LONG_HELD_LIABILITY"});
        const stuck=await tx.select({id:signedAttemptStatus.id,obligation:signedAttemptStatus.obligationId}).from(signedAttemptStatus).innerJoin(cryptoObligations,eq(cryptoObligations.id,signedAttemptStatus.obligationId)).where(and(eq(cryptoObligations.assetId,asset.id),sql`${cryptoObligations.completedAt} is null`,inArray(signedAttemptStatus.status,['signed','broadcast']),sql`${signedAttemptStatus.signedAtHeight}<=${height.toString()}::numeric-${policy.crypto_monitor_policy.stuck_blocks}`)).orderBy(asc(signedAttemptStatus.signedAtHeight),asc(signedAttemptStatus.id)).limit(100);
        for(const attempt of stuck)await openFinancialAlert(tx,`stuck:${attempt.id}`,"chain_exception","critical",{asset_key:item.key,obligation_id:attempt.obligation,reason:"STUCK_SIGNED_ATTEMPT"});

        const shortages = physical < BigInt(liability.amount);
        if (shortages)
          await openFinancialAlert(
            tx,
            `liability:${label}`,
            "balance_shortfall",
            "critical",
            { asset_key: item.key, reason: "CUSTODY_BELOW_LIABILITIES" },
          );
        const nativeDecimals =
            item.chain === "sol" ? 9 : item.chain === "tron" ? 6 : 18,
          gasLow =
            nativePhysical < reserved ||
            (!!rate &&
              (nativePhysical - reserved) * priceUnits(rate.nativeUsd) <
                priceUnits(
                  String(
                    (
                      policy[`crypto_risk_${asset.id}`] as
                        | { gas_low_usd?: number }
                        | undefined
                    )?.gas_low_usd ?? 20,
                  ),
                ) *
                  10n ** BigInt(nativeDecimals));
        if (gasLow)
          await openFinancialAlert(tx, `gas:${label}`, "gas_low", "critical", {
            asset_key: item.key,
            reason: "NATIVE_GAS_LOW",
          });
        const hotCap=String((policy[`crypto_risk_${asset.id}`] as {hot_wallet_cap_usd?:number}|undefined)?.hot_wallet_cap_usd??1000),hot=!!rate&&physical*priceUnits(rate.assetUsd)>priceUnits(hotCap)*10n**BigInt(asset.decimals);
        if(hot)await openFinancialAlert(tx,`hot:${label}:${asset.id}`,"hot_wallet_cap","warning",{asset_key:item.key,reason:"HOT_WALLET_CAP_EXCEEDED"});
        const stale =
          !health?.heartbeatAt ||
          Date.now() - health.heartbeatAt.getTime() >
            policy.alert_policy.signer_stale_minutes * 60000;
        if (stale)
          await openFinancialAlert(
            tx,
            `signer:${label}`,
            "signer_unavailable",
            "critical",
            { asset_key: item.key, reason: "SIGNER_HEARTBEAT_STALE" },
          );
        return {
          asset_key: item.key,
          network: item.network,
          physical_base_units: physical.toString(),
          liability_base_units: liability.amount,
          native_physical: nativePhysical.toString(),
          native_reserved: reserved.toString(),
          shortage: shortages,
          hot_wallet_above_cap:hot,
          gas_low: gasLow,
          signer_stale: stale,long_held:held.length,stuck_attempts:stuck.length,price_stale:priceStale,
        };
      });
      observations.push(result);
    } catch {
      await withContext({ access: "service" }, (tx) =>
        openFinancialAlert(
          tx,
          `rpc:${item.chain}:${item.network}`,
          "rpc_unavailable",
          "warning",
          { asset_key: item.key, reason: "RPC_OBSERVATION_FAILED" },
        ),
      );
      observations.push({ asset_key: item.key, state: "unavailable" });
    }
  }
  return { observations };
}
