import {nativeSendDisplayStatus,nativeSendTransactionHash} from './native-send-state';
import {presentationFromManifest,planFinancialPresentation,type QueueDisclosure,type PublicQueueDisclosure} from './presentation';
import {planConfigSchema} from '../packages/config/src/policies';
import {publicManifest} from '@gifters/config';
import {notificationPage,notificationBadge} from './notifications';
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import {
  cryptoReorgReviews,cryptoReorgResolutions,
  assets,
  users,
  walletLinks,
  ledgerAccounts,
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
  financialEnvironmentIn,
  financialConfiguration,assertExternalActivation,
} from "./financial-config";
export async function nativeCatalog(tx: DbExecutor) {
  if(process.env.APP_ENV!=='testnet'&&process.env.APP_ENV!=='mainnet'&&process.env.CHAIN_FIXTURE_MODE!=='isolated')return {mode:'simulation',execution_enabled:false,assets:[],plans:[]};
  const mode=await financialEnvironmentIn(tx);
  const manifest = await readManifest(tx);
  if (!manifest.feature_wallets && !manifest.feature_gifts) throw new Error("FEATURE_DISABLED");
  const registry = readRegistry(),
    rows = await tx
      .select()
      .from(assets)
      .where(eq(assets.environment, mode))
      .orderBy(asc(assets.symbol))
      .limit(20);
  if (rows.length > 10) throw new Error("CONFIGURATION_INVALID");
  const currencies = await Promise.all(rows.map(async (row) => {
    const item = registry.find(
      (v) => v.environment===mode && v.key.toUpperCase() === row.symbol && v.network === row.chainId,
    );
    let identityValid = false;
    if (item) {
      try {
        assertRegistryBinding(row, item);
        identityValid = true;
      } catch {}
    }
    const enabled=row.enabled && identityValid && !!item?.enabled && !!item.verified;
    let executionEnabled=false;
    if(financialImplementationComplete&&enabled&&item)try{await assertExternalActivation(tx,(await financialConfiguration(tx,item)).hash);executionEnabled=true}catch{/* An unavailable financial configuration never enables checkout. */}
    return {
      id: row.id,
      key: row.symbol.toLowerCase(),
      symbol: row.symbol,
      network: row.chainId,
      decimals: row.decimals,
      enabled,execution_enabled:executionEnabled,
      contract: item?.contract,
      mint: item?.mint,
      kind: item?.kind ?? "native",
      explorer: item?.explorer,
      environment: mode,
    };
  }));
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
      receiver_bps: planVersions.receiverBps,marketing_bps:planVersions.marketingBps,referral_bps:planVersions.referralBps,developer_bps:planVersions.developerBps,reserve_bps:planVersions.reserveBps,
      queue_disclosure:sql<PublicQueueDisclosure|null>`public.gw_public_queue_disclosure(${planVersions.id})`,
    })
    .from(planVersions)
    .innerJoin(plans, eq(plans.id, planVersions.planId))
    .innerJoin(assets, eq(assets.id, planVersions.assetId))
    .where(
      and(
        eq(assets.environment, mode),
        eq(planVersions.active, true),
        eq(assets.enabled, true),
      ),
    )
    .orderBy(asc(plans.name), asc(assets.symbol))
    .limit(801);
  if (versions.length > 800) throw new Error("CONFIGURATION_INVALID");
  const scheduledPlans=await tx.select().from(plans).where(inArray(plans.status,['scheduled','active'])).orderBy(asc(plans.name)).limit(101);
  if(scheduledPlans.length>100)throw new Error('CONFIGURATION_INVALID');
  const upcoming=scheduledPlans.flatMap(plan=>{
    const raw=manifest[`plan_config_${plan.id}`];if(!raw)return [];
    const config=planConfigSchema.parse(raw);if(!config.countdown||!config.launch_at)return [];
    return (config.native_launches??[]).filter(item=>!item.released).flatMap(item=>{
      const currency=currencies.find(currency=>currency.key===item.asset_key&&currency.enabled);if(!currency)return [];
      return [{id:plan.id,name:plan.name,slug:plan.slug,asset_id:currency.id,asset:currency.symbol,network:currency.network,decimals:currency.decimals,amount_base_units:item.amount_base_units??null,usd_reference:plan.usdReference,receipts_required:plan.receiptsRequired,status:'scheduled',launch_at:config.launch_at,profile_revision:manifest.profile_revision}];
    });
  });
  return {
    mode,presentation:presentationFromManifest(manifest),profile_revision:manifest.profile_revision,
    execution_enabled: currencies.some(currency=>currency.enabled&&currency.execution_enabled),
    assets: currencies,
    plans: [...upcoming,...versions.map(row=>({...row,profile_revision:manifest.profile_revision,plan:planFinancialPresentation({amountBaseUnits:row.amount_base_units,usdReference:row.usd_reference,receiverBps:row.receiver_bps,marketingBps:row.marketing_bps,referralBps:row.referral_bps,developerBps:row.developer_bps,reserveBps:row.reserve_bps,receiptsRequired:row.receipts_required},{symbol:row.asset,decimals:row.decimals,chainId:row.network,environment:mode})})).filter((row) =>
      currencies.some(
        (currency) => currency.id === row.asset_id && currency.enabled && !upcoming.some(item=>item.id===row.id&&item.asset_id===row.asset_id),
      ),
    )],
  };
}
export async function ownNativePortfolio(tx: DbExecutor, userId: string) {
  const environment=await financialEnvironmentIn(tx);
  const policy = await readManifest(tx);
  if (!policy.feature_wallets || !policy.entitlements_member.dashboard) throw new Error("FEATURE_DISABLED");
  const balances = await tx
    .select({
      asset_id: assets.id,
      asset: assets.symbol,
      network: assets.chainId,
      decimals: assets.decimals,
      under_review:sql<boolean>`exists(select 1 from ${cryptoReorgReviews} r left join ${cryptoReorgResolutions} s on s.review_id=r.id where r.asset_id=${assets.id} and s.review_id is null)`,
      purpose: ledgerAccounts.purpose,
      amount: sql<string>`coalesce(sum(public.gw_account_balance(${ledgerAccounts.id})),0)::text`,
    })
    .from(assets)
    .innerJoin(ledgerAccounts, eq(ledgerAccounts.assetId, assets.id))
    .where(
      and(
        eq(assets.environment, environment),
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
  // Payout and refund holds share an account, so classify the refund portion
  // through the immutable journal's obligation identity, never through display
  // history limits or mutable completion statuses.
  const settled = await tx.select({
    asset_id:ledgerAccounts.assetId,
    withdrawn_net:sql<string>`coalesce(sum(public.gw_account_bucket(${ledgerAccounts.id},'settled_payout_net')),0)::text`,
    refund_held:sql<string>`coalesce(sum(public.gw_account_bucket(${ledgerAccounts.id},'refund_held')),0)::text`,
  }).from(ledgerAccounts).innerJoin(assets,eq(assets.id,ledgerAccounts.assetId))
    .where(and(eq(ledgerAccounts.ownerId,userId),eq(ledgerAccounts.ownerType,'user'),eq(ledgerAccounts.purpose,'held_payable'),eq(assets.environment,environment)))
    .groupBy(ledgerAccounts.assetId).limit(10);
  const summary=[...new Set(balances.map(row=>row.asset_id))].map(id=>{
    const rows=balances.filter(row=>row.asset_id===id),asset=rows[0];
    const amount=(purpose:string)=>BigInt(rows.find(row=>row.purpose===purpose)?.amount??'0');
    const totals=settled.find(row=>row.asset_id===id),available=amount('available_payable'),held=amount('held_payable'),refundable=amount('refund_payable'),refundHeld=BigInt(totals?.refund_held??'0'),withdrawn=BigInt(totals?.withdrawn_net??'0');
    if(refundHeld<0n||refundHeld>held)throw new Error('FINANCIAL_SAFETY_PAUSE');
    return {asset_id:id,asset:asset.asset,network:asset.network,decimals:asset.decimals,under_review:rows.some(row=>row.under_review),available_base_units:available.toString(),held_base_units:held.toString(),income_held_base_units:(held-refundHeld).toString(),refundable_base_units:refundable.toString(),refund_held_base_units:refundHeld.toString(),withdrawn_net_base_units:withdrawn.toString(),net_income_base_units:(available+held-refundHeld+withdrawn).toString()};
  });
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
        eq(walletLinks.environment, environment),
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
      display_status:nativeSendDisplayStatus(),tx_hash:nativeSendTransactionHash(),
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

  const active = await tx
    .select({
      id: cycles.id,
      plan_id: plans.id,
      name: plans.name,
      asset: assets.symbol,
      network: assets.chainId,
      status: cycles.status,
      under_review:sql<boolean>`exists(select 1 from ${cryptoReorgReviews} r left join ${cryptoReorgResolutions} s on s.review_id=r.id where r.asset_id=${assets.id} and s.review_id is null)`,
      credited_count: cycles.creditedCount,
      receipts_required: cycles.receiptsRequired,
      ticket: queueEntries.ticket,
      queue_disclosure:sql<QueueDisclosure|null>`public.gw_queue_disclosure(${queueEntries.id})`,
      display_position: sql<string>`public.gw_queue_rank(${queueEntries.id},${policy.deployment_profile==='transparent'?'public_serving':'display'})::text`,
    })
    .from(cycles)
    .innerJoin(planVersions, eq(planVersions.id, cycles.planVersionId))
    .innerJoin(plans, eq(plans.id, planVersions.planId))
    .innerJoin(assets, eq(assets.id, planVersions.assetId))
    .leftJoin(queueEntries, eq(queueEntries.cycleId, cycles.id))
    .where(and(eq(cycles.userId, userId), eq(assets.environment, environment)))
    .orderBy(desc(cycles.createdAt))
    .limit(30);

  // A bounded existence query keeps idle-preview safety independent of the
  // recent-history window. A reviewed asset also blocks automatic rotation.
  const [openCycle]=await tx.select({id:cycles.id}).from(cycles)
    .innerJoin(planVersions,eq(planVersions.id,cycles.planVersionId))
    .innerJoin(assets,eq(assets.id,planVersions.assetId))
    .where(and(eq(cycles.userId,userId),eq(assets.environment,environment),or(
      inArray(cycles.status,['active','exception']),
      sql`exists(select 1 from ${cryptoReorgReviews} r left join ${cryptoReorgResolutions} s on s.review_id=r.id where r.asset_id=${assets.id} and s.review_id is null)`,
    ))).limit(1);
  const [user]=await tx.select({id:users.id,username:users.username,status:users.status,role:users.role,locale:users.locale,time_zone:users.timeZone}).from(users).where(eq(users.id,userId)).limit(1);
  const notices=policy.feature_notifications?await notificationPage(tx,userId):null;
  const badge=policy.feature_notifications?await notificationBadge(tx,userId):{has_new:false};
  return { user,manifest:{...publicManifest(policy),presentation:presentationFromManifest(policy),configuration_available:true},notifications:notices?.items??[],notification_badge:badge,balances, summary, wallets:policy.entitlements_member.wallet_link?wallets:[], invoices:policy.entitlements_member.history?invoices:[], withdrawals:policy.entitlements_member.history?withdrawals:[], cycles: active,has_active_cycles:!!openCycle };
}
