import { and, eq } from 'drizzle-orm';
import { assets, closeDb, db, planVersions, plans, seedManifest, seedManifestValue, readManifest, users } from './index';
import { usdToGivBaseUnits, formatBaseUnits } from '@gifters/domain';

try {
  await db().transaction(async (database) => {
    await seedManifest(database);
    const manifest = await readManifest(database);

    const insertedAssets = await database.insert(assets).values({
      symbol: 'GIV', environment: 'simulation', chainId: 'giv', decimals: 2, enabled: true,
    }).onConflictDoNothing().returning();
    const asset = insertedAssets[0] ?? (await database.select().from(assets)
      .where(and(eq(assets.symbol, 'GIV'), eq(assets.environment, 'simulation'), eq(assets.chainId, 'giv'))).limit(1))[0];
    if (!asset) throw new Error('Failed to seed GIV asset');
    await seedManifestValue(database,`asset_config_${asset.id}`,{enabled:asset.enabled,environment:'simulation',chain_id:'giv',kind:'internal',decimals:2,display_unit:'usd',confirmation_policy:{mode:'transactional'}});
    await seedManifestValue(database,`crypto_risk_${asset.id}`,{hot_wallet_cap_usd:1000,gas_low_usd:20,reorg_buffer_blocks:64,dust_base_units:'0'});

    for (const template of manifest.plan_templates) {
      const { name, price_usd:usd, receipts_required:target } = template;
      const slug = name.toLowerCase();
      const insertedPlans = await database.insert(plans).values({
        name, slug, usdReference: formatBaseUnits(usdToGivBaseUnits(usd)), receiptsRequired: target, status: 'disabled', bootstrapEnabled: true, bootstrapCount: 10,
      }).onConflictDoNothing().returning();
      const plan = insertedPlans[0] ?? (await database.select().from(plans).where(eq(plans.slug, slug)).limit(1))[0];
      if (!plan) throw new Error(`Failed to seed ${name}`);
      await database.insert(planVersions).values({
        planId: plan.id,
        assetId: asset.id,
        version: 1,
        amountBaseUnits: usdToGivBaseUnits(usd).toString(),
        usdReference: formatBaseUnits(usdToGivBaseUnits(usd)),
        receiverBps: manifest.payment_split_bps.receiver,
        marketingBps: manifest.payment_split_bps.marketing,
        referralBps: manifest.payment_split_bps.referral,
        developerBps: manifest.payment_split_bps.developer,
        reserveBps: manifest.payment_split_bps.reserve,
        receiptsRequired: target,
        active: false,
      }).onConflictDoNothing();
      await seedManifestValue(database,`plan_config_${plan.id}`,{status:plan.status,price_usd:plan.usdReference,pricing_mode:'usd_at_activation',receipts_required:plan.receiptsRequired,icon:'gift',countdown:true,countdown_lead_days:7,bootstrap_enabled:plan.bootstrapEnabled,bootstrap_count:plan.bootstrapCount});
    }

    await database.insert(users).values({ username: 'sim_admin', email: 'admin@example.invalid', role: 'admin', status: 'active', locale: 'en' }).onConflictDoNothing({ target: users.username });
    for (let i = 1; i <= 25; i++) {
      const username = `member_${String(i).padStart(2, '0')}`;
      await database.insert(users).values({ username, email: `${username}@example.invalid`, role: 'member', status: 'pending_consent', locale: 'en' }).onConflictDoNothing({ target: users.username });
    }
  });
console.log('Ensured manifest, GIV, 12 plans and simulation accounts; existing state preserved.');
} finally { await closeDb(); }
