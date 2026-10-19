import {runtimeProviders} from '@gifters/config';
import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { assets, priceQuotes, type DbExecutor } from "@gifters/db";
import { priceUnits } from "@gifters/domain";
import { registryAsset, financialEnvironmentIn } from "./financial-config";
import {signedPrice,signedPriceInput} from '../packages/config/src/signed-price';
export {signedPrice,signedPriceInput} from '../packages/config/src/signed-price';
/** Owner signs externally. Web stores only a public Ed25519 verification key. */
export async function ingestSignedPrice(
  tx: DbExecutor,
  input: z.infer<typeof signedPriceInput>,
) {
  const environment=await financialEnvironmentIn(tx);
  if (
    !["manual_signed","coinmarketcap"].includes(runtimeProviders().PRICE_PROVIDER) &&
    !(
      process.env.APP_ENV === "simulation" &&
      process.env.CHAIN_FIXTURE_MODE === "isolated"
    )
  )
    throw new Error("PROVIDER_UNAVAILABLE");
  const document = signedPrice.parse(input.document);
  if(document.environment!==environment)throw new Error("FINANCIAL_ENVIRONMENT_DENIED");
  const encoded = JSON.stringify(document),
    publicKey = process.env.PRICE_FEED_PUBLIC_KEY ?? "";
  let valid = false;
  try {
    const key = crypto.createPublicKey({
      key: Buffer.from(publicKey, "base64url"),
      format: "der",
      type: "spki",
    });
    valid =
      key.asymmetricKeyType === "ed25519" &&
      crypto.verify(
        null,
        Buffer.from(encoded),
        key,
        Buffer.from(input.signature, "base64url"),
      );
  } catch {
    /* No key or signature details in errors. */
  }
  if (!valid) throw new Error("INVALID_PROOF");
  priceUnits(document.asset_usd);
  priceUnits(document.native_usd);
  const observed = new Date(document.observed_at),
    expires = new Date(document.expires_at),
    now = Date.now();
  if (
    observed.getTime() > now ||
    now - observed.getTime() >= 300000 ||
    expires.getTime() <= now ||
    expires.getTime() - observed.getTime() > 300000
  )
    throw new Error("PRICE_STALE");
  const registry = registryAsset(document.asset_key);
  if (
    registry.kind === "native" &&
    priceUnits(document.asset_usd) !== priceUnits(document.native_usd)
  )
    throw new Error("PRICE_INVALID");
  if (registry.network !== document.network) throw new Error("WRONG_NETWORK");
  const [asset] = await tx
    .select()
    .from(assets)
    .where(
      and(
        eq(assets.environment, environment),
        eq(assets.symbol, registry.key.toUpperCase()),
        eq(assets.chainId, registry.network),
      ),
    )
    .limit(1);
  if (!asset) throw new Error("PLAN_UNAVAILABLE");
  const fingerprint = crypto.createHash("sha256").update(encoded).digest("hex"),
    [old] = await tx
      .select()
      .from(priceQuotes)
      .where(eq(priceQuotes.fingerprint, fingerprint))
      .limit(1);
  if (old) return { id: old.id, expires_at: old.expiresAt.toISOString() };
  const [row] = await tx
    .insert(priceQuotes)
    .values({
      assetId: asset.id,
      assetUsd: document.asset_usd,
      nativeUsd: document.native_usd,
      observedAt: observed,
      expiresAt: expires,
      source: document.source,
      fingerprint,
    })
    .onConflictDoNothing()
    .returning();
  return {
    id:
      row?.id ??
      (
        await tx
          .select()
          .from(priceQuotes)
          .where(eq(priceQuotes.fingerprint, fingerprint))
          .limit(1)
      )[0].id,
    expires_at: expires.toISOString(),
  };
}
