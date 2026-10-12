import {installSimulationToolAuth} from './manual-auth.mjs';
installSimulationToolAuth();
const origin = process.env.APP_BASE_URL;
if (!origin) throw new Error('APP_BASE_URL is required, e.g. https://your-project.vercel.app');
const BASE = `${origin.replace(/\/$/, '')}/api/v1`;

async function req(path, user, body) {
  const response = await fetch(BASE + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'x-sim-user': user, 'Idempotency-Key': crypto.randomUUID() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${path}: ${payload.error?.code ?? response.status}`);
  return payload.data;
}

console.log(`Manual M1 scenario against ${BASE}. Use a reset/isolated Phase One simulation database.`);
const plans = await req('/plans', 'sim_admin');
const bronze = plans.find((plan) => plan.slug === 'bronze');
if (!bronze) throw new Error('Bronze plan not found');
await req(`/admin/plans/${bronze.id}/activate`, 'sim_admin', {});
for (let i = 1; i <= 21; i++) {
  const user = `member_${String(i).padStart(2, '0')}`;
  await req('/me/consent', user, { accepted: true });
  await req('/gifts/simulate', user, { plan_id: bronze.id });
  process.stdout.write(i % 5 === 0 ? `${i} gifts\n` : '.');
}
const queue = await req(`/admin/queue/${bronze.id}`, 'sim_admin');
const bootstrap = queue.filter((entry) => entry.kind === 'bootstrap');
const memberOne = queue.find((entry) => entry.username === 'member_01');
const reconciliation = await req('/admin/reconcile', 'sim_admin');
console.log('\nExpected observations:');
console.log(`- bootstrap rows: ${bootstrap.length} (expected 10)`);
console.log(`- fulfilled bootstrap rows: ${bootstrap.filter((entry) => entry.status === 'fulfilled').length} (expected 10 after gift 20)`);
console.log(`- member_01 credited_count: ${memberOne?.credited_count} (expected 1 after gift 21)`);
console.log(`- journals balanced: ${reconciliation.balanced}`);
console.log(`- allocations/clearing/balances consistent: ${reconciliation.consistent}; exact lineage: ${reconciliation.lineage_complete}`);
if (bootstrap.length !== 10 || bootstrap.filter((entry) => entry.status === 'fulfilled').length !== 10 || Number(memberOne?.credited_count) !== 1 || !reconciliation.balanced || !reconciliation.consistent || !reconciliation.lineage_complete) process.exitCode = 1;
