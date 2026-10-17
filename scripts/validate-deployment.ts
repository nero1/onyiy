import fs from 'node:fs';
import path from 'node:path';
import {isReadOnlyPreview, validateRuntimeEnv } from '@gifters/config';
import { databaseConnectionOptions } from '@gifters/db';
import {readRegistry} from '@gifters/chains';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Node.js 22 is required');
if (lock.lockfileVersion !== 3) throw new Error('npm lockfile v3 is required');
for (const group of ['dependencies', 'devDependencies']) {
  if (JSON.stringify(pkg[group]) !== JSON.stringify(lock.packages[''][group])) throw new Error(`Lockfile mismatch: ${group}`);
}
if (vercel.framework !== 'nextjs' || vercel.git?.deploymentEnabled !== false || vercel.installCommand !== 'npm ci --no-audit --no-fund') {
  throw new Error('Vercel must use Next.js, npm ci, and GitHub Actions deployment authority');
}
function paths(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (/[\[\]]/.test(entry.name)) throw new Error('Bracketed app path is not GitHub-browser-upload-safe');
    if (entry.isDirectory()) paths(path.join(dir, entry.name));
  }
}
paths('app');
if (process.argv.includes('--hosted')) {
  // Validate presence/selectors only; never print URLs, tokens or secret values.
  const env = { ...process.env, NODE_ENV: 'production' };
  const config = validateRuntimeEnv(env),preview=isReadOnlyPreview(env);
  if(env.EXPECTED_PUBLIC_PREVIEW_MODE&&(env.PUBLIC_PREVIEW_MODE??'off')!==env.EXPECTED_PUBLIC_PREVIEW_MODE)throw new Error('Vercel and GitHub preview modes differ');
  if (env.EXPECTED_DATABASE_URL && config.databaseUrl !== env.EXPECTED_DATABASE_URL) throw new Error('Vercel and GitHub runtime database bindings differ');
  if (env.DATABASE_MIGRATION_URL) throw new Error('Migration credentials must not be present in the Vercel runtime settings');
  if(!preview)for(const name of ['AUTH_ACCESS_KEY','MFA_ENCRYPTION_KEY'])if(!env[name]||Buffer.from(env[name]!,'base64url').length!==32||Buffer.from(env[name]!,'base64url').toString('base64url')!==env[name])throw new Error('Hosted identity keys must be separately provisioned');
  if(env.AUTH_ACCESS_PREVIOUS_KEY&&!env.AUTH_ACCESS_KEY)throw new Error('Authentication rotation requires a current key');
  let web:URL;try{web=new URL(env.WEB_ORIGIN??'')}catch{throw new Error('Hosted WEB_ORIGIN must be configured')}
  if(web.protocol!=='https:'||web.origin!==env.WEB_ORIGIN||web.username||web.password)throw new Error('Hosted WEB_ORIGIN must be an exact HTTPS origin');
  if(config.providers.AUTH_PROVIDER==='google'&&(!env.GOOGLE_CLIENT_ID||!env.GOOGLE_CLIENT_SECRET))throw new Error('Google identity requires owner-provisioned credentials');
  if(config.providers.CAPTCHA_PROVIDER==='turnstile'&&(!env.CAPTCHA_SITE_KEY||!env.CAPTCHA_SECRET_KEY))throw new Error('Turnstile requires owner-provisioned site and secret keys');
  if(!preview)readRegistry(env);
  if(env.SIMULATION_TOOL_AUTH_KEY)throw new Error('Operator fixture keys must stay outside hosted runtime');
  databaseConnectionOptions(config.databaseUrl,env);
  let database: URL;
  try { database = new URL(config.databaseUrl); } catch { throw new Error('Invalid DATABASE_URL'); }
  if (!['postgres:', 'postgresql:'].includes(database.protocol)) throw new Error('A PostgreSQL DATABASE_URL is required');
  if (config.cacheProvider === 'upstash') {
    let cache: URL;
    try { cache = new URL(env.UPSTASH_REDIS_REST_URL!); } catch { throw new Error('Invalid Upstash REST URL'); }
    if (cache.protocol !== 'https:' || cache.username || cache.password) throw new Error('Upstash requires an HTTPS REST URL without embedded credentials');
  }
  for (const name of ['SCHEDULER_HMAC_KEY','SCHEDULER_HMAC_PREVIOUS_KEY']) {
    const key=env[name];
    if (!key) continue; // Scheduler remains disabled until securely provisioned.
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(key) || Buffer.from(key,'base64url').length<32 || Buffer.from(key,'base64url').toString('base64url')!==key) throw new Error('Invalid scheduler key binding');
  }
  if (env.SCHEDULER_HMAC_PREVIOUS_KEY && !env.SCHEDULER_HMAC_KEY) throw new Error('Scheduler rotation requires a current key');
  console.log('Hosted configuration preflight passed; provider connectivity still requires live verification.');
} else {
  console.log('Runtime, lockfile, Vercel configuration and upload-safe app paths passed; no hosted credentials required.');
}
