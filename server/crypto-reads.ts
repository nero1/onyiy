import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  assets,
  walletLinks,
  ledgerAccounts,
  ledgerPostings,
  cryptoInvoices,
  cryptoObligations,
  planVersions,
  plans,
  cycles,
  queueEntries,
  readManifest,
  type DbExecutor,
} from "@gifters/db";
import { readRegistry } from "@gifters/chains";
import {
  assertRegistryBinding,
  financialImplementationComplete,
} from "./financial-config";
export async function nativeCatalog(tx: DbExecutor) {
  const mode =
    process.env.APP_ENV === "testnet" ||
    process.env.CHAIN_FIXTURE_MODE === "isolated"
      ? "testnet"
      : "simulation";
  if (mode === "simulation")
    return { mode, execution_enabled: false, assets: [], plans: [] };
  const manifest = await readManifest(tx);
  if (!manifest.feature_wallets && !manifest.feature_gifts) throw new Error("FEATURE_DISABLED");
  const registry = readRegistry(),
    rows = await tx
      .select()
      .from(assets)
      .where(eq(assets.environment, "testnet"))
      .orderBy(asc(assets.symbol))
      .limit(20);
  if (rows.length > 10) throw new Error("CONFIGURATION_INVALID");
  const currencies = rows.map((row) => {
    const item = registry.find(
      (v) => v.key.toUpperCase() === row.symbol && v.network === row.chainId,
    );
    let identityValid = false;
    if (item) {
      try {
        assertRegistryBinding(row, item);
        identityValid = true;
      } catch {}
    }
    return {
      id: row.id,
      key: row.symbol.toLowerCase(),
      symbol: row.symbol,
      network: row.chainId,
      decimals: row.decimals,
      enabled:
        row.enabled && identityValid && !!item?.enabled && !!item.verified,
      contract: item?.contract,
      mint: item?.mint,
      kind: item?.kind ?? "native",
      explorer: item?.explorer,
      environment: "testnet",
    };
  });
  const versions = await tx
    .select({
      id: plans.id,
      name: plans.name,
      slug: plans.slug,
      asset_id: assets.id,
      asset: assets.symbol,
      network: assets.chainId,
      decimals: assets.decimals,
      version_id: planVersions.id,
      amount_base_units: planVersions.amountBaseUnits,
      usd_reference: planVersions.usdReference,
      receipts_required: planVersions.receiptsRequired,
      status: plans.status,
      receiver_bps: planVersions.receiverBps,
    })
    .from(planVersions)
    .innerJoin(plans, eq(plans.id, planVersions.planId))
    .innerJoin(assets, eq(assets.id, planVersions.assetId))
    .where(
      and(
        eq(assets.environment, "testnet"),
        eq(planVersions.active, true),
        eq(assets.enabled, true),
      ),
    )
    .orderBy(asc(plans.name), asc(assets.symbol))
    .limit(101);
  if (versions.length > 100) throw new Error("CONFIGURATION_INVALID");
  return {
    mode,
    execution_enabled: financialImplementationComplete,
    assets: currencies,
    plans: versions.filter((row) =>
      currencies.some(
        (currency) => currency.id === row.asset_id && currency.enabled,
      ),
    ),
  };
}
export async function ownNativePortfolio(tx: DbExecutor, userId: string) {
  const policy = await readManifest(tx);
  if (!policy.feature_wallets || !policy.entitlements_member.dashboard) throw new Error("FEATURE_DISABLED");
  const balances = await tx
    .select({
      asset_id: assets.id,
      asset: assets.symbol,
      network: assets.chainId,
      decimals: assets.decimals,
      purpose: ledgerAccounts.purpose,
      amount: sql<string>`coalesce(sum(case when ${ledgerPostings.direction}='credit' then ${ledgerPostings.amountBaseUnits} else -${ledgerPostings.amountBaseUnits} end),0)::text`,
    })
    .from(assets)
    .innerJoin(ledgerAccounts, eq(ledgerAccounts.assetId, assets.id))
    .leftJoin(ledgerPostings, eq(ledgerPostings.accountId, ledgerAccounts.id))
    .where(
      and(
        eq(assets.environment, "testnet"),
        eq(ledgerAccounts.ownerId, userId),
        inArray(ledgerAccounts.purpose, [
          "available_payable",
          "held_payable",
          "refund_payable",
        ]),
      ),
    )
    .groupBy(
      assets.id,
      assets.symbol,
      assets.chainId,
      assets.decimals,
      ledgerAccounts.purpose,
    )
    .orderBy(asc(assets.symbol), asc(ledgerAccounts.purpose))
    .limit(30);
  const wallets = await tx
    .select({
      id: walletLinks.id,
      network: walletLinks.chainId,
      address: walletLinks.address,
      revision: walletLinks.revision,
      cooling_until: walletLinks.coolingUntil,
    })
    .from(walletLinks)
    .where(
      and(
        eq(walletLinks.userId, userId),
        eq(walletLinks.environment, "testnet"),
      ),
    )
    .limit(8);
  const invoices = await tx
    .select({
      id: cryptoInvoices.id,
      plan_id: planVersions.planId,
      asset_id: cryptoInvoices.assetId,
      asset: assets.symbol,
      network: assets.chainId,
      decimals: assets.decimals,
      status: cryptoInvoices.status,
      amount_base_units: cryptoInvoices.expectedBaseUnits,
      treasury: cryptoInvoices.treasury,
      sender: cryptoInvoices.sender,
      expires_at: cryptoInvoices.expiresAt,
      created_at: cryptoInvoices.createdAt,
    })
    .from(cryptoInvoices)
    .innerJoin(planVersions, eq(planVersions.id, cryptoInvoices.planVersionId))
    .innerJoin(assets, eq(assets.id, cryptoInvoices.assetId))
    .where(eq(cryptoInvoices.userId, userId))
    .orderBy(desc(cryptoInvoices.createdAt), desc(cryptoInvoices.id))
    .limit(30);
  const withdrawals = await tx
    .select({
      id: cryptoObligations.id,
      previous_obligation_id: cryptoObligations.previousObligationId,
      asset: assets.symbol,
      network: assets.chainId,
      decimals: assets.decimals,
      status: cryptoObligations.status,
      gross_base_units: cryptoObligations.grossBaseUnits,
      charge_base_units: cryptoObligations.chargeBaseUnits,
      net_base_units: cryptoObligations.netBaseUnits,
      destination: cryptoObligations.destination,
      expires_at: cryptoObligations.quoteExpiresAt,
      completed_at: cryptoObligations.completedAt,
      created_at: cryptoObligations.createdAt,
    })
    .from(cryptoObligations)
    .innerJoin(assets, eq(assets.id, cryptoObligations.assetId))
    .where(
      and(
        eq(cryptoObligations.userId, userId),
        eq(cryptoObligations.kind, "withdrawal"),
      ),
    )
    .orderBy(desc(cryptoObligations.createdAt), desc(cryptoObligations.id))
    .limit(30);
  await tx.execute(sql`select set_config('gw.environment','testnet',true)`);
  const active = await tx
    .select({
      id: cycles.id,
      plan_id: plans.id,
      name: plans.name,
      asset: assets.symbol,
      network: assets.chainId,
      status: cycles.status,
      credited_count: cycles.creditedCount,
      receipts_required: cycles.receiptsRequired,
      ticket: queueEntries.ticket,
      display_position: sql<string>`public.gw_queue_rank(${queueEntries.id},'display')::text`,
    })
    .from(cycles)
    .innerJoin(planVersions, eq(planVersions.id, cycles.planVersionId))
    .innerJoin(plans, eq(plans.id, planVersions.planId))
    .innerJoin(assets, eq(assets.id, planVersions.assetId))
    .leftJoin(queueEntries, eq(queueEntries.cycleId, cycles.id))
    .where(and(eq(cycles.userId, userId), eq(assets.environment, "testnet")))
    .orderBy(desc(cycles.createdAt))
    .limit(30);
  await tx.execute(
    sql`select set_config('gw.environment',${process.env.APP_ENV ?? "simulation"},true)`,
  );
  return { balances, wallets:policy.entitlements_member.wallet_link?wallets:[], invoices:policy.entitlements_member.history?invoices:[], withdrawals:policy.entitlements_member.history?withdrawals:[], cycles: active };
}
