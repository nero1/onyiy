import tls from 'node:tls';
import { X509Certificate } from 'node:crypto';

function boundedInteger(env: NodeJS.ProcessEnv, name: string, fallback: number, maximum: number) {
  const value = env[name] ?? String(fallback);
  if (!/^[1-9][0-9]*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > maximum) {
    throw new Error('CONFIGURATION_INVALID');
  }
  return Number(value);
}

// Explicit options override postgres-js URL/PGSSL defaults. In this driver,
// sslmode=require encrypts traffic but deliberately skips certificate checks.
export function databaseConnectionOptions(value: string, env: NodeJS.ProcessEnv = process.env) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('CONFIGURATION_INVALID'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.hostname.includes(',')) throw new Error('CONFIGURATION_INVALID');
  for (const key of url.searchParams.keys()) {
    if (!['sslmode', 'sslrootcert'].includes(key) || url.searchParams.getAll(key).length !== 1) throw new Error('CONFIGURATION_INVALID');
  }
  if (url.searchParams.has('sslrootcert') && url.searchParams.get('sslrootcert') !== 'system') throw new Error('CONFIGURATION_INVALID');
  const mode = url.searchParams.get('sslmode');
  if (mode && !['require', 'verify-ca', 'verify-full', 'disable'].includes(mode)) throw new Error('CONFIGURATION_INVALID');
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new Error('CONFIGURATION_INVALID');

  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const tooling = ['localhost','127.0.0.1','::1'].includes(hostname)
    && (env.APP_ENV ?? 'simulation') === 'simulation' && env.VERCEL !== '1'
    && ['postgres','local'].includes(env.DB_PROVIDER ?? 'supabase');
  if (mode === 'disable' && !tooling) throw new Error('CONFIGURATION_INVALID');
  let ca: string | undefined;
  if (env.DATABASE_TLS_CA_PEM) {
    ca = env.DATABASE_TLS_CA_PEM;
    const certificates = ca.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) ?? [];
    if (ca.length > 131072 || !certificates.length || ca.replace(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g,'').trim()) throw new Error('CONFIGURATION_INVALID');
    try { certificates.forEach((certificate) => new X509Certificate(certificate)); }
    catch { throw new Error('CONFIGURATION_INVALID'); }
  }
  const serverless = env.VERCEL === '1' || (env.DB_PROVIDER ?? 'supabase') === 'supabase';
  if (mode === 'disable' && (ca || url.searchParams.has('sslrootcert'))) throw new Error('CONFIGURATION_INVALID');
  const plaintextTooling = tooling && !ca && !url.searchParams.has('sslrootcert') && (!mode || mode === 'disable');
  return {
    ssl: plaintextTooling ? false as const : {
      rejectUnauthorized: true,
      ...(ca ? { ca } : {}),
      checkServerIdentity: (_name: string, certificate: tls.PeerCertificate) => tls.checkServerIdentity(hostname,certificate),
    },
    max: boundedInteger(env,'DATABASE_POOL_MAX',serverless ? 1 : 10,20),
    idle_timeout: boundedInteger(env,'DATABASE_IDLE_TIMEOUT_SECONDS',20,300),
    connect_timeout: Math.min(5,boundedInteger(env,'DATABASE_CONNECT_TIMEOUT_SECONDS',5,30)),
    prepare: (env.DB_PROVIDER ?? 'supabase') !== 'supabase',
  };
}
