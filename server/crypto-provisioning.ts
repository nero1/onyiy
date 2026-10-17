import crypto from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  assets,operationalAlerts,
  plans,
  planVersions,
  priceQuotes,
  queuePartitions,
  queueEntries,
  cycles,
  cryptoInvoices,
  auditEvents,
  operationKeys,
  readManifest,
  seedManifestValue,
  xManifest,
  type DbExecutor,
} from "@gifters/db";
import {
  priceUnits,
  ceilDivide,
  formatBaseUnits,
  splitAmount,
  assertFreshRates,
  type RateSnapshot,
} from "@gifters/domain";
import {
  registryAsset,
  adapter,
  platformAddress,
  assertRegistryBinding,
  financialConfiguration,
  assertExternalActivation,
  financialEnvironmentIn,
} from "./financial-config";
import { lockUser } from "./core";
export const nativeProvision = z
  .object({
    asset_key: z.string().max(30),
    enabled: z.boolean(),
    reason: z.string().min(5).max(500),
  })
  .strict();
export const nativePlanActivation = z
  .object({
    asset_key: z.string().max(30),
    plan_id: z.string().uuid(),
    resume_only: z.boolean().optional(),
    pricing_mode: z.enum(['usd_at_activation','fixed_token']).optional(),
    amount_base_units: z.string().regex(/^[1-9][0-9]{0,77}$/).optional(),
    reason: z.string().min(5).max(500),
  })
  .strict().superRefine((value,ctx)=>{if((value.pricing_mode==='fixed_token')!==(value.amount_base_units!==undefined)||value.resume_only&&(value.pricing_mode!==undefined||value.amount_base_units!==undefined))ctx.addIssue({code:'custom',message:'Choose an unchanged resume or an asset-bound activation price.'});});
