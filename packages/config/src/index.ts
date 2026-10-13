import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { assertValidSplit } from "@gifters/domain";
import { policyFields, privatePolicyKeys, staffPolicyKeys, planConfigSchema, assetConfigSchema, cryptoRiskSchema } from './policies';

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
  ...policyFields,
  feature_gifts: z.boolean(), feature_wallets: z.boolean(), feature_referrals: z.boolean(), feature_points: z.boolean(),
  feature_notifications: z.boolean(), feature_shares: z.boolean(), feature_help: z.boolean(), feature_pwa: z.boolean(),
  feature_activity: z.boolean(), feature_bootstrap: z.boolean(), feature_priority: z.boolean(), feature_admin: z.boolean(),
  feature_moderation: z.boolean(), feature_portability: z.boolean(), feature_simulation: z.boolean(),
  mainnet_enabled: z.literal(false),
  default_locale: z.enum(["en","fr"]),
  supported_locales: z.array(z.enum(["en","fr"])).length(2).refine((locales) => new Set(locales).size === 2),
  eligibility_min_age: z.number().int().positive().max(120),
  cycle_max_concurrent: z.number().int().nonnegative(),
  cycle_rejoin_cooldown_hours: z.number().int().nonnegative(),
  payment_split_bps: paymentSplitSchema,
  simulation_policy: z.object({giv_grant:z.number().int().positive(),giv_decimals:z.literal(2),max_seed_batch:z.number().int().positive().max(100),allow_reset:z.boolean()}).strict(),
  ui_show_queue_total: z.boolean(),
  ui_rotation_policy: z.object({activity_seconds:z.number().positive(),currency_seconds:z.number().positive(),launch_reshow_days:z.number().nonnegative(),launch_dismiss_hours:z.number().nonnegative()}).strict(),
  notification_page_size: z.number().int().positive().max(100),
  pagination_policy: z.object({default_size:z.number().int().positive(),max_size:z.number().int().positive().max(100)}).strict(),
  deployment_profile: z.literal("test_iteration"),
  product_content: z.object({
    domain: z.string().url().refine((value) => { try { return new URL(value).protocol === 'https:'; } catch { return false; } }),
    tagline: z.object({en:z.string(),fr:z.string()}).strict(),
    short_description: z.object({en:z.string(),fr:z.string()}).strict()
  }).strict(),
  activity_statements: z.array(z.string()).max(50)
}).strict();

export type Manifest = z.infer<typeof manifestSchema>;

export type ManifestScope = 'public' | 'private' | 'staff';
export function manifestDefinition(key: string): { schema: z.ZodTypeAny; scope: ManifestScope } | undefined {
  if (Object.hasOwn(manifestSchema.shape, key)) {
    return { schema:manifestSchema.shape[key as keyof Manifest], scope:staffPolicyKeys.has(key) ? 'staff' : privatePolicyKeys.has(key) ? 'private' : 'public' };
  }
  if (/^plan_config_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return { schema:planConfigSchema, scope:'public' };
  if (/^asset_config_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return { schema:assetConfigSchema, scope:'public' };
  if (/^crypto_risk_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return { schema:cryptoRiskSchema, scope:'staff' };
  return undefined;
}

function rejectSecretContent(value: unknown, location: string[] = []): void {
  if (typeof value === 'string') {
    if (/-----BEGIN .*PRIVATE KEY-----|\bAKIA[0-9A-Z]{16}\b|\b(?:sk_live_|sk-proj-)[A-Za-z0-9_-]{20,}|\b[0-9a-f]{64}\b|https?:\/\/[^\s/]*@|[?&](?:token|api[_-]?key|password|secret|authorization)=/i.test(value)) throw new Error('CONFIGURATION_INVALID');
    const registryAddress = location.length === 2 && /^asset_config_/.test(location[0]) && ['contract','mint'].includes(location[1]);
    if (!registryAddress && (/\b0x[0-9a-f]{40}\b|\bT[1-9A-HJ-NP-Za-km-z]{33}\b/i.test(value) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value))) throw new Error('CONFIGURATION_INVALID');
  } else if (Array.isArray(value)) value.forEach((child,index) => rejectSecretContent(child,[...location,String(index)]));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key,child]) => rejectSecretContent(child,[...location,key]));
}

export function validatePublicText(value:string){rejectSecretContent(value);if(value.length<1||value.length>20000)throw new Error('INVALID_INPUT');return value;}

export function validateManifestValue(key: string, value: unknown, scope?: string): unknown {
  const definition = manifestDefinition(key);
  if (!definition || (scope !== undefined && definition.scope !== scope)) throw new Error('CONFIGURATION_INVALID');
  rejectSecretContent(value,[key]);
  const result = definition.schema.safeParse(value);
  if (!result.success) throw new Error('CONFIGURATION_INVALID');
  return result.data;
}

export function parseManifest(input: unknown): Manifest & Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('CONFIGURATION_INVALID');
  const staticValues: Record<string, unknown> = {};
  const dynamicValues: Record<string, unknown> = {};
  for (const [key,value] of Object.entries(input)) {
    const parsed = validateManifestValue(key,value);
    (Object.hasOwn(manifestSchema.shape,key) ? staticValues : dynamicValues)[key] = parsed;
  }
  const result = manifestSchema.safeParse(staticValues);
  if (!result.success) throw new Error('CONFIGURATION_INVALID');
  return { ...result.data, ...dynamicValues };
}

