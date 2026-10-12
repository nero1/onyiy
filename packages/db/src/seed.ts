import { and, eq } from 'drizzle-orm';
import { assets, closeDb, db, planVersions, plans, seedManifest, users } from './index';
import { planTemplates, usdToGivBaseUnits } from '@gifters/domain';

const database = db();
await seedManifest();

const insertedAssets = await database.insert(assets).values({
  symbol: 'GIV', environment: 'simulation', chainId: 'giv', decimals: 2, enabled: true,
}).onConflictDoUpdate({
  target: [assets.symbol, assets.environment, assets.chainId],
  set: { enabled: true },
}).returning({ id: assets.id });
const asset = insertedAssets[0] ?? (await database.select({ id: assets.id }).from(assets)
  .where(and(eq(assets.symbol, 'GIV'), eq(assets.environment, 'simulation'), eq(assets.chainId, 'giv'))).limit(1))[0];
if (!asset) throw new Error('Failed to seed GIV asset');

for (const [name, usd] of planTemplates) {
  const slug = name.toLowerCase();
  const insertedPlans = await database.insert(plans).values({
    name, slug, usdReference: usd.toFixed(2), receiptsRequired: 2, status: 'disabled', bootstrapEnabled: true, bootstrapCount: 10,
  }).onConflictDoUpdate({ target: plans.slug, set: { name } }).returning({ id: plans.id });
  const plan = insertedPlans[0] ?? (await database.select({ id: plans.id }).from(plans).where(eq(plans.slug, slug)).limit(1))[0];
  if (!plan) throw new Error(`Failed to seed ${name}`);
  await database.insert(planVersions).values({
    planId: plan.id,
    assetId: asset.id,
    version: 1,
    amountBaseUnits: usdToGivBaseUnits(usd).toString(),
    receiverBps: 8500,
    marketingBps: 400,
    referralBps: 400,
    developerBps: 600,
    reserveBps: 100,
    receiptsRequired: 2,
    active: false,
  }).onConflictDoNothing();
}

await database.insert(users).values({ username: 'sim_admin', email: 'admin@example.invalid', role: 'admin', status: 'active', locale: 'en' }).onConflictDoNothing({ target: users.username });
for (let i = 1; i <= 25; i++) {
  const username = `member_${String(i).padStart(2, '0')}`;
  await database.insert(users).values({ username, email: `${username}@example.invalid`, role: 'member', status: 'pending_consent', locale: 'en' }).onConflictDoNothing({ target: users.username });
}
console.log('Seeded manifest, GIV, 12 plans, sim_admin and 25 pending test members.');
await closeDb();