async function staff(tx: DbExecutor, id: string) {
  const actor = await lockUser(tx, id);
  if (actor.role !== "admin" || actor.status !== "active")
    throw new Error("FORBIDDEN");
  await tx.execute(sql`select pg_advisory_xact_lock_shared(hashtextextended('financial-policy',0))`);
  const policy = await readManifest(tx);
  if (!policy.feature_admin) throw new Error("FEATURE_DISABLED");
  return policy;
}
function binding(registry: ReturnType<typeof registryAsset>) {
  return {
    key: registry.key,
    chain: registry.chain,
    network: registry.network,
    kind: registry.kind,
    decimals: registry.decimals,
    contract: registry.contract
      ? ["eth", "bnb"].includes(registry.chain)
        ? registry.contract.toLowerCase()
        : registry.contract
      : null,
    mint: registry.mint ?? null,
  };
}
export async function provisionNativeAsset(
  tx: DbExecutor,
  actorId: string,
  input: z.infer<typeof nativeProvision>,
  requestKey: string,
) {
  const environment=await financialEnvironmentIn(tx);
  await staff(tx, actorId);
  const registry = registryAsset(input.asset_key);
  if (registry.key === "trx" && input.enabled)
    throw new Error("OPERATIONAL_ASSET_ONLY");
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${"asset-provision:" + registry.key + ":" + registry.network},0))`,
  );
  const key = `native-provision:${actorId}:${requestKey}`,
    digest = crypto
      .createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex"),
    [previous] = await tx
      .select()
      .from(operationKeys)
      .where(eq(operationKeys.businessKey, key))
      .limit(1);
  if (previous) {
    if (previous.requestHash !== digest) throw new Error("VERSION_CONFLICT");
    return previous.result;
  }
  const chain = await adapter(registry),
    receiving = await platformAddress(registry, "RECEIVING");
  await chain.getBalance(registry, receiving, true);
  const [old] = await tx
    .select()
    .from(assets)
    .where(
      and(
        eq(assets.environment, environment),
        eq(assets.symbol, registry.key.toUpperCase()),
        eq(assets.chainId, registry.network),
      ),
    )
    .for("update");
  if (old?.registryBinding) assertRegistryBinding(old, registry);
  const row = old
    ? (
        await tx
          .update(assets)
          .set({
            enabled: input.enabled,
            registryBinding: old.registryBinding ?? binding(registry),
          })
          .where(eq(assets.id, old.id))
          .returning()
      )[0]
    : (
        await tx
          .insert(assets)
          .values({
            symbol: registry.key.toUpperCase(),
            environment,
            chainId: registry.network,
            decimals: registry.decimals,
            enabled: input.enabled,
            registryBinding: binding(registry),
          })
          .returning()
      )[0];
  await seedManifestValue(tx, `asset_config_${row.id}`, {
    enabled: input.enabled,
    environment,
    chain_id: registry.network,
    kind: registry.kind,
    decimals: registry.decimals,
    display_unit: "asset",
    confirmation_policy: {
      mode: registry.finality.mode,
      ...(registry.finality.depth ? { depth: registry.finality.depth } : {}),
    },
  });
  const [assetConfig] = await tx
    .select()
    .from(xManifest)
    .where(eq(xManifest.key, `asset_config_${row.id}`))
    .for("update");
  if (assetConfig) {
    const value = assetConfig.value as Record<string, unknown>;
    await tx
      .update(xManifest)
      .set({
        value: { ...value, enabled: input.enabled },
        version: sql`${xManifest.version}+1`,
        updatedBy: actorId,
        updatedAt: sql`clock_timestamp()`,
      })
      .where(eq(xManifest.key, assetConfig.key));
  }
  await seedManifestValue(tx, `crypto_risk_${row.id}`, {
    hot_wallet_cap_usd: 1000,
    gas_low_usd: 20,
    reorg_buffer_blocks: 64,
    dust_base_units: registry.dust,
  });
  const result = {
    asset_id: row.id,
    asset_key: registry.key,
    network: registry.network,
    enabled: row.enabled,
  };
  await tx
    .insert(operationKeys)
    .values({ businessKey: key, requestHash: digest, result });
  await tx.insert(auditEvents).values({
    actorUserId: actorId,
    action: "crypto.asset_provision",
    targetType: "asset",
    targetId: row.id,
    reason: input.reason,
    afterState: result,
  });
  return result;
}
export async function activateNativePlan(
  tx: DbExecutor,
  actorId: string,
  input: z.infer<typeof nativePlanActivation>,
  requestKey: string,
  expectedScheduleVersion?: number,
) {
  const environment=await financialEnvironmentIn(tx);
  const policy = await staff(tx, actorId),
    registry = registryAsset(input.asset_key),
    config = await financialConfiguration(tx, registry);
  if (registry.key === "trx") throw new Error("OPERATIONAL_ASSET_ONLY");
  await assertExternalActivation(tx, config.hash);
  if (!policy.feature_gifts) throw new Error("FEATURE_DISABLED");
  const key = `native-activate:${actorId}:${requestKey}`,
    digest = crypto
      .createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
  await tx
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.id, input.plan_id))
    .for("update");
  const [old] = await tx
    .select()
    .from(operationKeys)
    .where(eq(operationKeys.businessKey, key))
    .limit(1);
  if (old) {
    if (old.requestHash !== digest) throw new Error("VERSION_CONFLICT");
    if(expectedScheduleVersion!==undefined)throw new Error('VERSION_CONFLICT');
    return old.result;
  }
  const [plan] = await tx
      .select()
      .from(plans)
      .where(eq(plans.id, input.plan_id))
      .limit(1),
    [asset] = await tx
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.environment, environment),
          eq(assets.symbol, registry.key.toUpperCase()),
          eq(assets.chainId, registry.network),
          eq(assets.enabled, true),
        ),
      )
      .limit(1);
  if (!plan || !asset || plan.status === "retired")
    throw new Error("PLAN_UNAVAILABLE");
  assertRegistryBinding(asset, registry);
  const configKey=`plan_config_${plan.id}`;
  const [scheduled]=await tx.select().from(xManifest).where(eq(xManifest.key,configKey)).for('update');
  const schedule=scheduled?.value as {status:string;launch_at?:string;native_launches?:{asset_key:string;pricing_mode:string;amount_base_units?:string;registry_hash:string;released:boolean}[]}|undefined;
  const pending=schedule?.native_launches?.find(item=>item.asset_key===registry.key&&!item.released);
  if(expectedScheduleVersion===undefined&&schedule?.native_launches?.some(item=>!item.released)&&['scheduled','active'].includes(plan.status))throw new Error('VERSION_CONFLICT');
  if(expectedScheduleVersion!==undefined||pending){
    const [clock]=await tx.execute<{due:boolean}>(sql`select ${schedule?.launch_at??null}::timestamptz<=clock_timestamp() as due`);
    if(expectedScheduleVersion===undefined||!scheduled||scheduled.version!==expectedScheduleVersion||!pending||!['scheduled','active'].includes(plan.status)||!clock?.due||pending.registry_hash!=='sha256_'+Buffer.from(config.hash,'hex').toString('base64url')||pending.pricing_mode!==input.pricing_mode||pending.amount_base_units!==input.amount_base_units)throw new Error('VERSION_CONFLICT');
  }
  const [previous] = await tx
    .select()
    .from(planVersions)
    .where(
      and(eq(planVersions.planId, plan.id), eq(planVersions.assetId, asset.id)),
    )
    .orderBy(desc(planVersions.version))
    .limit(1);
  if(input.resume_only&&!previous?.active)throw new Error('PLAN_UNAVAILABLE');
  if (previous?.active) {
    if(input.pricing_mode&&input.pricing_mode!==previous.pricingMode||input.amount_base_units&&input.amount_base_units!==previous.amountBaseUnits)throw new Error('VERSION_CONFLICT');
    if (plan.status !== "active") {
      await tx
        .update(plans)
        .set({
          status: "active",
          revision: sql`${plans.revision}+1`,
          updatedAt: sql`clock_timestamp()`,
        })
        .where(eq(plans.id, plan.id));
      await tx.insert(auditEvents).values({
        actorUserId: actorId,
        action: "crypto.plan_resume",
        targetType: "plan",
        targetId: plan.id,
        reason: input.reason,
      });
    }
    const result = {
      plan_id: plan.id,
      version_id: previous.id,
      asset_id: asset.id,
      amount_base_units: previous.amountBaseUnits,
      pricing_mode: previous.pricingMode,
      network: registry.network,
      status: "active",
    };
    await tx
      .insert(operationKeys)
      .values({ businessKey: key, requestHash: digest, result });
    return result;
  }
  const planPolicy=policy[`plan_config_${plan.id}`] as {pricing_mode?:string}|undefined;
  const pricingMode=input.pricing_mode??planPolicy?.pricing_mode??'usd_at_activation';
  if(pricingMode==='fixed_token'&&!input.amount_base_units)throw new Error('INVALID_INPUT');
  const [price] = await tx
    .select()
    .from(priceQuotes)
    .where(
      and(
        eq(priceQuotes.assetId, asset.id),
        sql`${priceQuotes.expiresAt}>clock_timestamp()`,
      ),
    )
    .orderBy(desc(priceQuotes.observedAt))
    .limit(1);
  if (!price) throw new Error("PRICE_STALE");
  assertFreshRates(
    {
      assetUsd: price.assetUsd,
      nativeUsd: price.nativeUsd,
      assetDecimals: asset.decimals,
      nativeDecimals:
        registry.chain === "sol" ? 9 : registry.chain === "tron" ? 6 : 18,
      source: price.source,
      observedAt: price.observedAt.toISOString(),
    },
    policy.price_max_age_minutes,
  );
  const amount = pricingMode==='fixed_token'?BigInt(input.amount_base_units!):ceilDivide(
    priceUnits(plan.usdReference) * 10n ** BigInt(asset.decimals),
    priceUnits(price.assetUsd),
  );
  const usdReference=pricingMode==='fixed_token'?formatBaseUnits(amount*priceUnits(price.assetUsd)*100n/(10n**BigInt(asset.decimals)*10n**18n),2):plan.usdReference;
  if (
    amount <= 0n ||amount.toString().length>78||priceUnits(usdReference)<=0n||
    splitAmount(amount, policy.payment_split_bps).receiver <= 0n
  )
    throw new Error("PLAN_UNAVAILABLE");
  const [version] = await tx
    .insert(planVersions)
    .values({
      planId: plan.id,
      assetId: asset.id,
      version: (previous?.version ?? 0) + 1,
      amountBaseUnits: amount.toString(),
      usdReference,
      pricingMode,
      activationPriceId: price.id,
      receiverBps: policy.payment_split_bps.receiver,
      marketingBps: policy.payment_split_bps.marketing,
      referralBps: policy.payment_split_bps.referral,
      developerBps: policy.payment_split_bps.developer,
      reserveBps: policy.payment_split_bps.reserve,
      receiptsRequired: plan.receiptsRequired,
      active: true,
    })
    .returning();
  const [partition] = await tx
    .insert(queuePartitions)
    .values({ planVersionId: version.id, nextTicket: 1 })
    .returning();
  const bootstrap =
    policy.feature_bootstrap && plan.bootstrapEnabled ? plan.bootstrapCount : 0;
  if (bootstrap > 0) {
    await tx.insert(queueEntries).values(
      Array.from({ length: bootstrap }, (_, i) => ({
        partitionId: partition.id,
        ticket: i + 1,
        kind: "bootstrap",
        platformRole: policy.bootstrap_destination_role,
        requiredCount: version.receiptsRequired,
        status: "waiting",
      })),
    );
    await tx
      .update(queuePartitions)
      .set({ nextTicket: bootstrap + 1 })
      .where(eq(queuePartitions.id, partition.id));
  }
  await tx
    .update(plans)
    .set({
      status: "active",
      revision: sql`${plans.revision}+1`,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(eq(plans.id, plan.id));
  if(pending&&scheduled&&schedule){
    const value={...schedule,status:'active',countdown:schedule.native_launches!.some(item=>!item.released&&item.asset_key!==registry.key),native_launches:schedule.native_launches!.map(item=>item.asset_key===registry.key?{...item,released:true}:item)};
    await tx.update(xManifest).set({value,version:scheduled.version+1,updatedAt:sql`clock_timestamp()`}).where(eq(xManifest.key,configKey));
    await tx.update(operationalAlerts).set({status:'resolved',resolvedAt:sql`clock_timestamp()`}).where(eq(operationalAlerts.conditionKey,`native-launch:${environment}:${plan.id}:${registry.key}`));
  }
  const result = {
    plan_id: plan.id,
    version_id: version.id,
    asset_id: asset.id,
    network: registry.network,
    amount_base_units: version.amountBaseUnits,
    pricing_mode: version.pricingMode,
    activation_price_id: price.id,
    usd_reference: version.usdReference,
    status: "active",
  };
  await tx
    .insert(operationKeys)
    .values({ businessKey: key, requestHash: digest, result });
  await tx.insert(auditEvents).values({
    actorUserId: actorId,
    action: "crypto.plan_activate",
    targetType: "plan",
    targetId: plan.id,
    reason: input.reason,
    afterState: result,
  });
  return result;
}
