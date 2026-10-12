import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { assertValidSplit } from "@gifters/domain";

const paymentSplitSchema = z.object({
  receiver: z.number().int().nonnegative(),
  marketing: z.number().int().nonnegative(),
  referral: z.number().int().nonnegative(),
  developer: z.number().int().nonnegative(),
  reserve: z.number().int().nonnegative()
}).strict().superRefine((value, ctx) => {
  try { assertValidSplit(value); } catch (error) { ctx.addIssue({code:z.ZodIssueCode.custom,message:(error as Error).message}); }
});

export const manifestSchema = z.object({
  feature_gifts: z.boolean(), feature_wallets: z.boolean(), feature_referrals: z.boolean(), feature_points: z.boolean(),
  feature_notifications: z.boolean(), feature_shares: z.boolean(), feature_help: z.boolean(), feature_pwa: z.boolean(),
  feature_activity: z.boolean(), feature_bootstrap: z.boolean(), feature_priority: z.boolean(), feature_admin: z.boolean(),
  feature_moderation: z.boolean(), feature_portability: z.boolean(), feature_simulation: z.boolean(),
  mainnet_enabled: z.literal(false),
  default_locale: z.enum(["en","fr"]),
  supported_locales: z.array(z.enum(["en","fr"]).or(z.string())).min(2),
  eligibility_min_age: z.number().int().positive(),
  cycle_max_concurrent: z.number().int().nonnegative(),
  cycle_rejoin_cooldown_hours: z.number().int().nonnegative(),
  payment_split_bps: paymentSplitSchema,
  simulation_policy: z.object({giv_grant:z.number().positive(),giv_decimals:z.number().int().nonnegative(),max_seed_batch:z.number().int().positive(),allow_reset:z.boolean()}).strict(),
  ui_show_queue_total: z.boolean(),
  ui_rotation_policy: z.object({activity_seconds:z.number().positive(),currency_seconds:z.number().positive(),launch_reshow_days:z.number().nonnegative(),launch_dismiss_hours:z.number().nonnegative()}).strict(),
  notification_page_size: z.number().int().positive().max(100),
  pagination_policy: z.object({default_size:z.number().int().positive(),max_size:z.number().int().positive().max(100)}).strict(),
  deployment_profile: z.literal("test_iteration"),
  product_content: z.object({
    domain: z.string().url(),
    tagline: z.object({en:z.string(),fr:z.string()}).strict(),
    short_description: z.object({en:z.string(),fr:z.string()}).strict()
  }).strict(),
  activity_statements: z.array(z.string()).max(50)
}).strict();

export type Manifest = z.infer<typeof manifestSchema>;

export function loadManifest(root = process.cwd()): Manifest {
  const file = path.join(root, "xmanifest.json");
  return manifestSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
}

export function validateRuntimeEnv(env = process.env) {
  const appEnv = env.APP_ENV ?? "simulation";
  const dbProvider = env.DB_PROVIDER ?? "supabase";
  if (!['supabase','neon','local','postgres'].includes(dbProvider)) {
    throw new Error(`Unsupported DB_PROVIDER: ${dbProvider}`);
  }
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  if (appEnv !== "simulation" && env.MAINNET_ENABLED === "false" && env.PAYMENT_PROVIDER === "giv_simulation") {
    throw new Error("GIV simulation provider is only valid in simulation environment");
  }
  if (env.MAINNET_ENABLED === "true") throw new Error("Phase One deliberately disables mainnet");
  if ((env.SIGNER_PROVIDER ?? "disabled") !== "disabled" && appEnv === "simulation") {
    throw new Error("simulation must not load a real signer");
  }
  const cacheProvider = env.CACHE_PROVIDER ?? "upstash";
  if (!['postgres_memory','upstash','ioredis','redis'].includes(cacheProvider)) throw new Error(`Unsupported CACHE_PROVIDER: ${cacheProvider}`);
  if (cacheProvider === 'upstash' && env.NODE_ENV === 'production' && (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN)) {
    throw new Error('CACHE_PROVIDER=upstash requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in production');
  }
  if ((cacheProvider === 'ioredis' || cacheProvider === 'redis') && env.NODE_ENV === 'production' && !env.REDIS_URL) {
    throw new Error(`${cacheProvider} requires REDIS_URL in production`);
  }
  return { appEnv, dbProvider, databaseUrl, cacheProvider };
}
