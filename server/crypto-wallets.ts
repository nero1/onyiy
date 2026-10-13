import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  walletChallenges,
  walletLinks,
  users,
  readManifest,
  type DbExecutor,
} from "@gifters/db";
import {
  registryAsset,
  adapter,
  assertFinancialEnvironment,
} from "./financial-config";
import { lockUser } from "./core";
export const walletChallengeInput = z
  .object({
    asset_key: z.string().max(30),
    address: z.string().max(100),
    session_generation: z.string().uuid(),
  })
  .strict();
export const walletProofInput = z
  .object({
    challenge_id: z.string().uuid(),
    signature: z.string().min(20).max(1000),
  })
  .strict();
export async function challengeWallet(
  tx: DbExecutor,
  userId: string,
  input: z.infer<typeof walletChallengeInput>,
) {
  assertFinancialEnvironment();
  const manifest = await readManifest(tx);
  if (!manifest.feature_wallets || !manifest.entitlements_member.wallet_link)
    throw new Error("FEATURE_DISABLED");
  const user = await lockUser(tx, userId);
  if (!["active", "deactivated"].includes(user.status) || !user.consentedAt)
    throw new Error("ACCOUNT_RESTRICTED");
  const asset = registryAsset(input.asset_key),
    chain = await adapter(asset),
    address = await chain.normalizeAddress(input.address);
  const id = crypto.randomUUID();
  const [clock] = await tx.execute<{
      now: Date;
    }>(sql`select clock_timestamp() as now`),
    now = new Date(clock.now),
    expires = new Date(now.getTime() + 300000);
  const message = [
    "Gifters World wallet ownership",
    "Environment: testnet",
    "Network: " + asset.network,
    "Chain: " + asset.chain,
    "Account: " + userId,
    "Session: " + input.session_generation,
    "Address: " + address,
    "Challenge: " + id,
    "Expires: " + expires.toISOString(),
    "This message links a wallet and authorizes no transfer.",
  ].join("\n");
  await tx
    .insert(walletChallenges)
    .values({
      id,
      userId,
      environment: "testnet",
      chain: asset.chain,
      assetKey: asset.key,
      address,
      message,
      sessionGeneration: input.session_generation,
      expiresAt: expires,
    });
  return {
    id,
    message,
    address,
    chain: asset.chain,
    network: asset.network,
    expires_at: expires.toISOString(),
  };
}
export async function proveWallet(
  tx: DbExecutor,
  userId: string,
  generation: string,
  input: z.infer<typeof walletProofInput>,
) {
  assertFinancialEnvironment();
  const manifest = await readManifest(tx);
  if (!manifest.feature_wallets || !manifest.entitlements_member.wallet_link)
    throw new Error("FEATURE_DISABLED");
  const user = await lockUser(tx, userId);
  if (!["active", "deactivated"].includes(user.status))
    throw new Error("ACCOUNT_RESTRICTED");
  const [challenge] = await tx
    .select()
    .from(walletChallenges)
    .where(
      and(
        eq(walletChallenges.id, input.challenge_id),
        eq(walletChallenges.userId, userId),
      ),
    )
    .for("update");
  const [clock] = await tx.execute<{
      now: Date;
    }>(sql`select clock_timestamp() as now`),
    now = new Date(clock.now);
  if (
    !challenge ||
    challenge.usedAt ||
    challenge.sessionGeneration !== generation ||
    challenge.expiresAt <= now
  )
    throw new Error("INVALID_PROOF");
  const asset = registryAsset(challenge.assetKey);
  const chain = await adapter(asset);
  if (
    !(await chain.verifyOwnershipProof(
      challenge.address,
      challenge.message,
      input.signature,
    ))
  )
    throw new Error("INVALID_PROOF");
  const [old] = await tx
    .select()
    .from(walletLinks)
    .where(
      and(
        eq(walletLinks.userId, userId),
        eq(walletLinks.environment, "testnet"),
        eq(walletLinks.chainId, asset.network),
      ),
    )
    .for("update");
  if (old?.address === challenge.address) {
    await tx
      .update(walletChallenges)
      .set({ usedAt: now })
      .where(eq(walletChallenges.id, challenge.id));
    return { id: old.id, address: old.address, revision: old.revision };
  }
  const cooling = new Date(
    now.getTime() + manifest.wallet_change_cooloff_hours * 3600000,
  );
  const [row] = old
    ? await tx
        .update(walletLinks)
        .set({
          address: challenge.address,
          revision: old.revision + 1,
          verifiedAt: now,
          coolingUntil: cooling,
        })
        .where(eq(walletLinks.id, old.id))
        .returning()
    : await tx
        .insert(walletLinks)
        .values({
          userId,
          environment: "testnet",
          chainId: asset.network,
          address: challenge.address,
          verifiedAt: now,
          coolingUntil: now,
        })
        .returning();
  await tx
    .update(walletChallenges)
    .set({ usedAt: now })
    .where(eq(walletChallenges.id, challenge.id));
  return {
    id: row.id,
    address: row.address,
    revision: row.revision,
    cooling_until: row.coolingUntil,
  };
}
