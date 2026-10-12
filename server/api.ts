import { asc, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  assets,
  db,
  ledgerJournals,
  ledgerPostings,
  plans,
  planVersions,
  queueEntries,
  queuePartitions,
  users,
  withTx,
} from '@gifters/db';
import { loadManifest } from '@gifters/config';
import { formatBaseUnits } from '@gifters/domain';
import {
  activatePlan,
  confirmWithdrawal,
  consentUser,
  dashboard,
  getUser,
  linkSimulationWallet,
  quoteWithdrawal,
  sendGift,
} from './core';

const manifest = loadManifest();

function requestId() { return crypto.randomUUID(); }

function ok(data: unknown, status = 200) {
  return Response.json({ data, meta: { request_id: requestId() } }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

function fail(error: unknown) {
  const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
  const statusMap: Record<string, number> = {
    UNAUTHENTICATED: 401,
    FORBIDDEN: 403,
    ACCOUNT_RESTRICTED: 403,
    CONSENT_REQUIRED: 403,
    NOT_FOUND: 404,
    INVALID_INPUT: 400,
    INVALID_ADDRESS: 400,
    ACTIVE_CYCLE_EXISTS: 409,
    COOLDOWN_ACTIVE: 409,
    PLAN_UNAVAILABLE: 409,
    QUOTE_EXPIRED: 409,
    VERSION_CONFLICT: 409,
    INSUFFICIENT_BALANCE: 409,
  };
  return Response.json(
    { error: { code, message_key: `errors.${code.toLowerCase()}`, help_slug: 'simulation', retryable: false }, meta: { request_id: requestId() } },
    { status: statusMap[code] ?? 500, headers: { 'Cache-Control': 'private, no-store' } },
  );
}

async function current(request: Request) {
  const username = request.headers.get('x-sim-user');
  if (!username) throw new Error('UNAUTHENTICATED');
  const user = await getUser(db(), username);
  if (!user) throw new Error('UNAUTHENTICATED');
  return user;
}

async function admin(request: Request) {
  const user = await current(request);
  if (user.role !== 'admin') throw new Error('FORBIDDEN');
  return user;
}

async function json(request: Request) {
  try { return await request.json(); } catch { throw new Error('INVALID_INPUT'); }
}

function idempotencyKey(request: Request) {
  const key = request.headers.get('Idempotency-Key');
  if (!key) throw new Error('INVALID_INPUT');
  return key;
}

// Route Handlers can retain the public URL after a rewrite. Resolve the public
// path first so a caller's query cannot override the ID in that path.
function resourceId(request: Request, queryKey: string, publicPath: RegExp) {
  const url = new URL(request.url);
  const match = publicPath.exec(url.pathname);
  return z.string().uuid().parse(match?.[1] ?? url.searchParams.get(queryKey));
}

export async function handleApiRequest(method: string, path: string[], request: Request) {
  try {
    const route = `/${path.join('/')}`;

    if (method === 'GET' && route === '/manifest') return ok(manifest);

    if (method === 'GET' && route === '/sim/users') {
      const rows = await db().select({ id: users.id, username: users.username, role: users.role, status: users.status, locale: users.locale })
        .from(users).orderBy(desc(users.role), asc(users.username));
      return ok(rows);
    }

    if (method === 'POST' && route === '/me/consent') {
      const user = await current(request);
      const body = z.object({ accepted: z.literal(true), referral_code: z.string().uuid().optional() }).parse(await json(request));
      return ok(await withTx((tx) => consentUser(tx, user.username, body.referral_code)));
    }

    if (method === 'GET' && route === '/me/dashboard') {
      const user = await current(request);
      return ok(await dashboard(db(), user));
    }

    if (method === 'GET' && route === '/plans') {
      const rows = await db().select({
        id: plans.id,
        name: plans.name,
        slug: plans.slug,
        usd_reference: plans.usdReference,
        receipts_required: plans.receiptsRequired,
        status: plans.status,
        bootstrap_enabled: plans.bootstrapEnabled,
        bootstrap_count: plans.bootstrapCount,
        amount_base_units: planVersions.amountBaseUnits,
        plan_version_id: planVersions.id,
        symbol: assets.symbol,
      }).from(plans)
        .innerJoin(planVersions, eq(planVersions.planId, plans.id))
        .innerJoin(assets, eq(assets.id, planVersions.assetId))
        .where(eq(assets.environment, 'simulation'))
        .orderBy(asc(plans.usdReference));
      return ok(rows.map((row) => ({
        ...row,
        amount_giv: formatBaseUnits(BigInt(row.amount_base_units)),
        expected_giv: formatBaseUnits(BigInt(row.amount_base_units) * 170n / 100n),
      })));
    }

    if (method === 'POST' && route === '/gifts/simulate') {
      const user = await current(request);
      const body = z.object({ plan_id: z.string().uuid() }).parse(await json(request));
      return ok(await withTx((tx) => sendGift(tx, user, body.plan_id, idempotencyKey(request))));
    }

    if (method === 'POST' && route === '/me/wallets/simulate') {
      const user = await current(request);
      return ok(await withTx((tx) => linkSimulationWallet(tx, user)));
    }

    if (method === 'POST' && route === '/me/withdrawals/quotes') {
      const user = await current(request);
      const body = z.object({ gross_base_units: z.string().regex(/^\d+$/) }).parse(await json(request));
      return ok(await withTx((tx) => quoteWithdrawal(tx, user, BigInt(body.gross_base_units), idempotencyKey(request))));
    }

    if (method === 'POST' && route === '/me/withdrawals/confirm') {
      const user = await current(request);
      const withdrawalId = resourceId(request, 'withdrawal_id', /^\/api\/v1\/me\/withdrawals\/([^/]+)\/confirm\/?$/);
      return ok(await withTx((tx) => confirmWithdrawal(tx, user, withdrawalId)));
    }

    if (method === 'POST' && route === '/admin/plans/activate') {
      const user = await admin(request);
      const planId = resourceId(request, 'plan_id', /^\/api\/v1\/admin\/plans\/([^/]+)\/activate\/?$/);
      return ok(await withTx((tx) => activatePlan(tx, planId, user.id)));
    }

    if (method === 'GET' && route === '/admin/queue') {
      await admin(request);
      const planId = resourceId(request, 'plan_id', /^\/api\/v1\/admin\/queue\/([^/]+)\/?$/);
      const rows = await db().select({
        ticket: queueEntries.ticket,
        kind: queueEntries.kind,
        status: queueEntries.status,
        credited_count: queueEntries.creditedCount,
        required_count: queueEntries.requiredCount,
        beneficiary_user_id: queueEntries.beneficiaryUserId,
        username: users.username,
        platform_role: queueEntries.platformRole,
        priority_ticket: queueEntries.priorityTicket,
      }).from(queueEntries)
        .innerJoin(queuePartitions, eq(queuePartitions.id, queueEntries.partitionId))
        .innerJoin(planVersions, eq(planVersions.id, queuePartitions.planVersionId))
        .leftJoin(users, eq(users.id, queueEntries.beneficiaryUserId))
        .where(eq(planVersions.planId, planId))
        .orderBy(asc(queueEntries.ticket));
      return ok(rows);
    }

    if (method === 'GET' && route === '/admin/reconcile') {
      await admin(request);
      const imbalanceExpr = sql<string>`sum(case when ${ledgerPostings.direction}='debit' then ${ledgerPostings.amountBaseUnits} else -${ledgerPostings.amountBaseUnits} end)`;
      const bad = await db().select({ id: ledgerJournals.id, business_key: ledgerJournals.businessKey, imbalance: sql<string>`${imbalanceExpr}::text` })
        .from(ledgerJournals)
        .innerJoin(ledgerPostings, eq(ledgerPostings.journalId, ledgerJournals.id))
        .groupBy(ledgerJournals.id, ledgerJournals.businessKey)
        .having(sql`${imbalanceExpr} <> 0`);
      return ok({ balanced: bad.length === 0, imbalanced_journals: bad });
    }

    throw new Error('NOT_FOUND');
  } catch (error) {
    if (error instanceof z.ZodError) return fail(new Error('INVALID_INPUT'));
    return fail(error);
  }
}