// Never serialize a complete manifest or trust a row's stored public marker.
export function publicManifest(input: Record<string, unknown>) {
  const publicValues: Record<string, unknown> = {};
  for (const [key,value] of Object.entries(input)) {
    if (manifestDefinition(key)?.scope === 'public') publicValues[key] = validateManifestValue(key,value,'public');
  }
  return publicValues;
}

export function validateSecurityCeilings(manifest: Manifest, env = process.env) {
  const hard = (name: string, fallback: number) => {
    const raw = env[name] ?? String(fallback);
    if (!/^[1-9][0-9]*$/.test(raw) || !Number.isSafeInteger(Number(raw))) throw new Error('CONFIGURATION_INVALID');
    return Number(raw);
  };
  const limits: Array<[number,string,number]> = [
    [manifest.payout_limits.auto_approve_usd,'SIGNER_HARD_AUTO_APPROVE_USD',100],
    [manifest.payout_limits.signer_per_tx_usd,'SIGNER_HARD_PER_TX_USD',5000],
    [manifest.payout_limits.daily_per_asset_usd,'SIGNER_HARD_DAILY_PER_ASSET_USD',10000],
    [manifest.auth_session_policy.access_minutes,'AUTH_HARD_ACCESS_MINUTES',60],
    [manifest.auth_session_policy.absolute_days,'AUTH_HARD_ABSOLUTE_DAYS',30],
    [manifest.auth_session_policy.idle_days,'AUTH_HARD_IDLE_DAYS',7],
    [manifest.staff_reauth_minutes,'STAFF_HARD_REAUTH_MINUTES',15],
  ];
  for (const [requested,name,fallback] of limits) if (requested > hard(name,fallback)) throw new Error('CONFIGURATION_INVALID');
}

export function loadManifest(root = process.cwd()): Manifest {
  const file = path.join(root, "xmanifest.json");
  try { return parseManifest(JSON.parse(fs.readFileSync(file, "utf8"))); }
  catch { throw new Error('CONFIGURATION_INVALID'); }
}

export function validateRuntimeEnv(env = process.env) {
  const appEnv = env.APP_ENV ?? "simulation";
  if(!['simulation','testnet'].includes(appEnv))throw new Error('Mainnet is disabled');
  const simulationSelectors = {
    PAYMENT_PROVIDER: 'giv_simulation',
    WALLET_PROVIDER: 'dummy', SIGNER_PROVIDER: 'disabled', CAPTCHA_PROVIDER: 'dummy',
    REALTIME_PROVIDER: 'none', PRICE_PROVIDER: 'manual_simulation', ALERT_PROVIDER: 'none',
    DEPLOYMENT_PROFILE: 'test_iteration',
  };
  const testnetSelectors:Record<string,string[]>={PAYMENT_PROVIDER:['chain_rpc'],WALLET_PROVIDER:['wallet_standard'],SIGNER_PROVIDER:['disabled'],CAPTCHA_PROVIDER:['turnstile'],REALTIME_PROVIDER:['none'],PRICE_PROVIDER:['manual_signed','coinmarketcap'],ALERT_PROVIDER:['https_webhook'],DEPLOYMENT_PROFILE:['test_iteration']};
  if(appEnv==='testnet'){for(const [name,choices]of Object.entries(testnetSelectors))if(env[name]&&!choices.includes(env[name]!))throw new Error('Unsupported testnet provider');if(env.AUTH_PROVIDER!=='google'||env.SIMULATION_TOOL_AUTH_KEY)throw new Error('Testnet requires verified Google identity and prohibits fixture authority');if(env.CHAIN_FIXTURE_MODE)throw new Error('Fixture mode is simulation only');}
  for (const [name, supported] of Object.entries(appEnv==='simulation'?simulationSelectors:{})) {
    if (env[name] !== undefined && env[name] !== supported) throw new Error(`Unsupported ${name} for the current simulation build`);
  }
  if(!['simulation','google'].includes(env.AUTH_PROVIDER??'simulation'))throw new Error('CONFIGURATION_INVALID');
  for(const name of ['AUTH_ACCESS_KEY','AUTH_ACCESS_PREVIOUS_KEY','MFA_ENCRYPTION_KEY','SIMULATION_TOOL_AUTH_KEY'])if(env[name]&&(!/^[A-Za-z0-9_-]{43}$/.test(env[name]!)||Buffer.from(env[name]!,'base64url').toString('base64url')!==env[name]))throw new Error('CONFIGURATION_INVALID');
  if(env.AUTH_ACCESS_PREVIOUS_KEY&&!env.AUTH_ACCESS_KEY)throw new Error('CONFIGURATION_INVALID');
  if(env.VERCEL==='1'&&env.SIMULATION_TOOL_AUTH_KEY)throw new Error('Simulation tool credentials must stay outside Vercel');
  const dbProvider = env.DB_PROVIDER ?? "supabase";
  if (!['supabase','neon','local','postgres'].includes(dbProvider)) {
    throw new Error(`Unsupported DB_PROVIDER: ${dbProvider}`);
  }
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  if (env.VERCEL === '1' && env.DATABASE_MIGRATION_URL) throw new Error('Migration credentials must stay outside the Vercel runtime');
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
