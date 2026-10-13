import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  assets,
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
export async function monitorFinancials() {
  assertFinancialEnvironment();
  const registry = readRegistry().filter((v) => v.enabled && v.verified),
    observations: unknown[] = [];
  for (const item of registry) {
    try {
      const chain = await adapter(item),
        sender = await platformAddress(item, "RECEIVING"),
        [physical, nativePhysical] = await Promise.all([
          chain.getBalance(item, sender, true),
          chain.getNativeBalance(sender, true),
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
              inArray(ledgerAccounts.purpose, [
                "available_payable",
                "held_payable",
                "refund_payable",
                "marketing_payable",
                "developer_payable",
                "bootstrap_developer_payable",
                "bootstrap_marketing_payable",
              ]),
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
          gas_low: gasLow,
          signer_stale: stale,
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
