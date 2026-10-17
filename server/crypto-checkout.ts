import {presentationFromManifest,planFinancialPresentation,type PublicQueueDisclosure} from './presentation';
import { and, eq, sql } from "drizzle-orm";
import {
  cryptoInvoices,
  assets,
  walletLinks,
  plans,
  planVersions,
  readManifest,
  type DbExecutor,
} from "@gifters/db";
import {
  adapter,
  financialConfiguration,
  assertExternalActivation,
  assertFinancialEnvironment,
  assertRegistryBinding,
} from "./financial-config";
import { lockUser } from "./core";
import type { AssetRegistry } from "@gifters/chains";
async function validatedNativeInvoice(
  tx: DbExecutor,
  userId: string,
  generation: string,
  invoiceId: string,
) {
  assertFinancialEnvironment();
  const user = await lockUser(tx, userId),
    policy = await readManifest(tx);
  if (
    user.status !== "active" ||
    !user.consentedAt ||
    user.consentVersion !== policy.terms_content.version ||
    !user.ageConfirmedAt ||
    user.ageMinimumAccepted! < policy.eligibility_min_age
  )
    throw new Error("CONSENT_REQUIRED");
  if (!policy.feature_gifts || !policy.entitlements_member.send_enabled_gifts)
    throw new Error("FEATURE_DISABLED");
  const [invoice] = await tx
    .select()
    .from(cryptoInvoices)
    .where(
      and(eq(cryptoInvoices.id, invoiceId), eq(cryptoInvoices.userId, userId)),
    )
    .for("update");
  if (!invoice) throw new Error("NOT_FOUND");
  const [now] = await tx.execute<{ now: Date }>(
    sql`select clock_timestamp() as now`,
  );
  if (
    invoice.profileRevision!==policy.profile_revision ||
    invoice.status !== "quoted" ||
    invoice.sessionGeneration !== generation ||
    invoice.expiresAt <= new Date(now.now)
  )
    throw new Error("QUOTE_EXPIRED");
  const [asset] = await tx
      .select()
      .from(assets)
      .where(eq(assets.id, invoice.assetId))
      .limit(1),
    registry = invoice.registrySnapshot as AssetRegistry;
  assertRegistryBinding(asset, registry);
  if (!asset.enabled) throw new Error("FEATURE_DISABLED");
  const config = await financialConfiguration(tx, registry);
  await assertExternalActivation(tx, config.hash);
  if (config.registryHash !== invoice.registryHash)
    throw new Error("VERSION_CONFLICT");
  const [wallet] = await tx
    .select()
    .from(walletLinks)
    .where(eq(walletLinks.id, invoice.walletId))
    .limit(1);
  if (
    !wallet ||
    wallet.address !== invoice.sender ||
    wallet.revision !== invoice.walletRevision ||
    (wallet.coolingUntil && wallet.coolingUntil > new Date(now.now))
  )
    throw new Error("DESTINATION_CHANGED");
  const [plan] = await tx
    .select({ status: plans.status, active: planVersions.active,version:planVersions })
    .from(planVersions)
    .innerJoin(plans, eq(plans.id, planVersions.planId))
    .where(eq(planVersions.id, invoice.planVersionId))
    .limit(1);
  if (!plan || plan.status !== "active" || !plan.active)
    throw new Error("PLAN_UNAVAILABLE");
  return {policy,invoice,asset,registry,version:plan.version};
}
export async function validateNativeInvoiceReview(tx:DbExecutor,userId:string,generation:string,invoiceId:string){
 const {policy,invoice}=await validatedNativeInvoice(tx,userId,generation,invoiceId);
 return {invoice_id:invoice.id,profile_revision:policy.profile_revision,sender:invoice.sender,destination:invoice.treasury,amount_base_units:invoice.expectedBaseUnits,expires_at:invoice.expiresAt.toISOString()};
}
export async function prepareNativeInvoice(tx:DbExecutor,userId:string,generation:string,invoiceId:string){
 const {policy,invoice,asset,registry,version}=await validatedNativeInvoice(tx,userId,generation,invoiceId);
  const chain = await adapter(registry),
    amount = BigInt(invoice.expectedBaseUnits),
    fee = await chain.estimateFee({
      asset: registry,
      sender: invoice.sender,
      destination: invoice.treasury,
      amount,
    }),
    nonce =
      "pendingNonce" in chain
        ? await (
            chain as typeof chain & {
              pendingNonce(address: string): Promise<bigint>;
            }
          ).pendingNonce(invoice.sender)
        : undefined,
    prepared = await chain.buildTransfer({
      asset: registry,
      sender: invoice.sender,
      destination: invoice.treasury,
      amount,
      nonce,
      fee,
    });
  return {
    presentation:presentationFromManifest(policy),plan:planFinancialPresentation(version,asset),queue_disclosure:(await tx.execute<{value:PublicQueueDisclosure|null}>(sql`select public.gw_public_queue_disclosure(${version.id}::uuid) as value`))[0].value,
    profile_revision:policy.profile_revision,
    invoice_id: invoice.id,
    asset_key: registry.key,
    asset: asset.symbol,
    network: registry.network,
    kind: registry.kind,
    contract: registry.contract,
    mint: registry.mint,
    decimals: registry.decimals,
    sender: invoice.sender,
    destination: invoice.treasury,
    amount_base_units: invoice.expectedBaseUnits,
    family: prepared.family,
    payload: prepared.payload,
    network_fee_native: (fee.networkFee ?? fee.nativeFee).toString(),
    account_setup_native: (fee.accountSetupCost ?? 0n).toString(),
    total_fee_native: fee.nativeFee.toString(),
    native_decimals:
      registry.chain === "sol" ? 9 : registry.chain === "tron" ? 6 : 18,
    native_symbol: (
      { eth: "ETH", bnb: "BNB", sol: "SOL", tron: "TRX" } as const
    )[registry.chain],
    expires_at: invoice.expiresAt.toISOString(),
    valid_until_height: prepared.validUntilHeight?.toString(),
  };
}
