import {boundedText} from './request-body';
import {runtimeProviders} from '@gifters/config';
import crypto from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  botChallenges,
  botTokenUses,
  abuseSignals,
  cryptoInvoices,
  giftInvoices,
  walletLinks,
  readManifest,
  type DbExecutor,
} from "@gifters/db";
const digest = (s: string) =>
  crypto.createHash("sha256").update(s).digest("hex");
export const botProof = z
  .object({
    challenge_id: z.string().uuid(),
    token: z.string().min(1).max(2048),
  })
  .strict();
export type BotSurface = "consent" | "suspicious_checkout";
function provider() {
  const selected = runtimeProviders().CAPTCHA_PROVIDER;
  if (
    !["dummy", "turnstile", "none"].includes(selected) ||
    (selected === "dummy" && process.env.APP_ENV !== "simulation")
  )
    throw new Error("CAPTCHA_UNAVAILABLE");
  return selected as "dummy" | "turnstile" | "none";
}
export async function suspiciousCheckout(tx: DbExecutor, userId: string) {
  const invoices = await tx
    .select({ id: cryptoInvoices.id })
    .from(cryptoInvoices)
    .where(
      and(
        eq(cryptoInvoices.userId, userId),
        sql`${cryptoInvoices.createdAt}>clock_timestamp()-interval '10 minutes'`,
      ),
    )
    .limit(5);
  const givInvoices = await tx
    .select({ id: giftInvoices.id })
    .from(giftInvoices)
    .where(
      and(
        eq(giftInvoices.userId, userId),
        sql`${giftInvoices.createdAt}>clock_timestamp()-interval '10 minutes'`,
      ),
    )
    .limit(5);
  if (invoices.length + givInvoices.length >= 5) return true;
  const flags = await tx
    .select({ id: abuseSignals.id })
    .from(abuseSignals)
    .where(
      and(
        eq(abuseSignals.userId, userId),
        sql`${abuseSignals.createdAt}>clock_timestamp()-interval '24 hours'`,
      ),
    )
    .limit(3);
  if (flags.length >= 3) return true;
  const reuse = await tx.execute<{ n: number }>(
    sql`select count(*)::int as n from (select 1 from public.wallet_links own join public.wallet_links other on other.environment=own.environment and other.chain_id=own.chain_id and other.address=own.address and other.user_id<>own.user_id where own.user_id=${userId} limit 2) matches`,
  );
  return reuse[0].n >= 2;
}
async function required(tx: DbExecutor, userId: string, surface: BotSurface) {
  const flags = (await readManifest(tx)).captcha_surfaces;
  return (
    provider() !== "none" &&
    flags[surface] &&
    (surface === "consent" || (await suspiciousCheckout(tx, userId)))
  );
}
export async function beginBotCheck(
  tx: DbExecutor,
  userId: string,
  generation: string,
  surface: BotSurface,
) {
  if (!(await required(tx, userId, surface))) return { required: false };
  const kind = provider();
  if (kind === "none") return { required: false };
  const sitekey = process.env.CAPTCHA_SITE_KEY ?? "";
  if (
    kind === "turnstile" &&
    (!/^[A-Za-z0-9_-]{10,100}$/.test(sitekey) ||
      !process.env.CAPTCHA_SECRET_KEY ||
      !process.env.WEB_ORIGIN)
  )
    throw new Error("CAPTCHA_UNAVAILABLE");
  const token =
    kind === "dummy" ? crypto.randomBytes(32).toString("base64url") : undefined;
  const [row] = await tx
    .insert(botChallenges)
    .values({
      userId,
      sessionGeneration: generation,
      environment: process.env.APP_ENV ?? "simulation",
      surface,
      provider: kind,
      dummyHash: token ? digest(token) : null,
      expiresAt: sql`clock_timestamp()+interval '5 minutes'`,
    })
    .returning({ id: botChallenges.id, expiresAt: botChallenges.expiresAt });
  return {
    required: true,
    provider: kind,
    challenge_id: row.id,
    expires_at: row.expiresAt.toISOString(),
    action: surface,
    site_key: kind === "turnstile" ? sitekey : undefined,
    dummy_token: token,
  };
}
export function acceptTurnstileResponse(
  value: unknown,
  expected: { hostname: string; action: string; challengeId: string },
) {
  const result = z
    .object({
      success: z.boolean(),
      hostname: z.string().optional(),
      action: z.string().optional(),
      cdata: z.string().optional(),
    })
    .passthrough()
    .parse(value);
  return (
    result.success &&
    result.hostname === expected.hostname &&
    result.action === expected.action &&
    result.cdata === expected.challengeId
  );
}
async function turnstile(token: string, id: string, surface: BotSurface) {
  const secret = process.env.CAPTCHA_SECRET_KEY,
    origin = process.env.WEB_ORIGIN;
  if (!secret || !origin) throw new Error("CAPTCHA_UNAVAILABLE");
  const host = new URL(origin);
  if (host.protocol !== "https:" || host.origin !== origin)
    throw new Error("CAPTCHA_UNAVAILABLE");
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(5000),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: token,
          idempotency_key: id,
        }),
      },
    );
    if (!response.ok || !response.body) throw new Error("CAPTCHA_UNAVAILABLE");
    return acceptTurnstileResponse(
      JSON.parse(await boundedText(response,16384)),
      { hostname: host.hostname, action: surface, challengeId: id },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "CAPTCHA_UNAVAILABLE")
      throw error;
    throw new Error("CAPTCHA_UNAVAILABLE");
  }
}
export async function verifyBotCheck(
  tx: DbExecutor,
  userId: string,
  generation: string,
  surface: BotSurface,
  proof: z.infer<typeof botProof> | undefined,
  requestKey: string,
) {
  if (!(await required(tx, userId, surface))) return;
  if (!proof) throw new Error("CAPTCHA_REQUIRED");
  const [challenge] = await tx
    .select()
    .from(botChallenges)
    .where(
      and(
        eq(botChallenges.id, proof.challenge_id),
        eq(botChallenges.userId, userId),
        eq(botChallenges.sessionGeneration, generation),
        eq(botChallenges.environment, process.env.APP_ENV ?? "simulation"),
        eq(botChallenges.surface, surface),
      ),
    )
    .for("update");
  if (!challenge || challenge.provider !== provider())
    throw new Error("CAPTCHA_REJECTED");
  const hash = digest(proof.token),
    [used] = await tx
      .select()
      .from(botTokenUses)
      .where(eq(botTokenUses.tokenHash, hash))
      .limit(1);
  if (used) {
    if (used.challengeId === challenge.id && used.requestKey === requestKey)
      return;
    throw new Error("CAPTCHA_REPLAY");
  }
  const [clock] = await tx.execute<{ now: Date }>(
    sql`select clock_timestamp() as now`,
  );
  if (challenge.consumedAt || challenge.expiresAt <= new Date(clock.now))
    throw new Error("CAPTCHA_REJECTED");
  const valid =
    challenge.provider === "dummy"
      ? challenge.dummyHash === hash
      : await turnstile(proof.token, challenge.id, surface);
  if (!valid) throw new Error("CAPTCHA_REJECTED");
  const inserted = await tx
    .insert(botTokenUses)
    .values({
      tokenHash: hash,
      challengeId: challenge.id,
      requestKey,
      environment: process.env.APP_ENV ?? "simulation",
      expiresAt: sql`clock_timestamp()+interval '24 hours'`,
    })
    .onConflictDoNothing()
    .returning({ id: botTokenUses.challengeId });
  if (!inserted.length) throw new Error("CAPTCHA_REPLAY");
  await tx
    .update(botChallenges)
    .set({ consumedAt: sql`clock_timestamp()` })
    .where(eq(botChallenges.id, challenge.id));
}
export async function recordProofFailure(
  tx: DbExecutor,
  userId: string,
  source: string,
) {
  await tx
    .insert(abuseSignals)
    .values({
      userId,
      category: "payment_proof_failure",
      sourceKey: digest(source),
    })
    .onConflictDoNothing();
}
